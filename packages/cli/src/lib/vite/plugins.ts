import path from 'node:path';
import type {Plugin, ResolvedConfig} from 'vite';
import {
  setupHydrogenMiddleware,
  setupRemixDevServerHooks,
} from './hydrogen-middleware.js';
import {
  getH2OPluginContext,
  setH2OPluginContext,
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
