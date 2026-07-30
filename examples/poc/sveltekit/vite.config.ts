import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { localHttpsPlugin, localHttpsServerConfig } from "../../shared/local-https-vite";

export default defineConfig({
  plugins: [localHttpsPlugin(), tailwindcss(), sveltekit()],
  server: localHttpsServerConfig(),
});
