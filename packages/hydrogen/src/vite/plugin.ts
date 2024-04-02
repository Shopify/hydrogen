import path from 'node:path';
import type {Plugin, ResolvedConfig} from 'vite';
import {
  setupHydrogenMiddleware,
  setupRemixDevServerHooks,
} from './hydrogen-middleware.js';
import type {HydrogenPluginOptions} from './types.js';
import {H2O_BINDING_NAME, createLogRequestEvent} from './request-events.js';

// @ts-ignore -- Module outside of the rootDir
import type {OxygenApiOptions} from '~/mini-oxygen/vite/plugin.js';

export type {HydrogenPluginOptions};

/**
 * Enables Hydrogen utilities for local development
 * such as GraphiQL, Subrequest Profiler, etc.
 * It must be used in combination with the `oxygen` plugin and Hydrogen CLI.
 * @experimental
 */
export function hydrogen(pluginOptions: HydrogenPluginOptions = {}): Plugin[] {
  let apiOptions: HydrogenPluginOptions = {};
  const isRemixChildCompiler = (config: ResolvedConfig) =>
    !config.plugins?.some((plugin) => plugin.name === 'remix');

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
      api: {
        registerPluginOptions(newOptions: HydrogenPluginOptions) {
          apiOptions = mergeOptions(apiOptions, newOptions);
        },
        getPluginOptions() {
          return mergeOptions(pluginOptions, apiOptions);
        },
      },
      configResolved(resolvedConfig) {
        // Pass the setup functions to the Oxygen runtime.
        const oxygenPlugin = resolvedConfig.plugins.find(
          (plugin) => plugin.name === 'oxygen:main',
        );

        oxygenPlugin?.api?.registerPluginOptions?.({
          setupScripts: [setupRemixDevServerHooks],
          shouldStartRuntime: () => !isRemixChildCompiler(resolvedConfig),
          services: {
            // @ts-ignore
            [H2O_BINDING_NAME]: createLogRequestEvent({
              transformLocation: (partialLocation) =>
                path.join(
                  resolvedConfig.root ?? process.cwd(),
                  partialLocation,
                ),
            }),
          },
        } satisfies OxygenApiOptions);
      },
      configureServer(viteDevServer) {
        if (isRemixChildCompiler(viteDevServer.config)) return;

        return () => {
          setupHydrogenMiddleware(
            viteDevServer,
            mergeOptions(pluginOptions, apiOptions),
          );
        };
      },
    },
  ];
}

function mergeOptions(
  acc: HydrogenPluginOptions,
  newOptions: HydrogenPluginOptions,
) {
  const newOptionsWithoutUndefined = Object.fromEntries(
    Object.entries(newOptions).filter(([_, value]) => value !== undefined),
  );

  return {...acc, ...newOptionsWithoutUndefined};
}
