import { getShopifyCspDirectives, getShopifyScriptHashes } from "@shopify/hydrogen";
import adapter from "@sveltejs/adapter-node";

import { storefrontConfig } from "../shared/config.ts";

const shopifyDirectives = getShopifyCspDirectives({ storeDomain: storefrontConfig.storeDomain });
// SvelteKit quotes CSP keywords and hashes itself.
const unquote = (source) => source.replace(/^'|'$/g, "");
const directives = Object.fromEntries(
  Object.entries({
    ...shopifyDirectives,
    scriptSrc: [...shopifyDirectives.scriptSrc, ...getShopifyScriptHashes()],
    styleSrc: [...shopifyDirectives.styleSrc, "https://fonts.googleapis.com"],
    fontSrc: [...shopifyDirectives.fontSrc, "https://fonts.gstatic.com"],
  }).map(([name, sources]) => [
    name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
    sources.map(unquote),
  ]),
);

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
    runes: ({ filename }) => (filename.split(/[/\\]/).includes("node_modules") ? undefined : true),
  },
  kit: {
    csp: { mode: "hash", directives },
    alias: {
      "@shared": "../shared",
    },
    adapter: adapter(),
  },
};

export default config;
