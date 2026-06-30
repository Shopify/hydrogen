import { defineConfig, type UserConfig } from "tsdown";

import pkg from "./package.json" with { type: "json" };
import { inlineScriptImports } from "./plugins/inline-shopify-analytics-bus.ts";
import { minifyGraphQLLiterals } from "./plugins/minify-graphql-literals.ts";

const plugins = [minifyGraphQLLiterals(), inlineScriptImports({ version: pkg.version })];

// In `--watch` mode (the `dev` script) skip tsdown's default `dist` clean.
// turbo runs the one-shot `build` first (via `^build`), so `dist` is already
// populated; if the watch then wipes it on startup, every example bundler
// reading `@shopify/hydrogen` through the workspace symlink momentarily
// resolves a missing module ("Can't resolve '@shopify/hydrogen'"). Rolldown
// writes each output atomically, so leaving the directory in place lets readers
// always see a complete build. Production builds (no `--watch`) still clean.
const clean = !process.argv.includes("--watch");

const configs: UserConfig[] = [
  {
    entry: [
      "src/core/index.ts",
      "src/customer-account/index.ts",
      "src/react/index.ts",
      "src/vue/index.ts",
    ],
    format: "esm",
    dts: true,
    hash: false,
    minify: false,
    sourcemap: true,
    unbundle: true,
    root: "src",
    define: {
      __HYDROGEN_VERSION__: JSON.stringify(pkg.version),
      __DEV__: "false",
    },
    plugins,
    deps: { neverBundle: ["gql.tada", "react", "vue"] },
  },
  {
    entry: ["src/core/development.ts", "src/react/index.ts", "src/vue/index.ts"],
    format: "esm",
    outDir: "dist/development",
    dts: true,
    hash: false,
    minify: false,
    sourcemap: true,
    unbundle: true,
    root: "src",
    define: {
      __HYDROGEN_VERSION__: JSON.stringify(pkg.version),
      __DEV__: "true",
    },
    plugins,
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
    plugins,
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
];

export default defineConfig(configs.map((config) => ({ clean, ...config })));
