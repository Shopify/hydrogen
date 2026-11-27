import { defineConfig } from "vitest/config";

import { inlineScriptImports } from "./plugins/inline-shopify-analytics-bus.ts";

export default defineConfig({
  define: {
    __DEV__: "true",
    // Hash generation is verified by the plugin build tests.
    __SCRIPT_HASHES__: "[]",
    __HYDROGEN_VERSION__: JSON.stringify("0.0.0-test"),
  },
  plugins: [inlineScriptImports({ version: "0.0.0-test" })],
  test: {
    globals: true,
    environment: "node",
    poolOptions: {
      forks: {
        // Node 25+ defines its own `localStorage` global, which is undefined without
        // --localstorage-file. Vitest 3 won't overwrite a global that already exists,
        // so it hides happy-dom's Storage. Fixed upstream in Vitest 5.
        execArgv: ["--no-experimental-webstorage"],
      },
    },
    typecheck: {
      enabled: true,
      include: ["src/**/*.type-test.ts", "src/**/*.type-test.tsx"],
    },
    include: [
      "plugins/**/*.test.ts",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.type-test.ts",
      "src/**/*.type-test.tsx",
    ],
  },
});
