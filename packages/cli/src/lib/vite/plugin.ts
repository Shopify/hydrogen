import type {Plugin} from 'vite';
import {
  setupHydrogenHandlers,
  setupOxygenHandlers,
  startMiniOxygenRuntime,
  type MiniOxygen,
} from './server.js';
import {
  getCliOptions,
  DEFAULT_SSR_ENTRY,
  type HydrogenPluginOptions,
} from './shared.js';

export function hydrogen(pluginOptions: HydrogenPluginOptions = {}): Plugin[] {
  return [
    {
      name: 'h2:main',
      config(config, env) {
        return {
          appType: 'custom',
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
        return () => {
          setupHydrogenHandlers(viteDevServer);
        };
      },
    },
    {
      name: 'h2:oxygen-runtime',
      apply: 'serve',
      configureServer(viteDevServer) {
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
