import marko from "@marko/run/vite";
import { localHttps } from "@shopify/hydrogen/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const httpsEnabled = process.env.npm_lifecycle_event === "dev:https";

export default defineConfig({
  plugins: [localHttps({ enabled: httpsEnabled }), tailwindcss(), marko()],
  resolve: {
    alias: {
      "@shared": new URL("../shared", import.meta.url).pathname,
    },
  },
});
