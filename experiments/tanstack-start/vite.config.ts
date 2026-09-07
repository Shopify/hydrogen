import { localHttps } from "@shopify/hydrogen/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const enabled =
  process.env.VITE_LOCAL_HTTPS === "1" || process.env.npm_lifecycle_event === "dev:https";
const httpsOptions = { enabled };

export default defineConfig({
  // TanStack Start's plugin must run before React's.
  plugins: [localHttps(httpsOptions), tailwindcss(), tanstackStart(), viteReact()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    allowedHosts: [".tryhydrogen.dev"],
  },
});
