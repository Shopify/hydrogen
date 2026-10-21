import { localHttps } from "@shopify/hydrogen/vite";
import { oxygen } from "@shopify/mini-oxygen/vite";
import { defineConfig } from "vite";

import { remixOxygen } from "./vite/remix-oxygen.ts";

export default defineConfig({
  plugins: [
    localHttps({ enabled: process.env.npm_lifecycle_event === "dev:https" }),
    // MiniOxygen runs the Worker entry for `vite dev` and `vite preview`.
    oxygen({ entry: "./app/entry.server.ts" }),
    // MiniOxygen infers the compatibility date 2026-10-01 from Hydrogen 2026.10.x, but its
    // runtime doesn't support that date yet. Remove this override once it does.
    remixOxygen({ compatibilityDate: "2026-04-01" }),
  ],
  optimizeDeps: {
    // Linked workspace packages aren't pre-bundled by default. Pre-bundling Hydrogen keeps
    // `vite dev` from loading its browser modules as ~100 separate requests.
    include: ["@shopify/hydrogen"],
  },
  server: {
    allowedHosts: [".tryhydrogen.dev", ".trycloudflare.com"],
  },
});
