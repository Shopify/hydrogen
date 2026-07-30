import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

import { localHttpsPlugin, localHttpsServerConfig } from "../shared/local-https-vite";

export default defineConfig({
  plugins: [localHttpsPlugin(), tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: localHttpsServerConfig(),
});
