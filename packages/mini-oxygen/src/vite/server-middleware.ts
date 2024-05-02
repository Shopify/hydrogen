import {fetchModule, type ViteDevServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {
  fetch,
  createMiniOxygen,
  Request,
  Response,
  type RequestHook,
  defaultLogRequestLine,
} from '../worker/index.js';
import type {OnlyBindings, OnlyServices} from '../worker/utils.js';
import {getHmrUrl, pipeFromWeb, toURL, toWeb} from './utils.js';

import type {ViteEnv} from './worker-entry.js';
import {type RequestHookInfo} from '../worker/handler.js';
const scriptPath = fileURLToPath(new URL('./worker-entry.js', import.meta.url));

const FETCH_MODULE_PATHNAME = '/__vite_fetch_module';
const WARMUP_PATHNAME = '/__vite_warmup';

export type InternalMiniOxygenOptions = {
  /**
   * A function called asynchronously when the worker gets a response.
   */
  requestHook?: RequestHook;
  /**
   * Allows setting up global state in the worker process
   * that can optionally run code from the parent process.
   */
  crossBoundarySetup?: Array<
    | {
        /**
         * Function that is stringified and runs in the worker.
         */
        script: () => void;
        binding?: never;
      }
    | {
        /**
         * Function that is stringified and runs in the worker.
         * It gets the binding function as its first argument.
         */
        script: (
          binding: (...args: unknown[]) => Promise<unknown | void>,
        ) => void;
        /**
         * The binding function that runs in the parent process.
         */
        binding: (...args: unknown[]) => unknown | Promise<unknown> | void;
      }
  >;
};

export type MiniOxygenViteOptions = InternalMiniOxygenOptions & {
  viteDevServer: ViteDevServer;
  entry: string;
  env?: {[key: string]: string};
  debug?: boolean;
  inspectorPort?: number;
  logRequestLine?: null | RequestHook;
};

export type MiniOxygen = Awaited<ReturnType<typeof startMiniOxygenRuntime>>;

export async function startMiniOxygenRuntime({
  viteDevServer,
  env,
  debug = false,
  inspectorPort,
  crossBoundarySetup,
  entry: workerEntryFile,
  requestHook,
  logRequestLine = defaultLogRequestLine,
}: MiniOxygenViteOptions) {
  const wrappedHook =
    requestHook || logRequestLine
      ? async (request: Request) => {
          const info = (await request.json()) as RequestHookInfo;

          await Promise.all([requestHook?.(info), logRequestLine?.(info)]);

          return new Response('ok');
        }
      : null;

  const miniOxygen = createMiniOxygen({
    debug,
    inspectorPort,
    requestHook: null,
    // TODO get vite url earlier
    assets: {origin: getViteUrl(viteDevServer) ?? 'http://localhost:3000'},
    workers: [
      {
        name: 'vite-env',
        modulesRoot: '/',
        modules: [{type: 'ESModule', path: scriptPath}],
        serviceBindings: {
          ...(wrappedHook && {__VITE_REQUEST_HOOK: wrappedHook}),
        } satisfies OnlyServices<ViteEnv>,
        bindings: {
          ...env,
          __VITE_ROOT: viteDevServer.config.root,
          __VITE_RUNTIME_EXECUTE_URL: workerEntryFile,
          __VITE_FETCH_MODULE_PATHNAME: FETCH_MODULE_PATHNAME,
          __VITE_HMR_URL: getHmrUrl(viteDevServer),
          __VITE_WARMUP_PATHNAME: WARMUP_PATHNAME,
        } satisfies OnlyBindings<ViteEnv>,
        unsafeEvalBinding: '__VITE_UNSAFE_EVAL',
        wrappedBindings: {__VITE_SETUP_ENV: 'setup-environment'},
      },
      {
        name: 'setup-environment',
        modules: true,
        serviceBindings: crossBoundarySetup?.reduce((acc, {binding}, index) => {
          if (binding) {
            acc[`wrapped_service_${index}`] = async (request: Request) => {
              const payload = (await request.json()) as unknown[];
              const result = await binding(...payload);
              return new Response(JSON.stringify(result ?? ''));
            };
          }
          return acc;
        }, {} as Record<string, (request: Request) => Promise<Response>>),
        script: `
          const setupScripts = [${
            crossBoundarySetup?.map((boundary) => boundary.script) ?? ''
          }];
          export default (env) => () => {
            setupScripts.forEach((setup, index) => {
              if (!setup) return;

              const service = env['wrapped_service_' + index];
              const wrappedBinding = service 
                ? (...args) => {
                  return service.fetch(
                    new Request(
                      'http://localhost',
                      {method: 'POST', body: JSON.stringify(args)}
                    )
                  ).then(response => response.json());
                }
                : undefined;

              setup(wrappedBinding);
            });

            setupScripts.length = 0;
          }`,
      },
    ],
  });

  const warmupWorkerdCache = () => {
    const viteUrl = getViteUrl(viteDevServer);

    if (viteUrl) {
      miniOxygen
        .dispatchFetch(new URL(WARMUP_PATHNAME, viteUrl))
        .catch(() => {});
    }
  };

  viteDevServer.httpServer?.listening
    ? warmupWorkerdCache()
    : viteDevServer.httpServer?.once('listening', warmupWorkerdCache);

  // Ensure MiniOxygen is disposed when Vite is closed
  const viteClose = viteDevServer.close;
  viteDevServer.close = async () => {
    await Promise.allSettled([viteClose(), miniOxygen.dispose()]);
  };

  return miniOxygen;
}

export function setupOxygenMiddleware(
  viteDevServer: ViteDevServer,
  dispatchFetch: (webRequest: Request) => Promise<Response>,
) {
  viteDevServer.middlewares.use(
    FETCH_MODULE_PATHNAME,
    function o2HandleModuleFetch(req, res) {
      // This request comes from workerd. It is asking for the contents
      // of backend files. We need to fetch the file through Vite,
      // which transpiles/prepares the source code into valid JS, and
      // send it back so that workerd can evaluate/run it.

      const url = toURL(req);
      const id = url.searchParams.get('id');
      const importer = url.searchParams.get('importer') ?? undefined;

      if (id) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'application/json');

        // `fetchModule` is similar to `viteDevServer.ssrFetchModule`,
        // but it treats source maps differently (avoids adding empty lines).
        fetchModule(viteDevServer, id, importer)
          .then((ssrModule) => res.end(JSON.stringify(ssrModule)))
          .catch((error) => {
            console.error('Error during module fetch:', error);
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('Internal server error');
          });
      } else {
        res.writeHead(400, {'Content-Type': 'text/plain'});
        res.end('Invalid request');
      }
    },
  );

  viteDevServer.middlewares.use(function o2HandleWorkerRequest(req, res) {
    // This request comes from the browser. At this point, Vite
    // tried to serve the request as a static file, but it didn't
    // find it in the project. Therefore, we assume this is a
    // request for a backend route, and we forward it to workerd.

    dispatchFetch(toWeb(req))
      .then((webResponse) => pipeFromWeb(webResponse, res))
      .catch((error) => {
        console.error('Error during evaluation:', error);
        res.writeHead(500);
        res.end();
      });
  });
}

function getViteUrl(viteDevServer: ViteDevServer) {
  let viteUrl =
    viteDevServer.resolvedUrls?.local[0] ??
    viteDevServer.resolvedUrls?.network[0];

  if (!viteUrl) {
    const address = viteDevServer.httpServer?.address?.();
    viteUrl =
      address && typeof address !== 'string'
        ? `http://localhost:${address.port}`
        : address ?? undefined;
  }

  return viteUrl;
}
