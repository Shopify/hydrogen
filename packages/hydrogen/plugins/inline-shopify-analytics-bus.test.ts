import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { build } from "tsdown";
import { expect, it } from "vitest";

import type { ShopifyScriptTagDescriptor } from "../src/core/shopify-scripts/types";
import { inlineScriptImports } from "./inline-shopify-analytics-bus";

it.each(["shopifyScriptHashes", "initializeShopifyScripts"])(
  "does not bundle inline bootstrap bodies when importing only %s",
  async (exportName) => {
    const core = fileURLToPath(new URL("../src/core/index.ts", import.meta.url));
    const bundles = await bundle(`export { ${exportName} } from ${JSON.stringify(core)};`);
    const code = bundles
      .flatMap(({ chunks }) => chunks)
      .filter((chunk) => chunk.type === "chunk")
      .map((chunk) => chunk.code)
      .join("\n");

    expect(code).toContain(exportName);
    expect(code).not.toContain("__SHOPIFY_SCRIPT_DATA__");
    expect(code).not.toContain("__SCRIPT_HASHES__");
    expect(code).not.toContain("document.currentScript");
    if (exportName === "shopifyScriptHashes") {
      expect(code).toContain("sha256-");
      expect(code).not.toContain("decodeURIComponent");
    }
  },
);

it("collects and deduplicates hashes from asInlineScript calls without hash imports", async () => {
  const scriptPath = fileURLToPath(
    new URL("../src/core/shopify-scripts/global-script.ts", import.meta.url),
  );
  const helperPath = fileURLToPath(
    new URL("../src/core/shopify-scripts/utils/inline-script.ts", import.meta.url),
  );
  const bundles = await bundle(`
    import script from ${JSON.stringify(scriptPath)} with { type: "script" };
    import { asInlineScript } from ${JSON.stringify(helperPath)};
    export const first = asInlineScript(script);
    export const second = asInlineScript(script);
    export const hashes = __SCRIPT_HASHES__;
  `);
  const code = bundles
    .flatMap(({ chunks }) => chunks)
    .filter((chunk) => chunk.type === "chunk")
    .map((chunk) => chunk.code)
    .join("\n");
  const { first, second, hashes } = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  );

  expect(first.code).toBe(second.code);
  expect(hashes).toEqual([`'sha256-${createHash("sha256").update(first.code).digest("base64")}'`]);
});

it("exports hashes matching every rendered bootstrap and applies them only when requested", async () => {
  const core = fileURLToPath(new URL("../src/core/index.ts", import.meta.url));
  const bundles = await bundle(`
    export { getShopifyScriptTags, shopifyScriptHashes, createContentSecurityPolicy } from ${JSON.stringify(core)};
  `);
  const code = bundles
    .flatMap(({ chunks }) => chunks)
    .filter((chunk) => chunk.type === "chunk")
    .map((chunk) => chunk.code)
    .join("\n");
  const { getShopifyScriptTags, shopifyScriptHashes, createContentSecurityPolicy } = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  );
  const { scripts }: { scripts: ShopifyScriptTagDescriptor[] } = getShopifyScriptTags({
    shop: { shopId: "42", storefrontId: "one", myshopifyDomain: "one.myshopify.com" },
  });
  const expectedHashes = scripts
    .flatMap((script) =>
      script.innerHTML === undefined
        ? []
        : [`'sha256-${createHash("sha256").update(script.innerHTML).digest("base64")}'`],
    )
    .toSorted();
  expect(expectedHashes).toHaveLength(2);
  expect(shopifyScriptHashes).toEqual(expectedHashes);

  const csp = createContentSecurityPolicy({
    nonce: false,
    directives: { scriptSrc: shopifyScriptHashes },
  });
  for (const hash of expectedHashes) expect(csp.header).toContain(hash);
  // Adding hashes to defaults would disable existing unsafe-inline policies.
  expect(createContentSecurityPolicy({ nonce: false }).header).not.toContain("sha256-");
});

async function bundle(source: string) {
  const entry = "\0inline-script-treeshaking-test";
  return build({
    config: false,
    entry: { test: entry },
    format: "esm",
    platform: "browser",
    write: false,
    clean: false,
    dts: false,
    sourcemap: false,
    define: { __DEV__: "false", __HYDROGEN_VERSION__: JSON.stringify("0.0.0-test") },
    plugins: [
      {
        name: "inline-script-treeshaking-test",
        resolveId(id) {
          if (id === entry) return entry;
        },
        load(id) {
          if (id === entry) return source;
        },
      },
      inlineScriptImports({ version: "0.0.0-test" }),
    ],
  });
}
