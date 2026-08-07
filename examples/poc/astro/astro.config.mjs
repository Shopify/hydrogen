import node from "@astrojs/node";
import { LOCAL_HTTPS_DEFAULTS, localHttps } from "@shopify/hydrogen/vite";
import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { defineConfig } from "astro/config";

const enabled = process.env.VITE_LOCAL_HTTPS === "1";
const certDir = new URL("../../../.cert/", import.meta.url);
const httpsOptions = {
  enabled,
  certPath: new URL("localtest.me.pem", certDir),
  keyPath: new URL("localtest.me-key.pem", certDir),
};

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  server: enabled
    ? { host: LOCAL_HTTPS_DEFAULTS.host, port: LOCAL_HTTPS_DEFAULTS.port }
    : undefined,
  vite: {
    plugins: [localHttps(httpsOptions), tailwindcss()],
    resolve: {
      alias: {
        "@shared": new URL("../../shared", import.meta.url).pathname,
      },
    },
  },
});
