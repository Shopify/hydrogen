import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { defineConfig } from "astro/config";

import { localHttpsPlugin, localHttpsServerConfig } from "../../shared/local-https-vite";

const localHttpsServer = localHttpsServerConfig();
const localHttpsAstroServer = localHttpsServer
  ? {
      host: localHttpsServer.host,
      port: localHttpsServer.port,
    }
  : undefined;

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  server: localHttpsAstroServer,
  vite: {
    plugins: [localHttpsPlugin(), tailwindcss()],
    server: localHttpsServer,
    resolve: {
      alias: {
        "@shared": new URL("../../shared", import.meta.url).pathname,
      },
    },
  },
});
