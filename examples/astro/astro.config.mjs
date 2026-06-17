import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone", entrypointResolution: "auto" }),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@shared": new URL("../shared", import.meta.url).pathname,
      },
    },
  },
});
