import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __DEV__: "true",
    __HYDROGEN_VERSION__: JSON.stringify("0.0.0-test"),
  },
  resolve: {
    alias: {
      "@shopify/hydrogen/cdn": new URL("./src/core/analytics/cdn/bootstrap.ts", import.meta.url)
        .pathname,
    },
  },
  test: {
    globals: true,
    environment: "node",
    typecheck: {
      enabled: true,
      include: ["src/**/*.type-test.ts"],
    },
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.type-test.ts"],
  },
});
