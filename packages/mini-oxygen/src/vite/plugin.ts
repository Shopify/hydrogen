import path from 'node:path';
import type {Plugin, ResolvedConfig} from 'vite';
import {
  setupOxygenMiddleware,
  type InternalMiniOxygenOptions,
  type MiniOxygenViteOptions,
} from './server-middleware.js';
import {buildAssetsUrl} from '../worker/assets.js';

// Note: Vite resolves extensions like .js or .ts automatically.
const DEFAULT_SSR_ENTRY = './server';

export type OxygenPluginOptions = Partial<
  Pick<
    MiniOxygenViteOptions,
    'entry' | 'env' | 'inspectorPort' | 'logRequestLine' | 'debug'
  >
>;

type OxygenApiOptions = OxygenPluginOptions &
  InternalMiniOxygenOptions & {
    envPromise?: Promise<Record<string, any>>;
  };

/**
 * For internal use only.
 * @private
 */
export type OxygenPlugin = Plugin<{
  registerPluginOptions(newOptions: OxygenApiOptions): void;
}>;

/**
 * Runs backend code in an Oxygen worker instead of Node.js during development.
 * If used with `remix`, place it before it in the Vite plugin list.
 */
export function oxygen(pluginOptions: OxygenPluginOptions = {}): Plugin[] {
  let resolvedConfig: ResolvedConfig;
  let absoluteWorkerEntryFile: string;
  let apiOptions: OxygenApiOptions = {};

  return [
    {
      name: 'oxygen:main',
      config(config, env) {
        return {
          appType: 'custom',
          resolve: {
            conditions: ['worker', 'workerd'],
          },
          server: {
            origin: buildAssetsUrl().replace(/\/$/, ''),
          },
          ssr: {
            noExternal: true,
            target: 'webworker',
          },
          // When building, the CLI will set the `ssr` option to `true`
          // if no --entry flag is passed for the default SSR entry file.
          // Replace it here with a default value.
          ...(env.isSsrBuild &&
            config.build?.ssr && {
              build: {
                ssr:
                  config.build?.ssr === true
                    ? // No --entry flag passed by the user, use the
                      // option passed to the plugin or the default value
                      pluginOptions.entry ?? DEFAULT_SSR_ENTRY
                    : // --entry flag passed by the user, keep it
                      config.build?.ssr,
              },
            }),
        };
      },
      api: {
        registerPluginOptions(newOptions) {
          apiOptions = {
            ...apiOptions,
            ...newOptions,
            env: {...apiOptions.env, ...newOptions.env},
            crossBoundarySetup: [
              ...(apiOptions.crossBoundarySetup || []),
              ...(newOptions.crossBoundarySetup || []),
            ],
          };
        },
      },
      configureServer: {
        order: 'pre',
        handler: (viteDevServer) => {
          const entry =
            apiOptions.entry ?? pluginOptions.entry ?? DEFAULT_SSR_ENTRY;

          // For transform hook:
          resolvedConfig = viteDevServer.config;
          absoluteWorkerEntryFile = path.isAbsolute(entry)
            ? entry
            : path.resolve(resolvedConfig.root, entry);

          return () => {
            setupOxygenMiddleware(viteDevServer, async () => {
              const remoteEnv = await Promise.resolve(apiOptions.envPromise);

              return {
                entry,
                viteDevServer,
                crossBoundarySetup: apiOptions.crossBoundarySetup,
                env: {...remoteEnv, ...apiOptions.env, ...pluginOptions.env},
                debug: apiOptions.debug ?? pluginOptions.debug ?? false,
                inspectorPort:
                  apiOptions.inspectorPort ?? pluginOptions.inspectorPort,
                requestHook: apiOptions.requestHook,
                entryPointErrorHandler: apiOptions.entryPointErrorHandler,
                logRequestLine:
                  // Give priority to the plugin option over the CLI option here,
                  // since the CLI one is just a default, not a user-provided flag.
                  pluginOptions?.logRequestLine ?? apiOptions.logRequestLine,
              };
            });
          };
        },
      },
      transform(code, id, options) {
        if (
          resolvedConfig?.command === 'serve' &&
          resolvedConfig?.server?.hmr !== false &&
          options?.ssr &&
          (id === absoluteWorkerEntryFile ||
            id === absoluteWorkerEntryFile + path.extname(id))
        ) {
          return {
            // Accept HMR in server entry module to avoid full-page refresh in the browser.
            // Note: appending code at the end should not break the source map.
            code: code + '\nif (import.meta.hot) import.meta.hot.accept();',
          };
        }
      },
    } satisfies OxygenPlugin,
  ];
}
