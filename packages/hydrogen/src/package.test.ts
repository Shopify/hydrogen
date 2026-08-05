import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import packageJson from "../package.json" with { type: "json" };

const PACKAGE_ROOT = resolve(import.meta.dirname, "..");
const TS_PLUGIN_EXPORT_PATH = "./ts-plugin";
const STANDARD_EVENTS_SCRIPT_URL = "https://cdn.shopify.com/storefront/standard-events.js";
const STANDARD_EVENTS_INSPECTOR_ID = "shopify-standard-events-inspector";
const COPY_GENERATED_GRAPHQL_ASSETS_SCRIPT_PATH = resolve(
  PACKAGE_ROOT,
  "scripts/copy-generated-graphql-assets.ts",
);

const GENERATED_GRAPHQL_EXPORTS = [
  "./customer-account-api-types",
  "./customer-account.schema.json",
  "./storefront-api-types",
  "./storefront.schema.json",
] as const;

const BROWSER_ENTRY_DECLARATIONS = [
  "dist/core/index.d.mts",
  "dist/react/index.d.mts",
  "dist/vue/index.d.mts",
] as const;

const FRAMEWORK_BROWSER_ENTRY_DECLARATIONS = [
  "dist/react/index.d.mts",
  "dist/vue/index.d.mts",
] as const;

const PUBLIC_ENTRY_DECLARATIONS = [
  ...BROWSER_ENTRY_DECLARATIONS,
  "dist/customer-account/index.d.mts",
] as const;

