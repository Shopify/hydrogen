import { localHttps, localHttpsDevServer } from "@shopify/hydrogen/vite";
import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

const enabled = process.env.npm_lifecycle_event === "dev:https";
const httpsOptions = { enabled };
const devServer = localHttpsDevServer(httpsOptions);

export default defineConfig({
  middleware: "src/middleware.ts",
  server: {
    https: devServer?.https,
  },
  vite: {
    plugins: [localHttps(httpsOptions), tailwindcss()],
    resolve: {
      alias: {
        "@shared": new URL("../shared", import.meta.url).pathname,
      },
    },
  },
});
