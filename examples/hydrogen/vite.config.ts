import { reactRouter } from "@react-router/dev/vite";
import { oxygen } from "@shopify/mini-oxygen/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

type HydrogenPluginOptions = {
  disableVirtualRoutes?: boolean;
};
type HydrogenSharedOptions = HydrogenPluginOptions & {
  command?: "build" | "serve";
};
type HydrogenPlugin = Plugin<{
  registerPluginOptions(newOptions: HydrogenPluginOptions): void;
  getPluginOptions(): HydrogenSharedOptions;
}>;

// E2E harness signals (replace the Shopify Hydrogen CLI's --entry / --env-file
// flags, which the 4.x CLI disabled):
//   HYDROGEN_E2E_ENTRY     — project-relative path to a custom worker entry
//                            (e.g. the MSW mock interceptor).
//   HYDROGEN_E2E_ENV_VARS  — JSON-encoded record injected into the worker's
//                            `env` arg. Passed explicitly so only the env-file
//                            vars reach the worker, not the entire process.env
//                            (which would leak CI secrets like EJSON_PRIVATE_KEY
//                            through MiniOxygen's loadEnv fallback).
const e2eWorkerEntry = process.env.HYDROGEN_E2E_ENTRY;
const e2eEnvVars = process.env.HYDROGEN_E2E_ENV_VARS;
const e2eOxygenOptions = {
  ...(e2eWorkerEntry ? { entry: e2eWorkerEntry } : {}),
  ...(e2eEnvVars
    ? { env: JSON.parse(e2eEnvVars) as Record<string, string> }
    : { env: process.env as Record<string, string> }),
};

export default defineConfig({
  plugins: [tailwindcss(), hydrogen(), oxygen(e2eOxygenOptions), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    // Allow a strict Content-Security-Policy
    // without inlining assets as base64:
    assetsInlineLimit: 0,
  },
  ssr: {
    optimizeDeps: {
      /**
       * Include dependencies here if they throw CJS<>ESM errors.
       * For example, for the following error:
       *
       * > ReferenceError: module is not defined
       * >   at /Users/.../node_modules/example-dep/index.js:1:1
       *
       * Include 'example-dep' in the array below.
       * @see https://vitejs.dev/config/dep-optimization-options
       */
      include: ["react-router > set-cookie-parser", "react-router > cookie", "react-router"],
    },
  },
  server: {
    allowedHosts: [".tryhydrogen.dev", ".trycloudflare.com"],
  },
});

function hydrogen(): HydrogenPlugin {
  const sharedOptions: HydrogenSharedOptions = {};

  return {
    name: "hydrogen:main",
    config(_, env) {
      sharedOptions.command = env.command;
      return {
        build: { outDir: "dist" },
        ssr: {
          optimizeDeps: {
            include: [
              "react",
              "react/jsx-runtime",
              "react/jsx-dev-runtime",
              "react-dom",
              "react-dom/server",
              "react-router",
            ],
          },
        },
      };
    },
    api: {
      registerPluginOptions(newOptions) {
        if (newOptions.disableVirtualRoutes !== undefined) {
          sharedOptions.disableVirtualRoutes = newOptions.disableVirtualRoutes;
        }
      },
      getPluginOptions() {
        return sharedOptions;
      },
    },
  };
}
