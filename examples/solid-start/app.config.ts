import { localHttps } from "@shopify/hydrogen/vite";
import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

const enabled = process.env.npm_lifecycle_event === "dev:https";
const httpsOptions = { enabled };
const httpsPlugin = localHttps(httpsOptions);
const devServer = httpsPlugin.api.getDevServerConfig();

// Vinxi has no config field for the bind target: it reads HOST/PORT from the
// environment when the listener starts, after this config has loaded. Setting
// them here keeps the scripts free of shell-specific `HOST=` assignments (which
// fail on Windows) and overrides the global HOST that Shopify dev machines
// export, which would otherwise make Vinxi bind to an unreachable hostname.
process.env.HOST = devServer?.host ?? "localhost";
if (devServer) process.env.PORT = String(devServer.port);

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
