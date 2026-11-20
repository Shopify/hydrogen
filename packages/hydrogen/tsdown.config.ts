import { resolve } from "node:path";

import { defineConfig } from "tsdown";

import pkg from "./package.json" with { type: "json" };
import {
  declarationsOnly,
  reexportProductionDeclarations,
} from "./plugins/development-declarations.ts";
import { inlineScriptImports } from "./plugins/inline-shopify-analytics-bus.ts";
import { minifyGraphQLLiterals } from "./plugins/minify-graphql-literals.ts";

const plugins = () => [minifyGraphQLLiterals(), inlineScriptImports({ version: pkg.version })];

const productionEntries = [
  "src/core/index.ts",
  "src/customer-account/index.ts",
  "src/react/index.ts",
  "src/vite/index.ts",
  "src/vue/index.ts",
];
const developmentEntries = ["src/core/development.ts", "src/react/index.ts", "src/vue/index.ts"];
const developmentOnlyEntries = developmentEntries.filter(
  (entry) => !productionEntries.includes(entry),
);
// tsdown resolves `entry` and `outDir` from this file's directory, so the
// plugins get absolute paths and the build does not depend on the cwd.
const fromPackage = (path: string) => resolve(import.meta.dirname, path);
const productionOutDir = fromPackage("dist");

export default defineConfig([
  {
    entry: [...productionEntries, ...developmentOnlyEntries],
    format: "esm",
    outDir: productionOutDir,
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
    plugins: [...plugins(), declarationsOnly(developmentOnlyEntries.map(fromPackage))],
    deps: { neverBundle: ["gql.tada", "react", "vue"] },
  },
  {
    entry: developmentEntries,
    format: "esm",
    outDir: "dist/development",
    dts: false,
    hash: false,
    minify: false,
    sourcemap: true,
    unbundle: true,
    root: "src",
    define: {
      __HYDROGEN_VERSION__: JSON.stringify(pkg.version),
      __DEV__: "true",
    },
    plugins: [...plugins(), reexportProductionDeclarations(productionOutDir)],
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
