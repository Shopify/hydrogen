import { getShopifyScriptTags } from "@shopify/hydrogen";
import tailwindcss from "@tailwindcss/vite";
import type { NuxtConfig } from "nuxt/schema";

import { defaultI18n, shop } from "../shared/config";
import { localCdnAssets } from "../shared/local-cdn-assets-plugin/vite";
import {
  localHttpsDevServerConfig,
  localHttpsPlugin,
  localHttpsServerConfig,
} from "../shared/local-https-vite";

type VitePlugin = NonNullable<NonNullable<NuxtConfig["vite"]>["plugins"]>[number];
type AppHead = NonNullable<NonNullable<NuxtConfig["app"]>["head"]>;
type HeadLink = NonNullable<AppHead["link"]>[number];
type HeadScript = NonNullable<AppHead["script"]>[number];

const shopifyScriptTags = getShopifyScriptTags({
  i18n: defaultI18n,
  shop,
});
const shopifyHeadTags = {
  link: shopifyScriptTags.links.map(({ attributes }) => {
    return attributes as HeadLink;
  }),
  script: shopifyScriptTags.scripts.map(({ attributes, innerHTML }) => {
    return {
      ...attributes,
      ...(innerHTML ? { innerHTML } : {}),
    } as HeadScript;
  }),
};

const localHttpsServer = localHttpsServerConfig();
const localHttpsDevServer = localHttpsDevServerConfig();

export default defineNuxtConfig({
  compatibilityDate: "2025-05-08",
  devServer: localHttpsDevServer,
  alias: {
    "@shared": new URL("../shared", import.meta.url).pathname,
  },
  app: {
    head: {
      link: shopifyHeadTags.link,
      script: shopifyHeadTags.script,
    },
  },
  modules: ["@nuxt/fonts"],
  fonts: {
    families: [{ name: "Inter", provider: "google", weights: [400, 500, 600, 700, 800, 900] }],
  },
  css: ["~/assets/css/main.css"],
  ssr: true,
  vite: {
    plugins: [
      localCdnAssets() as VitePlugin,
      localHttpsPlugin() as VitePlugin,
      tailwindcss() as VitePlugin,
    ],
    server: localHttpsServer,
  },
});
