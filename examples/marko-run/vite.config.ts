import marko from "@marko/run/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), marko()],
  resolve: {
    alias: {
      "@shared": new URL("../shared", import.meta.url).pathname,
    },
  },
});
