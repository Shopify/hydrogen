import { localHttps } from "@shopify/hydrogen/vite";
import tailwindcss from "@tailwindcss/vite";
import type { NuxtConfig } from "nuxt/schema";

type VitePlugin = NonNullable<NonNullable<NuxtConfig["vite"]>["plugins"]>[number];

const enabled =
  process.env.VITE_LOCAL_HTTPS === "1" || process.env.npm_lifecycle_event === "https:dev";
const httpsOptions = { enabled };
const httpsPlugin = localHttps(httpsOptions);

export default defineNuxtConfig({
  compatibilityDate: "2025-05-08",
  devServer: httpsPlugin.api.getDevServerConfig(),
  alias: {
    "@shared": new URL("../shared", import.meta.url).pathname,
  },
  imports: {
    scan: false,
  },
  modules: ["@nuxt/fonts"],
  fonts: {
    families: [{ name: "Inter", provider: "google", weights: [400, 500, 600, 700, 800, 900] }],
  },
  css: ["~/assets/css/main.css"],
  ssr: true,
  vite: {
    plugins: [httpsPlugin as VitePlugin, tailwindcss() as VitePlugin],
  },
});
