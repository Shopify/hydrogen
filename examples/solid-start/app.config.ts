import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

import { localCdnAssets } from "../shared/local-cdn-assets-plugin/vite";
import {
  localHttpsDevServerConfig,
  localHttpsPlugin,
  localHttpsServerConfig,
} from "../shared/local-https-vite";

const localHttpsDevServer = localHttpsDevServerConfig();

export default defineConfig({
  middleware: "src/middleware.ts",
  server: {
    https: localHttpsDevServer?.https,
  },
  vite: {
    plugins: [localCdnAssets(), localHttpsPlugin(), tailwindcss()],
    server: localHttpsServerConfig(),
    resolve: {
      alias: {
        "@shared": new URL("../shared", import.meta.url).pathname,
      },
    },
  },
});
