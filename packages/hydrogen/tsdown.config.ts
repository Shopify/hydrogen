import { defineConfig } from "tsdown";

import pkg from "./package.json" with { type: "json" };
import { inlineScriptImports } from "./plugins/inline-shopify-analytics-bus.ts";
import { minifyGraphQLLiterals } from "./plugins/minify-graphql-literals.ts";

const plugins = () => [minifyGraphQLLiterals(), inlineScriptImports({ version: pkg.version })];

// Declarations are emitted by the native TypeScript 7 compiler instead of the in-process
// TypeScript 5 compiler. gql.tada's inferred document types made the in-process emit need
// ~2.5 GB of JS heap, which out-grew CI runners; the native compiler runs outside the V8 heap.
// `tsgo` comes from `@typescript/native-preview` rather than `typescript@7`, whose `tsc` bin would
// shadow the TypeScript 5 `tsc` that `typecheck` and `test:types` run.
const dts = { tsgo: true };

export default defineConfig([
  {
    entry: [
      "src/core/index.ts",
      "src/customer-account/index.ts",
      "src/react/index.ts",
      "src/vite/index.ts",
      "src/vue/index.ts",
    ],
    format: "esm",
    dts,
    hash: false,
    minify: false,
    sourcemap: true,
    unbundle: true,
    root: "src",
    define: {
      __HYDROGEN_VERSION__: JSON.stringify(pkg.version),
      __DEV__: "false",
    },
    plugins: plugins(),
    deps: { neverBundle: ["gql.tada", "react", "vue"] },
  },
  {
    entry: ["src/core/development.ts", "src/react/index.ts", "src/vue/index.ts"],
    format: "esm",
    outDir: "dist/development",
    dts,
    hash: false,
    minify: false,
    sourcemap: true,
    unbundle: true,
    root: "src",
    define: {
      __HYDROGEN_VERSION__: JSON.stringify(pkg.version),
      __DEV__: "true",
    },
    plugins: plugins(),
    deps: { neverBundle: ["gql.tada", "react", "vue"] },
  },
  // CLI binary — referenced via the `bin` field in package.json, not in `exports`.
  {
    entry: { "cli/index": "src/cli/index.ts" },
    format: "esm",
    dts: false,
    hash: false,
    minify: false,
    sourcemap: false,
    plugins: plugins(),
  },
  {
    entry: { "ts-plugin/index": "src/ts-plugin/index.ts" },
    format: "cjs",
    dts: false,
    hash: false,
    minify: false,
    sourcemap: true,
    cjsDefault: true,
    deps: { neverBundle: [/^gql\.tada(?:\/.*)?$/] },
  },
]);
