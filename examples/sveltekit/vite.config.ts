import { localHttps } from "@shopify/hydrogen/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const enabled = process.env.npm_lifecycle_event === "dev:https";
const httpsOptions = { enabled };

export default defineConfig({
  plugins: [localHttps(httpsOptions), tailwindcss(), sveltekit()],
});
