import { defineConfig } from "tsdown";

import pkg from "./package.json" with { type: "json" };

export default defineConfig([
  {
    entry: ["src/core/index.ts"],
    format: "esm",
    dts: true,
    hash: false,
    minify: false,
    sourcemap: true,
    define: {
      __HYDROGEN_VERSION__: JSON.stringify(pkg.version),
      __DEV__: "false",
    },
    deps: { neverBundle: ["gql.tada", "@shopify/hydrogen/cdn"] },
  },
  {
    entry: ["src/core/development.ts"],
    format: "esm",
    dts: true,
    hash: false,
    minify: false,
    sourcemap: true,
    define: {
      __HYDROGEN_VERSION__: JSON.stringify(pkg.version),
      __DEV__: "true",
    },
    deps: { neverBundle: ["gql.tada", "@shopify/hydrogen/cdn"] },
  },
  {
    entry: { react: "src/react/index.ts" },
    format: "esm",
    dts: true,
    hash: false,
    minify: false,
    sourcemap: true,
    deps: {
      neverBundle: ["react"],
    },
    define: {
      __HYDROGEN_VERSION__: JSON.stringify(pkg.version),
      __DEV__: "false",
    },
  },
  {
    entry: { "react/development": "src/react/index.ts" },
    format: "esm",
    dts: true,
    hash: false,
    minify: false,
    sourcemap: true,
    deps: {
      neverBundle: ["react"],
    },
    define: {
      __HYDROGEN_VERSION__: JSON.stringify(pkg.version),
      __DEV__: "true",
    },
  },
  {
    entry: { vue: "src/vue/index.ts" },
    format: "esm",
    dts: true,
    hash: false,
    minify: false,
    sourcemap: true,
    deps: {
      neverBundle: ["vue"],
    },
    define: {
      __HYDROGEN_VERSION__: JSON.stringify(pkg.version),
      __DEV__: "false",
    },
  },
  {
    entry: { "vue/development": "src/vue/index.ts" },
    format: "esm",
    dts: true,
    hash: false,
    minify: false,
    sourcemap: true,
    deps: {
      neverBundle: ["vue"],
    },
    define: {
      __HYDROGEN_VERSION__: JSON.stringify(pkg.version),
      __DEV__: "true",
    },
  },
  // CLI binary — referenced via the `bin` field in package.json, not in `exports`.
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: "esm",
    dts: false,
    hash: false,
    minify: false,
    sourcemap: false,
  },
  // CDN analytics bootstrap — ESM module dynamically imported by bus.ts.
  // The consumer's bundler code-splits this into a lazy-loaded chunk.
  {
    entry: { "cdn/bootstrap": "src/core/analytics/cdn/bootstrap.ts" },
    format: "esm",
    dts: true,
    hash: false,
    minify: false,
    sourcemap: true,
    define: {
      __STOREFRONT_KIT_VERSION__: JSON.stringify(pkg.version),
      __DEV__: "false",
    },
  },
  // CDN analytics IIFE — self-contained script loaded via <script> tag.
  // Kept for future cdn.shopify.com deployment.
  {
    entry: { "cdn/shopify-analytics": "src/core/analytics/cdn/entry.ts" },
    format: "iife",
    dts: false,
    hash: false,
    minify: true,
    sourcemap: true,
    define: {
      __STOREFRONT_KIT_VERSION__: JSON.stringify(pkg.version),
      __DEV__: "false",
    },
  },
]);
