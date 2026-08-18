import { localHttps } from "@shopify/hydrogen/vite";
import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

const enabled =
  process.env.VITE_LOCAL_HTTPS === "1" || process.env.npm_lifecycle_event === "https:dev";
const httpsOptions = { enabled };
const httpsPlugin = localHttps(httpsOptions);
const devServer = httpsPlugin.api.getDevServerConfig();

export default defineConfig({
  middleware: "src/middleware.ts",
  server: {
    https: devServer?.https,
  },
  vite: {
    plugins: [httpsPlugin, tailwindcss()],
    resolve: {
      alias: {
        "@shared": new URL("../shared", import.meta.url).pathname,
      },
    },
  },
});
