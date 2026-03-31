import {
  isFetchableDevEnvironment,
  type HotPayload,
  type ViteDevServer,
} from 'vite';
import {fileURLToPath} from 'node:url';
import {
  createMiniOxygen,
  Request as MiniOxygenRequest,
  Response as MiniOxygenResponse,
  type RequestHook,
  defaultLogRequestLine,
} from '../worker/index.js';
import {Request as MiniflareRequest} from 'miniflare';
import type {OnlyBindings, OnlyServices} from '../worker/utils.js';
import {pipeFromWeb, toWeb} from './utils.js';
import {
  isEntrypointError,
  handleEntrypointError,
  type CustomEntryPointErrorHandler,
} from './entry-error.js';

import type {ViteEnv} from './worker-entry.js';
import type {RequestHookInfo} from '../worker/handler.js';
const scriptPath = fileURLToPath(new URL('./worker-entry.js', import.meta.url));

export const WARMUP_PATHNAME = '/__vite_warmup';

export type InternalMiniOxygenOptions = {
  /**
   * A compatibility date to choose a version of the Oxygen worker.
   */
  compatibilityDate?: string;
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
  /**
   * Callback that runs when detecting a dependency that can be optimized in Vite.
   */
  entryPointErrorHandler?: CustomEntryPointErrorHandler;
};

export type MiniOxygenViteOptions = InternalMiniOxygenOptions & {
  viteDevServer: ViteDevServer;
  entry: string;
  env?: {[key: string]: string};
  debug?: boolean;
  inspectorPort?: number;
  logRequestLine?: null | RequestHook;
};

export type MiniOxygen = ReturnType<typeof createMiniOxygen>;

export function startMiniOxygenRuntime({
  viteDevServer,
  env,
  debug = false,
  inspectorPort,
  crossBoundarySetup,
  entry: workerEntryFile,
  requestHook,
  logRequestLine = defaultLogRequestLine,
  compatibilityDate,
}: MiniOxygenViteOptions): MiniOxygen {
  const wrappedHook =
    requestHook || logRequestLine
      ? async (request: MiniOxygenRequest) => {
          const info = (await request.json()) as RequestHookInfo;

          await Promise.all([requestHook?.(info), logRequestLine?.(info)]);

          return new MiniOxygenResponse('ok');
        }
      : null;
  const wrappedViteInvoke = async (request: MiniOxygenRequest) =>
    handleViteInvokeRequest(viteDevServer, request);

  const miniOxygen = createMiniOxygen({
    debug,
    inspectorPort,
    requestHook: null,
    workers: [
      {
        name: 'vite-env',
        modulesRoot: '/',
        modules: [{type: 'ESModule', path: scriptPath}],
        serviceBindings: {
          __VITE_INVOKE_MODULE: wrappedViteInvoke,
          ...(wrappedHook && {__VITE_REQUEST_HOOK: wrappedHook}),
        } satisfies OnlyServices<ViteEnv>,
        bindings: {
          ...env,
          __VITE_RUNTIME_EXECUTE_URL: workerEntryFile,
          __VITE_WARMUP_PATHNAME: WARMUP_PATHNAME,
        } satisfies OnlyBindings<ViteEnv>,
        unsafeEvalBinding: '__VITE_UNSAFE_EVAL',
        wrappedBindings: {__VITE_SETUP_ENV: 'setup-environment'},
        ...(compatibilityDate && {compatibilityDate}),
      },
      {
        name: 'setup-environment',
        modules: true,
        serviceBindings: crossBoundarySetup?.reduce(
          (acc, {binding}, index) => {
            if (binding) {
              acc[`wrapped_service_${index}`] = async (
                request: MiniOxygenRequest,
              ) => {
                const payload = (await request.json()) as unknown[];
                const result = await binding(...payload);
                return new MiniOxygenResponse(JSON.stringify(result ?? ''));
              };
            }
            return acc;
          },
          {} as Record<
            string,
            (request: MiniOxygenRequest) => Promise<MiniOxygenResponse>
          >,
        ),
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

  return miniOxygen;
}

export function setupOxygenMiddleware(
  viteDevServer: ViteDevServer,
  getEntryPointErrorHandler?: () => CustomEntryPointErrorHandler | undefined,
) {
  viteDevServer.middlewares.use(function o2HandleWorkerRequest(req, res, next) {
    // This request comes from the browser. At this point, Vite
    // tried to serve the request as a static file, but it didn't
    // find it in the project. Therefore, we assume this is a
    // request for a backend route, and we forward it to workerd.

    const environment = viteDevServer.environments['ssr'];
    if (!isFetchableDevEnvironment(environment)) {
      next();
      return;
    }

    environment
      .dispatchFetch(toWeb(req))
      .then(async (webResponse) => {
        if (isEntrypointError(webResponse)) {
          await handleEntrypointError(
            viteDevServer,
            webResponse,
            res,
            getEntryPointErrorHandler?.(),
          );
        } else {
          await pipeFromWeb(webResponse, res);
        }
      })
      .catch((error) => {
        console.error('MiniOxygen: Error during evaluation:', error);
        res.writeHead(500);
        res.end();
      });
  });
}

export function getViteUrl(viteDevServer: ViteDevServer) {
  let viteUrl =
    viteDevServer.resolvedUrls?.local[0] ??
    viteDevServer.resolvedUrls?.network[0];

  if (!viteUrl) {
    const address = viteDevServer.httpServer?.address?.();
    viteUrl =
      address && typeof address !== 'string'
        ? `http://localhost:${address.port}`
        : (address ?? undefined);
  }

  return viteUrl;
}

export function toMiniflareRequest(request: Request): MiniflareRequest {
  // Set the X-Forwarded-Host header to the original host as the `Host` header inside a Worker will contain the workerd host
  const host = request.headers.get('Host');
  if (host) {
    request.headers.set('X-Forwarded-Host', host);
  }
  return new MiniflareRequest(request.url, {
    method: request.method,
    headers: [['accept-encoding', 'identity'], ...request.headers],
    body: request.body as any,
    duplex: 'half',
  });
}

async function handleViteInvokeRequest(
  viteDevServer: ViteDevServer,
  request: MiniOxygenRequest,
): Promise<MiniOxygenResponse> {
  try {
    const payload = (await request.json()) as HotPayload;
    const result =
      await viteDevServer.environments['ssr'].hot.handleInvoke(payload);

    return new MiniOxygenResponse(JSON.stringify(result), {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error during Vite runner invoke:', error);

    return new MiniOxygenResponse(
      JSON.stringify({error: serializeInvokeError(error)}),
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      },
    );
  }
}

function serializeInvokeError(error: unknown) {
  if (error instanceof Error) {
    const errorWithCode = error as Error & {code?: unknown};

    return {
      message: error.message,
      stack: error.stack,
      ...(error.cause ? {cause: error.cause} : {}),
      ...(errorWithCode.code ? {code: errorWithCode.code} : {}),
    };
  }

  return {
    message:
      typeof error === 'string' ? error : 'Unknown Vite runner invoke error',
  };
}
