import tailwindcss from "@tailwindcss/vite";
import type { NuxtConfig } from "nuxt/schema";

type VitePlugin = NonNullable<NonNullable<NuxtConfig["vite"]>["plugins"]>[number];

export default defineNuxtConfig({
  compatibilityDate: "2025-05-08",
  alias: {
    "@shared": new URL("../shared", import.meta.url).pathname,
  },
  app: {
    head: {
      script: [
        {
          src: "https://cdn.shopify.com/storefront/standard-actions.js",
          type: "module",
          crossorigin: "anonymous",
        },
      ],
    },
  },
  modules: ["@nuxt/fonts"],
  fonts: {
    families: [{ name: "Inter", provider: "google", weights: [400, 500, 600, 700, 800, 900] }],
  },
  css: ["~/assets/css/main.css"],
  ssr: true,
  vite: {
    plugins: [tailwindcss() as VitePlugin],
  },
});
