import { reactRouter } from "@react-router/dev/vite";
import { oxygen } from "@shopify/mini-oxygen/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), oxygen(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    assetsInlineLimit: 0,
  },
  ssr: {
    optimizeDeps: {
      include: [
        "react",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom",
        "react-dom/server",
        "react-router > set-cookie-parser",
        "react-router > cookie",
        "react-router",
      ],
    },
  },
  server: {
    allowedHosts: [".tryhydrogen.dev"],
  },
});
