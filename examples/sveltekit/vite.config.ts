import { localHttps } from "@shopify/hydrogen/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const enabled =
  process.env.VITE_LOCAL_HTTPS === "1" || process.env.npm_lifecycle_event === "https:dev";
const httpsOptions = { enabled };

export default defineConfig({
  plugins: [localHttps(httpsOptions), tailwindcss(), sveltekit()],
});
