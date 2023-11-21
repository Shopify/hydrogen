import crypto from 'node:crypto';
import {
  Miniflare,
  Request,
  Response,
  fetch,
  NoOpLog,
  type MiniflareOptions,
} from 'miniflare';
import {dirname, resolvePath} from '@shopify/cli-kit/node/path';
import {
  glob,
  readFile,
  fileSize,
  createFileReadStream,
} from '@shopify/cli-kit/node/fs';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {lookupMimeType} from '@shopify/cli-kit/node/mimes';
import {createInspectorConnector} from './workerd-inspector.js';
import {findPort} from '../find-port.js';
import type {MiniOxygenInstance, MiniOxygenOptions} from './types.js';
import {OXYGEN_HEADERS_MAP, logRequestLine} from './common.js';
import {
  H2O_BINDING_NAME,
  handleDebugNetworkRequest,
  logRequestEvent,
  setConstructors,
} from '../request-events.js';

// This should probably be `0` and let workerd find a free port,
// but at the moment we can't get the port from workerd (afaik?).
const PRIVATE_WORKERD_INSPECTOR_PORT = 9222;

export async function startWorkerdServer({
  root,
  port: appPort,
  inspectorPort: publicInspectorPort,
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

  const buildMiniOxygenOptions = async () =>
    ({
      cf: false,
      verbose: false,
      port: appPort,
      inspectorPort: privateInspectorPort,
      log: new NoOpLog(),
      liveReload: watch,
      host: 'localhost',
      workers: [
        {
          name: 'mini-oxygen',
          modules: true,
          script: `export default { fetch: ${miniOxygenHandler.toString()} }`,
          bindings: {
            initialAssets: await glob('**/*', {cwd: buildPathClient}),
            oxygenHeadersMap,
          },
          serviceBindings: {
            hydrogen: 'hydrogen',
            assets: createAssetHandler(buildPathClient),
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

  const reconnect = createInspectorConnector({
    debug,
    sourceMapPath,
    absoluteBundlePath,
    privateInspectorPort,
    publicInspectorPort,
  });

  await reconnect();

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

      const debuggerMessage = `\n\nDebug mode enabled. Attach a ${
        process.env.TERM_PROGRAM === 'vscode' ? 'VSCode ' : ''
      }debugger to port ${publicInspectorPort}\nor open DevTools in http://localhost:${publicInspectorPort}`;

      renderSuccess({
        headline: `${
          options?.headlinePrefix ?? ''
        }MiniOxygen (Unstable Worker Runtime) ${
          options?.mode ?? 'development'
        } server running.`,
        body: [
          `View ${options?.appName ?? 'Hydrogen'} app: ${listeningAt}`,
          ...(options?.extraLines ?? []),
          ...(debug ? [{warn: debuggerMessage}] : []),
        ],
      });
      console.log('');
    },
    async close() {
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
    initialAssets: string[];
    oxygenHeadersMap: Record<string, string>;
  },
  context: ExecutionContext,
) {
  const {pathname} = new URL(request.url);

  if (pathname === '/debug-network-server') {
    return env.debugNetwork.fetch(request);
  }

  if (request.method === 'GET') {
    if (new Set(env.initialAssets).has(pathname.slice(1))) {
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

function createAssetHandler(buildPathClient: string) {
  return async (request: Request): Promise<Response> => {
    const relativeAssetPath = new URL(request.url).pathname.replace('/', '');
    if (relativeAssetPath) {
      try {
        const absoluteAssetPath = resolvePath(
          buildPathClient,
          relativeAssetPath,
        );

        return new Response(createFileReadStream(absoluteAssetPath), {
          headers: {
            'Content-Type': lookupMimeType(relativeAssetPath) || 'text/plain',
            'Content-Length': String(await fileSize(absoluteAssetPath)),
          },
        });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }

    return new Response('Not Found', {status: 404});
  };
}

async function logRequest(request: Request): Promise<Response> {
  logRequestLine(request, {
    responseStatus: Number(request.headers.get('h2-response-status') || 200),
    durationMs: Number(request.headers.get('h2-duration-ms') || 0),
  });

  return new Response('ok');
}
