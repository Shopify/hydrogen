import {
  getCompatDate
} from "./chunk-FAQ7TVHC.js";
import {
  setupHydrogenMiddleware
} from "./chunk-MDCIB6DS.js";
import {
  emitRequestEvent
} from "./chunk-ZSWP2RO7.js";

// src/vite/plugin.ts
var sharedOptions = {};
function hydrogen(pluginOptions = {}) {
  let middlewareOptions = {};
  const isHydrogenMonorepo = new URL(
    "../../..",
    import.meta.url
  ).pathname.endsWith("/hydrogen/packages/");
  return [
    {
      name: "hydrogen:main",
      config(_, env) {
        sharedOptions.command = env.command;
        const isHydrogenMonorepo2 = new URL(
          "../../..",
          import.meta.url
        ).pathname.endsWith("/hydrogen/packages/");
        return {
          build: {
            outDir: "dist"
          },
          server: {
            watch: null
          },
          ssr: {
            optimizeDeps: {
              // Add CJS dependencies that break code in workerd
              // with errors like "require/module/exports is not defined":
              include: [
                // React deps:
                "react",
                "react/jsx-runtime",
                "react/jsx-dev-runtime",
                "react-dom",
                "react-dom/server",
                "react-router"
              ]
            }
          },
          // Vite performs an initial reload after optimizing these dependencies.
          // Do it early to avoid the initial reload:
          optimizeDeps: {
            // Vite performs an initial reload after optimizing these dependencies.
            // Do it early to avoid the initial reload:
            include: isHydrogenMonorepo2 ? [
              // In monorepo, optimize non-Hydrogen packages to allow
              // source code changes to be reflected without cache issues
              "content-security-policy-builder",
              "worktop/cookie",
              "@shopify/hydrogen > @shopify/graphql-client",
              "use-resize-observer"
            ] : [
              // In production projects, optimize Hydrogen and critical deps
              "@shopify/hydrogen"
            ]
          }
        };
      },
      api: {
        registerPluginOptions(newOptions) {
          middlewareOptions = mergeOptions(middlewareOptions, newOptions);
          if ("disableVirtualRoutes" in middlewareOptions) {
            sharedOptions.disableVirtualRoutes = middlewareOptions.disableVirtualRoutes;
          }
        },
        getPluginOptions() {
          return sharedOptions;
        }
      },
      configResolved(resolvedConfig) {
        const oxygenPlugin = resolvedConfig.plugins.find(
          (plugin) => plugin.name === "oxygen:main"
        );
        middlewareOptions.isOxygen = !!oxygenPlugin;
        oxygenPlugin?.api?.registerPluginOptions?.({
          compatibilityDate: getCompatDate(),
          env: {
            // Pass the project root to the worker for Chrome DevTools workspace configuration
            HYDROGEN_PROJECT_ROOT: resolvedConfig.root
          },
          requestHook: ({ request, response, meta }) => {
            emitRequestEvent(
              {
                __fromVite: true,
                eventType: "request",
                url: request.url,
                requestId: request.headers["request-id"],
                purpose: request.headers["purpose"],
                startTime: meta.startTimeMs,
                endTime: meta.endTimeMs,
                responseInit: {
                  status: response.status,
                  statusText: response.statusText,
                  headers: Object.entries(response.headers)
                }
              },
              resolvedConfig.root
            );
          },
          crossBoundarySetup: [
            {
              // Setup the global function in the Oxygen worker
              script: (binding) => {
                globalThis.__H2O_LOG_EVENT = binding;
              },
              binding: (data) => {
                emitRequestEvent(
                  data,
                  resolvedConfig.root
                );
              }
            },
            {
              // Improve stack traces in Oxygen by showing full error stack
              script: () => {
                const originalErrorToString = Error.prototype.toString;
                Error.prototype.toString = function() {
                  return this.stack || originalErrorToString.call(this);
                };
              }
            },
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
                globalThis.__remix_devServerHooks = { getCriticalCss: binding };
              },
              binding: (...args) => {
                return globalThis.__remix_devServerHooks?.getCriticalCss?.(
                  ...args
                );
              }
            }
          ]
        });
      },
      configureServer: {
        order: "pre",
        handler: (viteDevServer) => {
          return () => {
            setupHydrogenMiddleware(
              viteDevServer,
              mergeOptions(pluginOptions, middlewareOptions)
            );
          };
        }
      }
    }
  ];
}
function mergeOptions(acc, newOptions) {
  const newOptionsWithoutUndefined = Object.fromEntries(
    Object.entries(newOptions).filter(([_, value]) => value !== void 0)
  );
  return { ...acc, ...newOptionsWithoutUndefined };
}
export {
  hydrogen
};
