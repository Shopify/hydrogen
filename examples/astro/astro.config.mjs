import node from "@astrojs/node";
import { getShopifyCspDirectives, getShopifyScriptHashes } from "@shopify/hydrogen";
import { LOCAL_HTTPS_DEFAULTS, localHttps } from "@shopify/hydrogen/vite";
import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { defineConfig } from "astro/config";

import { storefrontConfig } from "../shared/config.ts";

const {
  scriptSrc,
  // Astro has no script-src-attr option; its strict script-src also blocks inline handlers.
  scriptSrcAttr: _scriptSrcAttr,
  styleSrc,
  ...shopifyDirectives
} = getShopifyCspDirectives({ storeDomain: storefrontConfig.storeDomain });

const enabled = process.env.npm_lifecycle_event === "dev:https";
const httpsOptions = { enabled };

export default defineConfig({
  output: "server",
  security: {
    csp: {
      scriptDirective: {
        resources: scriptSrc,
        // Astro adds the CSP quotes around hash sources.
        hashes: getShopifyScriptHashes({ quoted: false }),
      },
      styleDirective: { resources: [...styleSrc, "https://fonts.googleapis.com"] },
      directives: Object.entries({
        ...shopifyDirectives,
        fontSrc: [...shopifyDirectives.fontSrc, "https://fonts.gstatic.com"],
      }).map(
        ([name, sources]) =>
          `${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} ${sources.join(" ")}`,
      ),
    },
  },
  adapter: node({ mode: "standalone" }),
  server: enabled
    ? { host: LOCAL_HTTPS_DEFAULTS.host, port: LOCAL_HTTPS_DEFAULTS.port }
    : undefined,
  vite: {
    plugins: [localHttps(httpsOptions), tailwindcss()],
    resolve: {
      alias: {
        "@shared": new URL("../shared", import.meta.url).pathname,
      },
    },
  },
});
