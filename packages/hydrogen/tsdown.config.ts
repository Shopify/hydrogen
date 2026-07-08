import { defineConfig } from "tsdown";

import pkg from "./package.json" with { type: "json" };
import { minifyGraphQLLiterals } from "./plugins/minify-graphql-literals.ts";

const plugins = [minifyGraphQLLiterals()];

export default defineConfig([
  {
    entry: ["src/core/index.ts", "src/customer-account/index.ts", "src/react/index.ts"],
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
    deps: { neverBundle: ["gql.tada", "react"] },
  },
  {
    entry: ["src/core/development.ts", "src/react/index.ts"],
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
    deps: { neverBundle: ["gql.tada", "react"] },
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
]);
