import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { localCdnAssets } from "../shared/local-cdn-assets-plugin/vite";
import { localHttpsPlugin, localHttpsServerConfig } from "../shared/local-https-vite";

export default defineConfig({
  plugins: [localCdnAssets(), localHttpsPlugin(), tailwindcss(), sveltekit()],
  server: localHttpsServerConfig(),
});
