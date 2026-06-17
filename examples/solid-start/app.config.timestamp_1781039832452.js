// app.config.ts
import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";
var app_config_default = defineConfig({
  middleware: "src/middleware.ts",
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@shared": new URL("../shared", import.meta.url).pathname,
      },
    },
  },
});
export { app_config_default as default };
