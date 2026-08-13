import { localHttps, localHttpsDevServer } from "@shopify/hydrogen/vite";
import tailwindcss from "@tailwindcss/vite";
import type { NuxtConfig } from "nuxt/schema";

type VitePlugin = NonNullable<NonNullable<NuxtConfig["vite"]>["plugins"]>[number];

const enabled = process.env.VITE_LOCAL_HTTPS === "1";
const httpsOptions = { enabled };

export default defineNuxtConfig({
  compatibilityDate: "2025-05-08",
  devServer: localHttpsDevServer(httpsOptions),
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
    plugins: [localHttps(httpsOptions) as VitePlugin, tailwindcss() as VitePlugin],
  },
});
