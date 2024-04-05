import type {Plugin, ResolvedConfig, ConfigEnv} from 'vite';
import type {Preset as RemixPreset} from '@remix-run/dev';
import {setupHydrogenMiddleware} from './hydrogen-middleware.js';
import type {HydrogenPluginOptions} from './types.js';

// @ts-ignore -- Module outside of the rootDir
import type {OxygenApiOptions} from '~/mini-oxygen/vite/plugin.js';
import {type RequestEventPayload, emitRequestEvent} from './request-events.js';
import {getVirtualRoutes} from './get-virtual-routes.js';

export type {HydrogenPluginOptions};

declare global {
  var __H2O_LOG_EVENT: undefined | ((event: RequestEventPayload) => void);
  var __remix_devServerHooks:
    | undefined
    | {getCriticalCss: (...args: unknown[]) => any};
}

const sharedOptions: Partial<
  Pick<HydrogenPluginOptions, 'disableVirtualRoutes'> &
    Pick<ConfigEnv, 'command'>
> = {};

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
      config(_, env) {
        sharedOptions.command = env.command;

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
          if ('disableVirtualRoutes' in apiOptions) {
            sharedOptions.disableVirtualRoutes =
              apiOptions.disableVirtualRoutes;
          }
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
          shouldStartRuntime: () => !isRemixChildCompiler(resolvedConfig),
          crossBoundarySetup: [
            /**
             * To avoid initial CSS flash during development,
             * most frameworks implement a way to gather critical CSS.
             * Remix does this by calling a global function that their
             * Vite plugin creates in the Node.js process:
             * @see https://github.com/remix-run/remix/blob/b07921efd5e8eed98e2996749852777c71bc3e50/packages/remix-server-runtime/dev.ts#L37-L47
             *
             * Here we are setting up a stub function in the Oxygen worker
             * that will be called by Remix during development. Then, we forward
             * this request to the Node.js process (Vite server) where the actual
             * Remix function is called and the critical CSS is returned to the worker.
             */
            {
              script: (binding) => {
                // Setup global dev hooks in Remix in the worker environment
                // using the binding function passed from Node environment:
                globalThis.__remix_devServerHooks = {getCriticalCss: binding};
              },
              binding: (...args) => {
                // Call the global Remix dev hook for critical CSS in Node environment:
                return globalThis.__remix_devServerHooks?.getCriticalCss?.(
                  ...args,
                );
              },
            },
            {
              script: (binding) => {
                globalThis.__H2O_LOG_EVENT = binding;
              },
              binding: (data) => {
                emitRequestEvent(data, resolvedConfig.root);
              },
            },
          ],
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

hydrogen.preset = () =>
  ({
    name: 'hydrogen',
    remixConfig() {
      if (sharedOptions.disableVirtualRoutes) return {};

      return {
        buildDirectory: 'dist',
        async routes(defineRoutes) {
          if (
            sharedOptions.disableVirtualRoutes ||
            sharedOptions.command !== 'serve'
          ) {
            return {};
          }

          const {root, routes: virtualRoutes} = await getVirtualRoutes();

          const result = defineRoutes((route) => {
            route(root.path, root.file, {id: root.id}, () => {
              virtualRoutes.map(({path, file, index, id}) => {
                route(path, file, {id, index});
              });
            });
          });

          // - Goal: stop matching the user's root with our virtual routes
          // to avoid adding layouts and calling user loaders.
          //
          // - Problem: Even though root-less routes work in Remix, it always
          // adds the user root as the parentId of every route when we leave it
          // as undefined. Even if we delete it manually here, it adds it back:
          // https://github.com/remix-run/remix/blob/b07921efd5e8eed98e2996749852777c71bc3e50/packages/remix-dev/config.ts#L565
          //
          // - Solution:
          // The String object tricks Remix into thinking that the
          // parentId is defined (!!new String('') === true) so it doesn't
          // overwrite it with `root`. Later, this value acts as an
          // undefined / empty string when matching routes so it
          // doesn't match the user root.
          // @ts-expect-error
          result[root.id].parentId = new String('');

          return result;
        },
      };
    },
  } satisfies RemixPreset);