describe("package metadata", () => {
  it("ships a CLI wrapper that exists before the package is built", () => {
    expect(packageJson.bin.hydrogen).toBe("./bin/hydrogen.mjs");
    expect(existsSync(resolve(PACKAGE_ROOT, packageJson.bin.hydrogen))).toBe(true);
  });

  it("exports package metadata", () => {
    expect(packageJson.exports["./package.json"]).toBe("./package.json");
  });

  it("exports copied generated GraphQL assets from dist", () => {
    execFileSync(process.execPath, [COPY_GENERATED_GRAPHQL_ASSETS_SCRIPT_PATH]);

    for (const exportPath of GENERATED_GRAPHQL_EXPORTS) {
      const exportTarget = packageJson.exports[exportPath];

      expect(exportTarget).toMatch(/^\.\/dist\//);
      expect(existsSync(resolve(PACKAGE_ROOT, exportTarget))).toBe(true);
    }
  });

  it("does not ship generated GraphQL assets from src", () => {
    expect(packageJson.files).not.toContain("src/graphql/generated");
  });

  it("exports a loadable TypeScript plugin", () => {
    const exportTarget = packageJson.exports[TS_PLUGIN_EXPORT_PATH];
    expect(exportTarget).toEqual({
      types: "./dist/ts-plugin/index.d.cts",
      require: "./dist/ts-plugin/index.cjs",
      default: "./dist/ts-plugin/index.cjs",
    });
    expect(existsSync(resolve(PACKAGE_ROOT, exportTarget.types))).toBe(true);
    expect(existsSync(resolve(PACKAGE_ROOT, exportTarget.require))).toBe(true);

    execFileSync(
      process.execPath,
      [
        "-e",
        `const plugin = require("@shopify/hydrogen/ts-plugin");
const typescript = require("typescript/lib/tsserverlibrary");
if (typeof plugin !== "function" || typeof plugin({typescript}).create !== "function") throw new Error("Invalid TypeScript plugin export");`,
      ],
      { cwd: PACKAGE_ROOT },
    );
  });

  it("centralizes Shopify globals in global types", () => {
    const declaration = readFileSync(resolve(PACKAGE_ROOT, "dist/globals.d.mts"), "utf8");

    expect("./globals" in packageJson.exports).toBe(false);
    expect(declaration).toContain("ShopifyStandardActions");
    expect(declaration).toContain("actions: ShopifyStandardActions;");
    expect(declaration).toContain("analytics?: StorefrontAnalytics;");
    expect(declaration).toContain("currency?: {");
    expect(declaration).toContain("active: string;");
    expect(declaration).toContain("customerPrivacy: {");
    expect(declaration).toContain("routes: {");
    expect(declaration).toContain("root: string;");
    expect(declaration).toContain("type ShopifyGlobal = {");
    expect(declaration).toContain("Shopify?: ShopifyGlobal;");
    expect(declaration).toContain("export { ShopifyGlobal };");
    expect(declaration).not.toContain("headless:");
    expect(declaration).not.toContain("interface Shopify");
    expect(declaration).not.toContain("__DEV__");
    expect(declaration).not.toContain("__HYDROGEN_VERSION__");
    expect(declaration).not.toContain("type ShopifyCustomerPrivacyApi");
    expect(declaration).not.toContain("type ShopifyHeadlessGlobal");
    expect(declaration).not.toContain("type ShopifyRoutesGlobal");
  });

  it("does not duplicate Shopify globals in standard actions types", () => {
    const declaration = readFileSync(
      resolve(PACKAGE_ROOT, "dist/vendor/standard-actions.d.mts"),
      "utf8",
    );

    expect(declaration).not.toContain("interface Shopify");
  });

  it("exports ShopifyGlobal from public browser entry types", () => {
    for (const declarationPath of BROWSER_ENTRY_DECLARATIONS) {
      const declaration = readFileSync(resolve(PACKAGE_ROOT, declarationPath), "utf8");

      expect(declaration).toContain('from "../globals.mjs"');
      expect(declaration).toContain("type ShopifyGlobal");
      expect(declaration).not.toMatch(/\btype Shopify\s*=/);
      expect(declaration).not.toContain("type ShopifyCustomerPrivacyApi");
      expect(declaration).not.toContain("type ShopifyHeadlessGlobal");
      expect(declaration).not.toContain("type ShopifyRoutesGlobal");
    }
  });

  it("exports Shopify script helpers from public browser entry types", () => {
    const coreDeclaration = readFileSync(resolve(PACKAGE_ROOT, "dist/core/index.d.mts"), "utf8");

    expect(coreDeclaration).toContain("./shopify-scripts/");
    expect(coreDeclaration).toContain("getShopifyScriptTags");
    expect(coreDeclaration).toContain("initializeShopifyScripts");
    expect(coreDeclaration).toContain("renderShopifyScriptTags");
    expect(coreDeclaration).not.toContain("initializeDeprecatedCookies");
    expect(coreDeclaration).not.toContain("loadShopifyWebMcpTools");
    expect(coreDeclaration).not.toContain("setShopifyRouting");

    for (const declarationPath of FRAMEWORK_BROWSER_ENTRY_DECLARATIONS) {
      const declaration = readFileSync(resolve(PACKAGE_ROOT, declarationPath), "utf8");

      expect(declaration).toContain("shopify-scripts.mjs");
      expect(declaration).toContain("ShopifyScripts");
    }
  });

  it("does not expose internal build constants in public entry types", () => {
    for (const declarationPath of PUBLIC_ENTRY_DECLARATIONS) {
      const declaration = readFileSync(resolve(PACKAGE_ROOT, declarationPath), "utf8");

      expect(declaration).not.toContain("__DEV__");
      expect(declaration).not.toContain("__HYDROGEN_VERSION__");
    }
  });

  it("only includes the standard events inspector in the development build", () => {
    const productionShopifyScripts = readFileSync(
      resolve(PACKAGE_ROOT, "dist/core/shopify-scripts/index.mjs"),
      "utf8",
    );
    const developmentShopifyScripts = readFileSync(
      resolve(PACKAGE_ROOT, "dist/development/core/shopify-scripts/index.mjs"),
      "utf8",
    );

    expect(productionShopifyScripts).not.toContain(STANDARD_EVENTS_INSPECTOR_ID);
    expect(developmentShopifyScripts).toContain(STANDARD_EVENTS_INSPECTOR_ID);
  });

  it("only includes the products JSON proxy in the development build", () => {
    expect(existsSync(resolve(PACKAGE_ROOT, "dist/core/interceptors/products-json.mjs"))).toBe(
      false,
    );
    expect(
      existsSync(resolve(PACKAGE_ROOT, "dist/development/core/interceptors/products-json.mjs")),
    ).toBe(true);
  });

  it("preserves the standard events URL as a literal dynamic import", () => {
    const pageViewScript = readFileSync(
      resolve(PACKAGE_ROOT, "dist/core/shopify-scripts/page-view.mjs"),
      "utf8",
    );

    expect(pageViewScript).toContain(`import("${STANDARD_EVENTS_SCRIPT_URL}")`);
  });
});
