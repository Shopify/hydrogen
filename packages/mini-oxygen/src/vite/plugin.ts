import path from 'node:path';
import type {Plugin, ResolvedConfig, UserConfig} from 'vite';
import {
  setupOxygenMiddleware,
  startMiniOxygenRuntime,
  type InternalMiniOxygenOptions,
  type MiniOxygenViteOptions,
  type MiniOxygen,
} from './server-middleware.js';

// Note: Vite resolves extensions like .js or .ts automatically.
const DEFAULT_SSR_ENTRY = './server';

let miniOxygen: MiniOxygen;

type OxygenPluginOptions = Partial<
  Pick<
    MiniOxygenViteOptions,
    'entry' | 'env' | 'inspectorPort' | 'logRequestLine' | 'debug'
  >
>;

type O2PluginContext = InternalMiniOxygenOptions & {
  shouldStartRuntime?: (config: ResolvedConfig) => boolean;
  cliOptions?: Partial<
    OxygenPluginOptions & {
      envPromise: Promise<Record<string, any>>;
    }
  >;
};

const H2O_CONTEXT_KEY = '__h2oPluginContext';

function getH2OPluginContext(config: UserConfig | ResolvedConfig) {
  return (config as any)?.[H2O_CONTEXT_KEY] as O2PluginContext | undefined;
}

/**
 * Runs backend code in an Oxygen worker instead of Node.js during development.
 * It must be placed after `hydrogen` but before `remix` in the Vite plugins list.
 * @experimental
 */
export function oxygen(pluginOptions: OxygenPluginOptions = {}): Plugin[] {
  let resolvedConfig: ResolvedConfig;
  let absoluteWorkerEntryFile: string;

  return [
    {
      name: 'oxygen:main',
      config(config, env) {
        return {
          appType: 'custom',
          resolve: {
            conditions: ['worker', 'workerd'],
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
      configureServer(viteDevServer) {
        resolvedConfig = viteDevServer.config;

        // Get options from Hydrogen plugin and CLI.
        const {shouldStartRuntime, cliOptions, setupScripts, services} =
          getH2OPluginContext(resolvedConfig) || {};

        if (shouldStartRuntime && !shouldStartRuntime(resolvedConfig)) return;
        if (miniOxygen) return;

        const entry =
          cliOptions?.entry ?? pluginOptions.entry ?? DEFAULT_SSR_ENTRY;
        absoluteWorkerEntryFile = path.isAbsolute(entry)
          ? entry
          : path.resolve(viteDevServer.config.root, entry);

        const envPromise = cliOptions?.envPromise ?? Promise.resolve();

        const miniOxygenPromise = envPromise.then((remoteEnv) => {
          return startMiniOxygenRuntime({
            entry,
            viteDevServer,
            setupScripts,
            services,
            env: {...remoteEnv, ...pluginOptions.env},
            debug: cliOptions?.debug ?? pluginOptions.debug ?? false,
            inspectorPort:
              cliOptions?.inspectorPort ?? pluginOptions.inspectorPort,
            logRequestLine:
              // Give priority to the plugin option over the CLI option here,
              // since the CLI one is just a default, not a user-provided flag.
              pluginOptions?.logRequestLine ?? cliOptions?.logRequestLine,
          });
        });

        process.once('SIGTERM', async () => {
          try {
            await miniOxygen?.dispose();
          } finally {
            process.exit();
          }
        });

        return () => {
          setupOxygenMiddleware(viteDevServer, async (request) => {
            miniOxygen ??= await miniOxygenPromise;
            return miniOxygen.dispatchFetch(request);
          });
        };
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
    },
  ];
}
