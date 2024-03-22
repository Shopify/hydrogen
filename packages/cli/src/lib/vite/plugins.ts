import path from 'node:path';
import type {Plugin, ResolvedConfig} from 'vite';
import {
  setupHydrogenMiddleware,
  setupRemixDevServerHooks,
} from './hydrogen-middleware.js';
import {
  setupOxygenMiddleware,
  startMiniOxygenRuntime,
  type MiniOxygen,
} from './mini-oxygen.js';
import {
  getH2OPluginContext,
  setH2OPluginContext,
  DEFAULT_SSR_ENTRY,
  type OxygenPluginOptions,
  type HydrogenPluginOptions,
} from './shared.js';
import {H2O_BINDING_NAME, createLogRequestEvent} from '../request-events.js';

/**
 * Enables Hydrogen utilities for local development
 * such as GraphiQL, Subrequest Profiler, etc.
 * It must be used in combination with the `oxygen` plugin and Hydrogen CLI.
 * @experimental
 */
export function hydrogen(pluginOptions: HydrogenPluginOptions = {}): Plugin[] {
  const isRemixChildCompiler = (config: ResolvedConfig) =>
    !config.plugins?.some((plugin) => plugin.name === 'remix');

  return [
    {
      name: 'hydrogen:main',
      config(config) {
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
          // Pass the setup functions to the Oxygen runtime.
          ...setH2OPluginContext({
            setupScripts: [setupRemixDevServerHooks],
            shouldStartRuntime: (config) => !isRemixChildCompiler(config),
            services: {
              [H2O_BINDING_NAME]: createLogRequestEvent({
                transformLocation: (partialLocation) =>
                  path.join(config.root ?? process.cwd(), partialLocation),
              }),
            },
          }),
        };
      },
      configureServer(viteDevServer) {
        if (isRemixChildCompiler(viteDevServer.config)) return;

        // Get options from Hydrogen CLI.
        const {cliOptions} = getH2OPluginContext(viteDevServer.config) || {};

        return () => {
          setupHydrogenMiddleware(viteDevServer, {
            ...pluginOptions,
            ...cliOptions,
          });
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
  let resolvedConfig: ResolvedConfig;
  let absoluteWorkerEntryFile: string;

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
        resolvedConfig = viteDevServer.config;

        // Get options from Hydrogen plugin and CLI.
        const {shouldStartRuntime, cliOptions, setupScripts, services} =
          getH2OPluginContext(resolvedConfig) || {};

        if (shouldStartRuntime && !shouldStartRuntime(resolvedConfig)) return;

        const workerEntryFile =
          cliOptions?.ssrEntry ?? pluginOptions.ssrEntry ?? DEFAULT_SSR_ENTRY;
        absoluteWorkerEntryFile = path.isAbsolute(workerEntryFile)
          ? workerEntryFile
          : path.resolve(viteDevServer.config.root, workerEntryFile);

        const envPromise = cliOptions?.envPromise ?? Promise.resolve();

        let miniOxygen: MiniOxygen;
        const miniOxygenPromise = envPromise.then((remoteEnv) => {
          return startMiniOxygenRuntime({
            viteDevServer,
            workerEntryFile,
            setupScripts,
            services,
            env: {...remoteEnv, ...pluginOptions.env},
            debug: cliOptions?.debug ?? pluginOptions.debug ?? false,
            inspectorPort:
              cliOptions?.inspectorPort ?? pluginOptions.inspectorPort ?? 9229,
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
