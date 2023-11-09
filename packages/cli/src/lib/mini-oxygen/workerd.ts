import crypto from 'node:crypto';
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
import {connectToInspector, findInspectorUrl} from './workerd-inspector.js';
import {createInspectorProxy} from './workerd-inspector-proxy.js';
import {findPort} from '../find-port.js';
import type {MiniOxygenInstance, MiniOxygenOptions} from './types.js';
import {OXYGEN_HEADERS_MAP, logRequestLine} from './common.js';
import {
  H2O_BINDING_NAME,
  handleDebugNetworkRequest,
  logRequestEvent,
  setConstructors,
} from '../request-events.js';
import {
  buildAssetsUrl,
  createAssetsServer,
  STATIC_ASSET_EXTENSIONS,
} from './assets.js';

const PRIVATE_WORKERD_INSPECTOR_PORT = 9229;

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
  const workerdInspectorPort = await findPort(PRIVATE_WORKERD_INSPECTOR_PORT);

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

  const buildMiniOxygenOptions = async () =>
    ({
      cf: false,
      verbose: false,
      port: appPort,
      inspectorPort: workerdInspectorPort,
      log: new NoOpLog(),
      liveReload: watch,
      host: 'localhost',
      workers: [
        {
          name: 'mini-oxygen',
          modules: true,
          script: `export default { fetch: ${miniOxygenHandler.toString()} }`,
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
          compatibilityFlags: ['streams_enable_constructors'],
          compatibilityDate: '2022-10-31',
          bindings: {...env},
          serviceBindings: {
            [H2O_BINDING_NAME]: logRequestEvent,
          },
        },
      ],
    } satisfies MiniflareOptions);

  let miniOxygenOptions = await buildMiniOxygenOptions();
  // @ts-expect-error H2O logger in serviceBindings
  // breaks the type for some unknown reason.
  const miniOxygen = new Miniflare(miniOxygenOptions);
  const listeningAt = (await miniOxygen.ready).origin;

  const sourceMapPath = buildPathWorkerFile + '.map';

  let inspectorUrl = await findInspectorUrl(workerdInspectorPort);
  let inspectorConnection = inspectorUrl
    ? connectToInspector({inspectorUrl, sourceMapPath})
    : undefined;

  const inspectorProxy = debug
    ? createInspectorProxy(publicInspectorPort, inspectorConnection)
    : undefined;

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

      inspectorConnection?.close();

      // @ts-expect-error
      await miniOxygen.setOptions(miniOxygenOptions);
      inspectorUrl ??= await findInspectorUrl(workerdInspectorPort);
      if (inspectorUrl) {
        inspectorConnection = connectToInspector({inspectorUrl, sourceMapPath});
        inspectorProxy?.updateInspectorConnection(inspectorConnection);
      }
    },
    showBanner(options) {
      console.log('');
      renderSuccess({
        headline: `${
          options?.headlinePrefix ?? ''
        }MiniOxygen (Unstable Worker Runtime) ${
          options?.mode ?? 'development'
        } server running.`,
        body: [
          `View ${options?.appName ?? 'Hydrogen'} app: ${listeningAt}`,
          ...(options?.extraLines ?? []),
          ...(debug
            ? [
                {
                  warn: `\n\nDebugger listening on ws://localhost:${publicInspectorPort}`,
                },
              ]
            : []),
        ],
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

  if (pathname === '/debug-network-server') {
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
        request.url.replace(new URL(request.url).origin, assetsServerOrigin),
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
