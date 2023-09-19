import {
  Miniflare,
  Request,
  Response,
  fetch,
  NoOpLog,
  type MiniflareOptions,
} from 'miniflare';
import {resolvePath} from '@shopify/cli-kit/node/path';
import {
  glob,
  readFile,
  fileSize,
  createFileReadStream,
} from '@shopify/cli-kit/node/fs';
import {renderSuccess} from '@shopify/cli-kit/node/ui';
import {lookupMimeType} from '@shopify/cli-kit/node/mimes';
import {connectToInspector, findInspectorUrl} from './workerd-inspector.js';
import {DEFAULT_PORT} from '../flags.js';
import {findPort} from '../find-port.js';
import type {MiniOxygenInstance, MiniOxygenOptions} from './types.js';
import {OXYGEN_HEADERS_MAP, logRequestLine} from './common.js';

export async function startWorkerdServer({
  root,
  port = DEFAULT_PORT,
  watch = false,
  buildPathWorkerFile,
  buildPathClient,
  env,
}: MiniOxygenOptions): Promise<MiniOxygenInstance> {
  const inspectorPort = await findPort(8787);
  const oxygenHeadersMap = Object.values(OXYGEN_HEADERS_MAP).reduce(
    (acc, item) => {
      acc[item.name] = item.defaultValue;
      return acc;
    },
    {} as Record<string, string>,
  );

  const buildMiniOxygenOptions = async () =>
    ({
      cf: false,
      verbose: false,
      port: port,
      log: new NoOpLog(),
      liveReload: watch,
      inspectorPort,
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
            logRequest,
          },
        },
        {
          name: 'hydrogen',
          modules: [
            {
              type: 'ESModule',
              path: resolvePath(root, buildPathWorkerFile),
              contents: await readFile(resolvePath(root, buildPathWorkerFile)),
            },
          ],
          bindings: {...env},
          compatibilityFlags: ['streams_enable_constructors'],
          compatibilityDate: '2022-10-31',
        },
      ],
    } satisfies MiniflareOptions);

  let miniOxygenOptions = await buildMiniOxygenOptions();
  const miniOxygen = new Miniflare(miniOxygenOptions);
  const listeningAt = (await miniOxygen.ready).origin;

  const sourceMapPath = buildPathWorkerFile + '.map';
  let inspectorUrl = await findInspectorUrl(inspectorPort);
  let cleanupInspector = inspectorUrl
    ? connectToInspector({inspectorUrl, sourceMapPath})
    : undefined;

  return {
    port,
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

      cleanupInspector?.();
      await miniOxygen.setOptions(miniOxygenOptions);
      inspectorUrl ??= await findInspectorUrl(inspectorPort);
      if (inspectorUrl) {
        cleanupInspector = connectToInspector({inspectorUrl, sourceMapPath});
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
    initialAssets: string[];
    oxygenHeadersMap: Record<string, string>;
  },
  context: ExecutionContext,
) {
  if (request.method === 'GET') {
    const pathname = new URL(request.url).pathname;

    if (pathname.startsWith('/debug-network')) {
      // TODO implement /debug-network-server here
      return new Response(
        'The Network Debugger is currently not supported in the Worker Runtime.',
      );
    }

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
          ...Object.fromEntries(request.headers.entries()),
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
