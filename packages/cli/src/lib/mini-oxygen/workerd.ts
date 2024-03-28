import {
  Miniflare,
  Request,
  Response,
  fetch,
  NoOpLog,
  type MiniflareOptions,
  RequestInit,
} from 'miniflare';
import {dirname, resolvePath} from '@shopify/cli-kit/node/path';
import {readFile} from '@shopify/cli-kit/node/fs';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import colors from '@shopify/cli-kit/node/colors';
import {createInspectorConnector} from './workerd-inspector.js';
import {findPort} from '../find-port.js';
import type {MiniOxygenInstance, MiniOxygenOptions} from './types.js';
import {
  OXYGEN_HEADERS_MAP,
  SUBREQUEST_PROFILER_ENDPOINT,
  logRequestLine,
} from './common.js';
import {
  H2O_BINDING_NAME,
  handleDebugNetworkRequest,
  createLogRequestEvent,
  setConstructors,
} from '../request-events.js';
import {
  buildAssetsUrl,
  createAssetsServer,
  STATIC_ASSET_EXTENSIONS,
} from './assets.js';
import {getDebugBannerLine} from '../dev-shared.js';

// This should probably be `0` and let workerd find a free port,
// but at the moment we can't get the port from workerd (afaik?).
export const PRIVATE_WORKERD_INSPECTOR_PORT = 9222;

export const OXYGEN_WORKERD_COMPAT_PARAMS = {
  compatibilityFlags: ['streams_enable_constructors'],
  compatibilityDate: '2022-10-31',
};

export async function startWorkerdServer({
  root,
  port: appPort,
  inspectorPort: publicInspectorPort,
  assetsPort,
  debug = false,
  watch = false,
  buildPathWorkerFile,
  buildPathClient,
  env,
}: MiniOxygenOptions): Promise<MiniOxygenInstance> {
  const privateInspectorPort = await findPort(PRIVATE_WORKERD_INSPECTOR_PORT);

  const oxygenHeadersMap = Object.values(OXYGEN_HEADERS_MAP).reduce(
    (acc, item) => {
      acc[item.name] = item.defaultValue;
      return acc;
    },
    {} as Record<string, string>,
  );

  setConstructors({Response});

  const absoluteBundlePath = resolvePath(root, buildPathWorkerFile);
  const handleAssets = createAssetHandler(assetsPort);
  const staticAssetExtensions = STATIC_ASSET_EXTENSIONS.slice();

  let stringifiedOxygenHandler = miniOxygenHandler
    .toString()
    .replace(
      'SUBREQUEST_PROFILER_ENDPOINT',
      JSON.stringify(SUBREQUEST_PROFILER_ENDPOINT),
    );

  if (process.env.NODE_ENV === 'test') {
    // Vitest adds namespaces to imports
    stringifiedOxygenHandler = stringifiedOxygenHandler.replace(
      /\w*vite_ssr_import[\w\d]*\./g,
      '',
    );
  }

  const buildMiniOxygenOptions = async () =>
    ({
      cf: false,
      verbose: false,
      port: appPort,
      inspectorPort: privateInspectorPort,
      log: new NoOpLog(),
      liveReload: watch,
      host: 'localhost',
      handleRuntimeStdio(stdout, stderr) {
        // TODO: handle runtime stdio and remove inspector logs
        // stdout.pipe(process.stdout);
        // stderr.pipe(process.stderr);

        // Destroy these streams to prevent memory leaks
        // until we start piping them to the terminal.
        // https://github.com/Shopify/hydrogen/issues/1720
        stdout.destroy();
        stderr.destroy();
      },
      workers: [
        {
          name: 'mini-oxygen',
          modules: true,
          script: `export default { fetch: ${stringifiedOxygenHandler} }`,
          bindings: {
            staticAssetExtensions,
            oxygenHeadersMap,
          },
          serviceBindings: {
            hydrogen: 'hydrogen',
            assets: handleAssets,
            debugNetwork: handleDebugNetworkRequest,
            logRequest,
          },
        },
        {
          name: 'hydrogen',
          modulesRoot: dirname(absoluteBundlePath),
          modules: [
            {
              type: 'ESModule',
              path: absoluteBundlePath,
              contents: await readFile(absoluteBundlePath),
            },
          ],
          ...OXYGEN_WORKERD_COMPAT_PARAMS,
          bindings: {...env},
          serviceBindings: {
            [H2O_BINDING_NAME]: createLogRequestEvent({
              transformLocation: () => absoluteBundlePath,
            }),
          },
          ...conditionalUnsafeOutboundService(),
        },
      ],
    } satisfies MiniflareOptions);

  let miniOxygenOptions = await buildMiniOxygenOptions();
  // @ts-expect-error H2O logger in serviceBindings
  // breaks the type for some unknown reason.
  const miniOxygen = new Miniflare(miniOxygenOptions);
  const listeningAt = (await miniOxygen.ready).origin;

  const sourceMapPath = buildPathWorkerFile + '.map';

  const reconnect = createInspectorConnector({
    debug,
    sourceMapPath,
    absoluteBundlePath,
    privateInspectorPort,
    publicInspectorPort,
  });

  await reconnect();

  const assetsServer = createAssetsServer(buildPathClient);
  assetsServer.listen(assetsPort);

  return {
    port: appPort,
    listeningAt,
    async reload(nextOptions) {
      miniOxygenOptions = await buildMiniOxygenOptions();

      if (nextOptions) {
        const hydrogen = miniOxygenOptions.workers.find(
          (worker) => worker.name === 'hydrogen',
        );

        if (hydrogen) {
          hydrogen.bindings = {...(nextOptions?.env ?? env)};
        }
      }

      await reconnect(() => miniOxygen.setOptions(miniOxygenOptions as any));
    },
    showBanner(options) {
      console.log(''); // New line

      const customSections = [];

      if (options?.extraLines?.length) {
        customSections.push({
          body: options.extraLines.map((value, index) => ({
            subdued: `${index != 0 ? '\n\n' : ''}${value}`,
          })),
        });
      }

      if (debug) {
        customSections.push({
          body: {warn: getDebugBannerLine(publicInspectorPort)},
        });
      }

      renderSuccess({
        headline: `${
          options?.headlinePrefix ?? ''
        }MiniOxygen (Worker Runtime) ${
          options?.mode ?? 'development'
        } server running.`,
        body: [
          `View ${
            options?.appName ? colors.cyan(options?.appName) : 'Hydrogen'
          } app:`,
          {link: {url: options?.host || listeningAt}},
        ],
        customSections,
      });

      console.log('');
    },
    async close() {
      assetsServer.closeAllConnections();
      assetsServer.close();
      await miniOxygen.dispose();
    },
  };
}

