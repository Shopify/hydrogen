import type {Plugin, ViteDevServer} from 'vite';
import type {IncomingMessage, ServerResponse} from 'node:http';
import {
  createAssetsServer,
  buildAssetsUrl,
  STATIC_ASSET_EXTENSIONS,
} from '../worker/assets.js';
import {getPort} from '../common/find-port.js';
import type {RequestHookInfo} from '../worker/handler.js';
import {OXYGEN_HEADERS_MAP} from '../common/headers.js';
import {type RequestHook} from '../worker/index.js';
import {type CustomEntryPointErrorHandler} from './entry-error.js';

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

export type OxygenPluginOptions = Partial<
  Pick<
    MiniOxygenViteOptions,
    'entry' | 'env' | 'inspectorPort' | 'logRequestLine' | 'debug'
  >
> & {
  envPromise?: Promise<Record<string, any>>;
  /**
   * Enable Oxygen headers injection
   */
  oxygenHeaders?: boolean;

  /**
   * Request/response hook for debugging and logging
   */
  requestHook?: (info: RequestHookInfo) => void | Promise<void>;

  /**
   * Static asset handling configuration
   */
  staticAssets?: {
    directory: string;
    urlPrefix?: string;
    extensions?: string[];
  };

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

export type OxygenApiOptions = OxygenPluginOptions & InternalMiniOxygenOptions;

/**
 * For internal use only.
 * @private
 */
export type OxygenPlugin = Plugin<{
  registerPluginOptions(newOptions: OxygenApiOptions): void;
}>;

/**
 * Oxygen extensions plugin for use with @cloudflare/vite-plugin
 * Provides Oxygen-specific features that are not available in the base Cloudflare plugin
 */
export function oxygenExtensions(options: OxygenPluginOptions): Plugin {
  let assetsServer: ReturnType<typeof createAssetsServer> | undefined;
  let assetsPort: number | undefined;

  return {
    name: 'oxygen-extensions',

    async configureServer(server: ViteDevServer) {
      // Setup static assets server if configured
      if (options.staticAssets) {
        assetsPort = await getPort();
        assetsServer = createAssetsServer(options.staticAssets.directory);

        await new Promise<void>((resolve, reject) => {
          assetsServer!.listen(assetsPort, () => {
            if (options.debug) {
              console.log(
                `[Oxygen] Static assets server listening on port ${assetsPort}`,
              );
            }
            resolve();
          });
          assetsServer!.on('error', reject);
        });
      }

      // Inject Oxygen headers middleware
      if (options.oxygenHeaders) {
        server.middlewares.use(
          (req: IncomingMessage, res: ServerResponse, next: () => void) => {
            // Inject Oxygen-specific headers
            for (const value of Object.values(OXYGEN_HEADERS_MAP)) {
              if (value && !req.headers[value.name]) {
                req.headers[value.name] = value.defaultValue;
              }
            }

            // Add buyer IP from socket
            if (req.socket.remoteAddress && !req.headers['oxygen-buyer-ip']) {
              req.headers['oxygen-buyer-ip'] = req.socket.remoteAddress;
            }

            if (options.debug) {
              console.log('[Oxygen] Injected headers:', req.headers);
            }

            next();
          },
        );
      }

      // Setup request hook middleware
      if (options.requestHook) {
        server.middlewares.use(
          async (
            req: IncomingMessage,
            res: ServerResponse,
            next: () => void,
          ) => {
            const startTimeMs = Date.now();
            const originalWrite = res.write;
            const originalEnd = res.end;

            // Capture response details
            res.write = function (this: ServerResponse, ...args: any[]) {
              return originalWrite(args);
            };

            res.end = function (this: ServerResponse, ...args: any[]) {
              const endTimeMs = Date.now();
              const durationMs = endTimeMs - startTimeMs;

              // Build request info
              const info: RequestHookInfo = {
                request: {
                  url: req.url || '',
                  method: req.method || 'GET',
                  headers: Object.fromEntries(
                    Object.entries(req.headers).map(([k, v]) => [k, String(v)]),
                  ),
                },
                response: {
                  status: res.statusCode,
                  statusText: res.statusMessage || '',
                  headers: Object.fromEntries(
                    Object.entries(res.getHeaders()).map(([k, v]) => [
                      k,
                      String(v),
                    ]),
                  ),
                },
                meta: {
                  startTimeMs,
                  endTimeMs,
                  durationMs,
                },
              };

              // Call the hook asynchronously
              Promise.resolve(options.requestHook!(info)).catch((error) => {
                console.error('[Oxygen] Request hook error:', error);
              });

              return originalEnd(args);
            };

            next();
          },
        );
      }
    },

    // Provide configuration to other plugins via API
    api: {
      getOxygenConfig() {
        return {
          assetsUrl: assetsPort ? buildAssetsUrl(assetsPort) : undefined,
          staticAssetExtensions:
            options.staticAssets?.extensions || STATIC_ASSET_EXTENSIONS,
          crossBoundarySetup: options.crossBoundarySetup,
          oxygenHeaders: options.oxygenHeaders,
        };
      },
    },

    // Cleanup on server close
    closeBundle() {
      if (assetsServer) {
        assetsServer.close();
      }
    },
  };
}
