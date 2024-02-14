import type {Plugin, ResolvedConfig} from 'vite';
import {
  setupHydrogenHandlers,
  setupOxygenHandlers,
  startMiniOxygenRuntime,
  type MiniOxygen,
} from './server.js';
import {
  getCliOptions,
  DEFAULT_SSR_ENTRY,
  type OxygenPluginOptions,
} from './shared.js';

/**
 * Enables Hydrogen utilities for local development
 * such as GraphiQL, Subrequest Profiler, etc.
 * It must be used in combination with the `oxygen` plugin and Hydrogen CLI.
 * @experimental
 */
export function hydrogen(): Plugin[] {
  return [
    {
      name: 'hydrogen:main',
      config() {
        return {
          ssr: {
            optimizeDeps: {
              // Add CJS dependencies that break code in workerd
              // with errors like "require/module/exports is not defined":
              include: [
                // React deps:
                'react',
                'react/jsx-runtime',
                'react/jsx-dev-runtime',
                'react-dom',
                'react-dom/server',
                // Remix deps:
                'set-cookie-parser',
                'cookie',
                // Hydrogen deps:
                'content-security-policy-builder',
              ],
            },
          },
        };
      },
      configureServer(viteDevServer) {
        if (isRemixChildCompiler(viteDevServer.config)) return;

        return () => {
          setupHydrogenHandlers(viteDevServer);
        };
      },
    },
  ];
}

/**
 * Runs backend code in an Oxygen worker instead of Node.js during development.
 * It must be placed after `hydrogen` but before `remix` in the Vite plugins list.
 * @experimental
 */
export function oxygen(pluginOptions: OxygenPluginOptions = {}): Plugin[] {
  return [
    {
      name: 'oxygen:runtime',
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
                      pluginOptions.ssrEntry ?? DEFAULT_SSR_ENTRY
                    : // --entry flag passed by the user, keep it
                      config.build?.ssr,
              },
            }),
        };
      },
      configureServer(viteDevServer) {
        if (isRemixChildCompiler(viteDevServer.config)) return;

        // Get the value from the CLI, which downloads variables
        // from Oxygen and merges them with the local .env file.
        const cliOptions = getCliOptions(viteDevServer.config);
        const envPromise = cliOptions?.envPromise ?? Promise.resolve();

        let miniOxygen: MiniOxygen;
        const miniOxygenPromise = envPromise.then((remoteEnv) => {
          return startMiniOxygenRuntime({
            viteDevServer,
            env: {...remoteEnv, ...viteDevServer.config.env},
            debug: cliOptions?.debug ?? pluginOptions.debug ?? false,
            inspectorPort:
              cliOptions?.inspectorPort ?? pluginOptions.inspectorPort ?? 9229,
            workerEntryFile:
              cliOptions?.ssrEntry ??
              pluginOptions.ssrEntry ??
              DEFAULT_SSR_ENTRY,
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
          setupOxygenHandlers(viteDevServer, async (request) => {
            miniOxygen ??= await miniOxygenPromise;
            return miniOxygen.dispatch(request);
          });
        };
      },
    },
  ];
}

function isRemixChildCompiler(config: ResolvedConfig) {
  return !config.plugins?.some((plugin) => plugin.name === 'remix');
}
