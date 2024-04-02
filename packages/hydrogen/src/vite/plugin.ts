import path from 'node:path';
import type {Plugin, ResolvedConfig, UserConfig} from 'vite';
import {
  setupHydrogenMiddleware,
  setupRemixDevServerHooks,
} from './hydrogen-middleware.js';
import type {HydrogenPluginOptions, H2PluginContext} from './types.js';
import {H2O_BINDING_NAME, createLogRequestEvent} from './request-events.js';

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
              // @ts-ignore
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

const H2O_CONTEXT_KEY = '__h2oPluginContext';

function getH2OPluginContext(config: UserConfig | ResolvedConfig) {
  return (config as any)?.[H2O_CONTEXT_KEY] as H2PluginContext;
}

function setH2OPluginContext(options: Partial<H2PluginContext>) {
  return {[H2O_CONTEXT_KEY]: options} as Record<string, any>;
}
