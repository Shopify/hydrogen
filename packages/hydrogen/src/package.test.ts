import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import packageJson from "../package.json" with { type: "json" };
import { assert } from "./core/test-utils";

const require = createRequire(import.meta.url);
const PACKAGE_ROOT = resolve(import.meta.dirname, "..");
const TS_PLUGIN_EXPORT_PATH = "./ts-plugin";
// pack + tar + spawn on a cold CI runner can exceed vitest's 5s default.
const TS_PLUGIN_PACK_TIMEOUT_MS = 30_000;
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

  it(
    "is loadable by tsserver's plugin resolver from the packed tarball",
    () => {
      // tsserver resolves `compilerOptions.plugins` with TypeScript's legacy JS
      // resolver, which ignores package `exports`. Node's `require.resolve` would
      // pass even when editors cannot load the plugin, and workspace symlinks can
      // hide files missing from the published tarball.
      const tempDir = mkdtempSync(join(tmpdir(), "hydrogen-ts-plugin-"));
      const consumerNodeModules = join(tempDir, "node_modules");

      try {
        const packOutput = execFileSync("pnpm", ["pack", "--json", "--pack-destination", tempDir], {
          cwd: PACKAGE_ROOT,
          encoding: "utf8",
        });
        const packResult: unknown = JSON.parse(packOutput);
        const tarballPath =
          typeof packResult === "object" &&
          packResult !== null &&
          "filename" in packResult &&
          typeof packResult.filename === "string"
            ? packResult.filename
            : undefined;
        assert(tarballPath, "pnpm pack --json did not report a tarball filename");

        const installedPackageDir = join(consumerNodeModules, "@shopify/hydrogen");
        mkdirSync(installedPackageDir, { recursive: true });
        execFileSync("tar", [
          "-xzf",
          tarballPath,
          "--strip-components=1",
          "-C",
          installedPackageDir,
        ]);

        // `gql.tada` is a runtime dependency; a real install places it next to
        // the package. Symlink it in so the child never leans on the pnpm-provided
        // NODE_PATH that vitest inherits.
        const gqlTadaDir = dirname(require.resolve("gql.tada/package.json"));
        symlinkSync(gqlTadaDir, join(consumerNodeModules, "gql.tada"), "dir");

        execFileSync(
          process.execPath,
          [
            "-e",
            `const typescript = require("typescript/lib/tsserverlibrary");
const result = typescript.sys.require(process.argv[1], "@shopify/hydrogen/ts-plugin");
if (result.error) throw result.error;
if (typeof result.module !== "function" || typeof result.module({typescript}).create !== "function") throw new Error("Invalid TypeScript plugin export");`,
            consumerNodeModules,
          ],
          {
            // cwd only affects the inline script's own `require("typescript/...")`.
            cwd: PACKAGE_ROOT,
            env: { ...process.env, NODE_PATH: undefined },
          },
        );
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    },
    TS_PLUGIN_PACK_TIMEOUT_MS,
  );

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
    expect(declaration).toMatch(/\/\*\* @internal \*\/\s+apiProxyPrefix\?:/);
    expect(declaration).toMatch(/\/\*\* @internal \*\/\s+match\?:/);
    expect(declaration).toMatch(/\/\*\* @internal \*\/\s+resolve\?:/);
    expect(declaration).toMatch(/\/\*\* @internal \*\/\s+navigate\?:/);
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
    expect(coreDeclaration).toContain("./account-widget/");
    expect(coreDeclaration).toContain("renderShopifyAccountWidget");
    expect(coreDeclaration).toContain("ShopifyAccountWidgetOptions");
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

  it("preserves the standard events URL as a literal dynamic import", () => {
    const pageViewScript = readFileSync(
      resolve(PACKAGE_ROOT, "dist/core/shopify-scripts/page-view.mjs"),
      "utf8",
    );

    expect(pageViewScript).toContain(`import("${STANDARD_EVENTS_SCRIPT_URL}")`);
  });
});
