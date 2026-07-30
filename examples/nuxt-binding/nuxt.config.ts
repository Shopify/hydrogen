import tailwindcss from "@tailwindcss/vite";
import type { NuxtConfig } from "nuxt/schema";

import {
  localHttpsDevServerConfig,
  localHttpsPlugin,
  localHttpsServerConfig,
} from "../shared/local-https-vite";

type VitePlugin = NonNullable<NonNullable<NuxtConfig["vite"]>["plugins"]>[number];

const localHttpsServer = localHttpsServerConfig();
const localHttpsDevServer = localHttpsDevServerConfig();

export default defineNuxtConfig({
  compatibilityDate: "2025-05-08",
  devServer: localHttpsDevServer,
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
    plugins: [localHttpsPlugin() as VitePlugin, tailwindcss() as VitePlugin],
    server: localHttpsServer,
  },
});
