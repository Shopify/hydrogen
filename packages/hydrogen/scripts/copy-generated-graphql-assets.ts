import { copyFileSync, mkdirSync } from "node:fs";
import { basename, resolve } from "node:path";

const DIST_DIR = resolve(import.meta.dirname, "../dist");
const TS_PLUGIN_DIR = resolve(DIST_DIR, "ts-plugin");
const TS_PLUGIN_DECLARATION_PATH = resolve(import.meta.dirname, "../src/ts-plugin/index.d.cts");
const GENERATED_GRAPHQL_ASSET_PATHS = [
  resolve(import.meta.dirname, "../src/graphql/generated/customer-account-api-types.d.ts"),
  resolve(import.meta.dirname, "../src/graphql/generated/customer-account.schema.json"),
  resolve(import.meta.dirname, "../src/graphql/generated/storefront-api-types.d.ts"),
  resolve(import.meta.dirname, "../src/graphql/generated/storefront.schema.json"),
] as const;

mkdirSync(DIST_DIR, { recursive: true });

for (const sourcePath of GENERATED_GRAPHQL_ASSET_PATHS) {
  copyFileSync(sourcePath, resolve(DIST_DIR, basename(sourcePath)));
}

mkdirSync(TS_PLUGIN_DIR, { recursive: true });
copyFileSync(
  TS_PLUGIN_DECLARATION_PATH,
  resolve(TS_PLUGIN_DIR, basename(TS_PLUGIN_DECLARATION_PATH)),
);
