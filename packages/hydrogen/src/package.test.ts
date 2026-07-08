import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import packageJson from "../package.json" with { type: "json" };

const PACKAGE_ROOT = resolve(import.meta.dirname, "..");
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

const BROWSER_ENTRY_DECLARATIONS = ["dist/core/index.d.mts", "dist/react/index.d.mts"] as const;

const FRAMEWORK_BROWSER_ENTRY_DECLARATIONS = ["dist/react/index.d.mts"] as const;

const PUBLIC_ENTRY_DECLARATIONS = [
  ...BROWSER_ENTRY_DECLARATIONS,
  "dist/customer-account/index.d.mts",
] as const;

describe("package metadata", () => {
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

  it("centralizes Shopify globals in global types", () => {
    const declaration = readFileSync(resolve(PACKAGE_ROOT, "dist/globals.d.mts"), "utf8");

    expect("./globals" in packageJson.exports).toBe(false);
    expect(declaration).toContain("ShopifyStandardActions");
    expect(declaration).toContain("actions: ShopifyStandardActions;");
    expect(declaration).toContain("analytics?: StorefrontAnalytics;");
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
    expect(coreDeclaration).toContain("renderShopifyScriptTags");

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
});
