import { defineConfig } from "vitest/config";

import { inlineScriptImports } from "./plugins/inline-shopify-analytics-bus.ts";

export default defineConfig({
  define: {
    __DEV__: "true",
    __HYDROGEN_VERSION__: JSON.stringify("0.0.0-test"),
  },
  plugins: [inlineScriptImports({ version: "0.0.0-test" })],
  test: {
    globals: true,
    environment: "node",
    typecheck: {
      enabled: true,
      include: ["src/**/*.type-test.ts"],
    },
    include: [
      "plugins/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.type-test.ts",
    ],
  },
});
