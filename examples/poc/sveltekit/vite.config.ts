import { localHttps } from "@shopify/hydrogen/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const enabled = process.env.VITE_LOCAL_HTTPS === "1";
const certDir = new URL("../../../.cert/", import.meta.url);
const httpsOptions = {
  enabled,
  certPath: new URL("localtest.me.pem", certDir),
  keyPath: new URL("localtest.me-key.pem", certDir),
};

export default defineConfig({
  plugins: [localHttps(httpsOptions), tailwindcss(), sveltekit()],
});
