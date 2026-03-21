import {
  isFetchableDevEnvironment,
  type FetchModuleOptions,
  type ViteDevServer,
} from 'vite';
import type {IncomingMessage} from 'node:http';
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
import {pipeFromWeb, toURL, toWeb} from './utils.js';
import {
  isEntrypointError,
  handleEntrypointError,
  type CustomEntryPointErrorHandler,
} from './entry-error.js';
import {isMiniOxygenDevEnvironment} from './environment.js';

import type {ViteEnv} from './worker-entry.js';
import type {RequestHookInfo} from '../worker/handler.js';
const scriptPath = fileURLToPath(new URL('./worker-entry.js', import.meta.url));

export const FETCH_MODULE_PATHNAME = '/__vite_fetch_module';
export const WARMUP_PATHNAME = '/__vite_warmup';

type SerializedViteBuiltin =
  | {
      type: 'string';
      value: string;
    }
  | {
      type: 'RegExp';
      source: string;
      flags: string;
    };

type FetchModuleInvokeRequest = {
  name: 'fetchModule';
  data: [id: string, importer?: string, options?: FetchModuleOptions];
};

type GetBuiltinsInvokeRequest = {
  name: 'getBuiltins';
  data: [];
};

type ViteInvokeRequest = FetchModuleInvokeRequest | GetBuiltinsInvokeRequest;

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
          ...(wrappedHook && {__VITE_REQUEST_HOOK: wrappedHook}),
        } satisfies OnlyServices<ViteEnv>,
        bindings: {
          ...env,
          __VITE_ROOT: viteDevServer.config.root,
          __VITE_RUNTIME_EXECUTE_URL: workerEntryFile,
          __VITE_FETCH_MODULE_PATHNAME: FETCH_MODULE_PATHNAME,
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

export function setupOxygenMiddleware(viteDevServer: ViteDevServer) {
  viteDevServer.middlewares.use(
    FETCH_MODULE_PATHNAME,
    function o2HandleModuleFetch(req, res) {
      // This request comes from workerd. It forwards Vite module runner
      // RPC calls that need to execute in the Node.js Vite server.
      void readViteInvokeRequest(req)
        .then((invokeRequest) => {
          if (!invokeRequest) {
            res.writeHead(400, {'Content-Type': 'text/plain'});
            res.end('Invalid request');
            return;
          }

          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Content-Type', 'application/json');

          return handleViteInvokeRequest(viteDevServer, invokeRequest)
            .then((result) => {
              res.end(JSON.stringify({result}));
            })
            .catch((error) => {
              console.error('Error during Vite runner invoke:', error);
              res.writeHead(500);
              res.end(JSON.stringify({error: serializeInvokeError(error)}));
            });
        })
        .catch((error) => {
          console.error('Error during Vite runner invoke:', error);
          res.writeHead(500, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({error: serializeInvokeError(error)}));
        });
    },
  );

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
          const entryPointErrorHandler = isMiniOxygenDevEnvironment(environment)
            ? environment.getRuntimeOptions().entryPointErrorHandler
            : undefined;

          await handleEntrypointError(
            viteDevServer,
            webResponse,
            res,
            entryPointErrorHandler,
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
  invokeRequest: ViteInvokeRequest,
) {
  const environment = viteDevServer.environments['ssr'];

  switch (invokeRequest.name) {
    case 'fetchModule': {
      const [id, importer, options] = invokeRequest.data;

      // `fetchModule` is similar to `viteDevServer.ssrFetchModule`,
      // but it treats source maps differently (avoids adding empty lines).
      return environment.fetchModule(id, importer, options);
    }
    case 'getBuiltins':
      return serializeViteBuiltins(environment.config.resolve.builtins ?? []);
  }
}

async function readViteInvokeRequest(
  req: IncomingMessage,
): Promise<ViteInvokeRequest | null> {
  if (req.method === 'POST') {
    return parseViteInvokeRequest(await readJsonBody(req));
  }

  const url = toURL(req);
  const id = url.searchParams.get('id');

  if (!id) return null;

  const importer = url.searchParams.get('importer') ?? undefined;
  const rawOptions = url.searchParams.get('options');
  const options = rawOptions
    ? (JSON.parse(rawOptions) as FetchModuleOptions)
    : undefined;

  return {
    name: 'fetchModule',
    data: [id, importer, options],
  };
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (!chunks.length) return null;

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function parseViteInvokeRequest(payload: unknown): ViteInvokeRequest | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const {name, data} = payload as {
    name?: unknown;
    data?: unknown;
  };

  if (name === 'getBuiltins' && Array.isArray(data) && data.length === 0) {
    return {name: 'getBuiltins', data: []};
  }

  if (
    name === 'fetchModule' &&
    Array.isArray(data) &&
    typeof data[0] === 'string' &&
    (data[1] === undefined ||
      data[1] === null ||
      typeof data[1] === 'string') &&
    (data[2] === undefined ||
      data[2] === null ||
      (typeof data[2] === 'object' && data[2] !== null))
  ) {
    const importer = typeof data[1] === 'string' ? data[1] : undefined;
    const options =
      data[2] && typeof data[2] === 'object'
        ? (data[2] as FetchModuleOptions)
        : undefined;

    return {
      name,
      data: [data[0], importer, options],
    };
  }

  return null;
}

function serializeViteBuiltins(
  builtins: Array<string | RegExp>,
): SerializedViteBuiltin[] {
  return builtins.map((builtin) => {
    if (typeof builtin === 'string') {
      return {type: 'string', value: builtin};
    }

    return {
      type: 'RegExp',
      source: builtin.source,
      flags: builtin.flags,
    };
  });
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