type Service = {fetch: typeof fetch};
async function miniOxygenHandler(
  request: Request,
  env: {
    hydrogen: Service;
    assets: Service;
    logRequest: Service;
    debugNetwork: Service;
    staticAssetExtensions: string[];
    oxygenHeadersMap: Record<string, string>;
  },
  context: ExecutionContext,
) {
  const {pathname} = new URL(request.url);

  if (pathname === SUBREQUEST_PROFILER_ENDPOINT) {
    return env.debugNetwork.fetch(request);
  }

  if (request.method === 'GET') {
    const staticAssetExtensions = new Set(env.staticAssetExtensions);
    const wellKnown = pathname.startsWith('/.well-known');
    const extension = pathname.split('.').at(-1) ?? '';
    const isAsset =
      wellKnown || !!staticAssetExtensions.has(extension.toUpperCase());

    if (isAsset) {
      const response = await env.assets.fetch(
        new Request(request.url, {
          signal: request.signal,
          headers: request.headers,
        }),
      );

      if (response.status !== 404) return response;
    }
  }

  const requestInit = {
    headers: {
      'request-id': crypto.randomUUID(),
      ...env.oxygenHeadersMap,
      ...Object.fromEntries(request.headers.entries()),
    },
  };

  const startTimeMs = Date.now();
  const response = await env.hydrogen.fetch(request, requestInit);
  const durationMs = Date.now() - startTimeMs;

  // Log the request summary to the terminal
  context.waitUntil(
    env.logRequest.fetch(
      new Request(request.url, {
        method: request.method,
        signal: request.signal,
        headers: {
          ...requestInit.headers,
          'h2-duration-ms': String(durationMs),
          'h2-response-status': String(response.status),
        },
      }),
    ),
  );

  return response;
}

function createAssetHandler(assetsPort: number) {
  const assetsServerOrigin = buildAssetsUrl(assetsPort);

  return async (request: Request): Promise<Response> => {
    return fetch(
      new Request(
        request.url.replace(
          new URL(request.url).origin + '/',
          assetsServerOrigin,
        ),
        request as RequestInit,
      ),
    );
  };
}

async function logRequest(request: Request): Promise<Response> {
  logRequestLine(request, {
    responseStatus: Number(request.headers.get('h2-response-status') || 200),
    durationMs: Number(request.headers.get('h2-duration-ms') || 0),
  });

  return new Response('ok');
}

export function conditionalUnsafeOutboundService() {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    // Opt-out of TLS validation in the worker environment,
    // and run network requests in Node environment.
    // https://nodejs.org/api/cli.html#node_tls_reject_unauthorizedvalue
    return {
      async outboundService(request: Request) {
        const response = await fetch(request.url, request);
        // Remove brotli encoding:
        // https://github.com/cloudflare/workers-sdk/issues/5345
        response.headers.delete('Content-Encoding');
        return response;
      },
    };
  }
}
