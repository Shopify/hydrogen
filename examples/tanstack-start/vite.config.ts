import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

import { localCdnAssets } from "../shared/local-cdn-assets-plugin/vite";
import { localHttpsPlugin, localHttpsServerConfig } from "../shared/local-https-vite";

export default defineConfig({
  plugins: [
    localCdnAssets(),
    localHttpsPlugin(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "./app",
      router: {
        routesDirectory: ".",
        generatedRouteTree: "./routeTree.gen.ts",
        virtualRouteConfig: "./app/routes.ts",
        quoteStyle: "double",
        semicolons: true,
      },
    }),
    nitro(),
    viteReact(),
  ],
  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom"],
  },
  server: localHttpsServerConfig(),
});
