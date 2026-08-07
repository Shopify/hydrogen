import { getShopifyScriptTags } from "@shopify/hydrogen";
import { localHttps, localHttpsDevServer } from "@shopify/hydrogen/vite";
import tailwindcss from "@tailwindcss/vite";
import type { NuxtConfig } from "nuxt/schema";

import { analyticsConsent, defaultI18n, shop } from "../../shared/config";

type VitePlugin = NonNullable<NonNullable<NuxtConfig["vite"]>["plugins"]>[number];
type AppHead = NonNullable<NonNullable<NuxtConfig["app"]>["head"]>;
type HeadLink = NonNullable<AppHead["link"]>[number];
type HeadScript = NonNullable<AppHead["script"]>[number];

const shopifyScriptTags = getShopifyScriptTags({
  consent: analyticsConsent,
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

const enabled = process.env.VITE_LOCAL_HTTPS === "1";
const certDir = new URL("../../../.cert/", import.meta.url);
const httpsOptions = {
  enabled,
  certPath: new URL("localtest.me.pem", certDir),
  keyPath: new URL("localtest.me-key.pem", certDir),
};

export default defineNuxtConfig({
  compatibilityDate: "2025-05-08",
  devServer: localHttpsDevServer(httpsOptions),
  alias: {
    "@shared": new URL("../../shared", import.meta.url).pathname,
  },
  imports: {
    scan: false,
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
    plugins: [localHttps(httpsOptions) as VitePlugin, tailwindcss() as VitePlugin],
  },
});
