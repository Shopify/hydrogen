import {defaultClientConditions} from 'vite';
import type {Plugin} from 'vite';
import {
  createMiniOxygenDevEnvironment,
  type MiniOxygenDevEnvironment,
  type MiniOxygenRuntimeOptions,
  mergeMiniOxygenRuntimeOptions,
} from './environment.js';
import {
  setupOxygenMiddleware,
  type MiniOxygenViteOptions,
} from './server-middleware.js';

// Note: Vite resolves extensions like .js or .ts automatically.
const DEFAULT_SSR_ENTRY = './server';

export type OxygenPluginOptions = Partial<
  Pick<
    MiniOxygenViteOptions,
    'entry' | 'env' | 'inspectorPort' | 'logRequestLine' | 'debug'
  >
>;

type OxygenApiOptions = MiniOxygenRuntimeOptions;

/**
 * For internal use only.
 * @private
 */
export type OxygenPlugin = Plugin<{
  registerPluginOptions(newOptions: OxygenApiOptions): void;
}>;

export type {MiniOxygenDevEnvironment};

/**
 * Runs backend code in an Oxygen worker instead of Node.js during development.
 * If used with `remix`, place it before it in the Vite plugin list.
 */
export function oxygen(pluginOptions: OxygenPluginOptions = {}): Plugin[] {
  let apiOptions: OxygenApiOptions = {};
  let miniOxygenEnvironment: MiniOxygenDevEnvironment | undefined;

  const resolveMiniOxygenOptions = async (
    runtimeOptions: MiniOxygenRuntimeOptions,
    viteDevServer: MiniOxygenViteOptions['viteDevServer'],
  ): Promise<MiniOxygenViteOptions> => {
    const entry =
      runtimeOptions.entry ?? pluginOptions.entry ?? DEFAULT_SSR_ENTRY;
    const remoteEnv = await Promise.resolve(runtimeOptions.envPromise);

    return {
      entry,
      viteDevServer,
      crossBoundarySetup: runtimeOptions.crossBoundarySetup,
      env: {...remoteEnv, ...runtimeOptions.env, ...pluginOptions.env},
      debug: runtimeOptions.debug ?? pluginOptions.debug ?? false,
      inspectorPort:
        runtimeOptions.inspectorPort ?? pluginOptions.inspectorPort,
      requestHook: runtimeOptions.requestHook,
      entryPointErrorHandler: runtimeOptions.entryPointErrorHandler,
      compatibilityDate: runtimeOptions.compatibilityDate,
      logRequestLine:
        // Give priority to the plugin option over the CLI option here,
        // since the CLI one is just a default, not a user-provided flag.
        pluginOptions.logRequestLine ?? runtimeOptions.logRequestLine,
    };
  };

  const applyRuntimeOptions = (newOptions: OxygenApiOptions) => {
    miniOxygenEnvironment?.configureRuntime(newOptions);
    apiOptions = mergeMiniOxygenRuntimeOptions(apiOptions, newOptions);
  };

  return [
    {
      name: 'oxygen:main',
      config(config, env) {
        return {
          appType: 'custom',
          resolve: {
            conditions: ['worker', 'workerd', ...defaultClientConditions],
          },
          ssr: {
            noExternal: true,
            target: 'webworker',
            resolve: {
              conditions: ['worker', 'workerd', ...defaultClientConditions],
            },
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
                      (pluginOptions.entry ?? DEFAULT_SSR_ENTRY)
                    : // --entry flag passed by the user, keep it
                      config.build?.ssr,
              },
            }),
        };
      },
      configEnvironment(name) {
        if (name !== 'ssr') return;

        return {
          resolve: {
            conditions: ['worker', 'workerd', ...defaultClientConditions],
          },
          dev: {
            createEnvironment(name, config) {
              // Vite can recreate environments on server restart. Keep this
              // pointer on the latest SSR environment so late runtime options
              // are applied to the active instance, and let Vite close the
              // previous environment through its normal restart lifecycle.
              return (miniOxygenEnvironment = createMiniOxygenDevEnvironment(
                name,
                config,
                apiOptions,
                resolveMiniOxygenOptions,
              ));
            },
          },
        };
      },
      api: {
        registerPluginOptions(newOptions) {
          applyRuntimeOptions(newOptions);
        },
      },
      configureServer: {
        order: 'pre',
        handler: (viteDevServer) => {
          return () => {
            setupOxygenMiddleware(
              viteDevServer,
              () => apiOptions.entryPointErrorHandler,
            );
          };
        },
      },
      generateBundle() {
        if (apiOptions.compatibilityDate) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(apiOptions.compatibilityDate)) {
            throw new Error(
              `Invalid compatibility date "${apiOptions.compatibilityDate}"`,
            );
          }

          const oxygenJsonFile = 'oxygen.json';
          const oxygenJsonContent = {
            version: 1,
            compatibility_date: apiOptions.compatibilityDate,
          };

          this.emitFile({
            type: 'asset',
            fileName: oxygenJsonFile,
            source: JSON.stringify(oxygenJsonContent, null, 2),
          });
        }
      },
    } satisfies Plugin<{
      registerPluginOptions(newOptions: OxygenApiOptions): void;
    }>,
  ];
}
