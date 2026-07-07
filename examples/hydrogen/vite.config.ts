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

import { localCdnAssets } from "../shared/local-cdn-assets-plugin/vite";

export default defineConfig({
  plugins: [localCdnAssets(), tailwindcss(), hydrogen(), oxygen(), reactRouter()],
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
