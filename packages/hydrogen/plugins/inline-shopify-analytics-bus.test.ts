import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { build } from "tsdown";
import { expect, it } from "vitest";

import { inlineScriptImports } from "./inline-shopify-analytics-bus";

it.each([
  "getShopifyScriptHashes",
  "initializeShopifyScripts",
  "getShopifyCspDirectives",
  "createContentSecurityPolicy",
])("does not bundle inline bootstrap bodies when importing only %s", async (exportName) => {
  const core = fileURLToPath(new URL("../src/core/index.ts", import.meta.url));
  const bundles = await bundle(`export { ${exportName} } from ${JSON.stringify(core)};`);
  const code = bundles
    .flatMap(({ chunks }) => chunks)
    .filter((chunk) => chunk.type === "chunk")
    .map((chunk) => chunk.code)
    .join("\n");

  expect(code).toContain(exportName);
  expect(code).not.toContain("__SCRIPT_HASHES__");
  expect(code).not.toContain("document.currentScript");
  if (exportName === "getShopifyScriptHashes") {
    expect(code).toContain("sha256-");
    expect(code).not.toContain("decodeURIComponent");
  }
});

it("collects and deduplicates hashes from asInlineScript calls without hash imports", async () => {
  const scriptPath = fileURLToPath(
    new URL("../src/core/shopify-scripts/global-script.ts", import.meta.url),
  );
  const helperPath = fileURLToPath(
    new URL("../src/core/shopify-scripts/utils/inline-script.ts", import.meta.url),
  );
  const scriptModule = `
    import script from ${JSON.stringify(scriptPath)} with { type: "script" };
    import { asInlineScript } from ${JSON.stringify(helperPath)};
    export default asInlineScript(script);
  `;
  const bundles = await bundle(
    `
    export { default as first } from "virtual:first";
    export { default as second } from "virtual:second";
    export const hashes = __SCRIPT_HASHES__;
  `,
    {
      "virtual:first": scriptModule,
      "virtual:second": scriptModule,
    },
  );
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
    export { getShopifyScriptTags, getShopifyScriptHashes, getShopifyCspDirectives, createContentSecurityPolicy } from ${JSON.stringify(core)};
  `);
  const code = bundles
    .flatMap(({ chunks }) => chunks)
    .filter((chunk) => chunk.type === "chunk")
    .map((chunk) => chunk.code)
    .join("\n");
  const {
    getShopifyScriptTags,
    getShopifyScriptHashes,
    getShopifyCspDirectives,
    createContentSecurityPolicy,
  } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  assertScriptHashes({
    getShopifyScriptTags,
    getShopifyScriptHashes,
    getShopifyCspDirectives,
    createContentSecurityPolicy,
  });
});

it("exports matching bootstrap hashes from the full package build", async () => {
  // The package's test scripts build dist before Vitest runs.
  for (const [directory, entry] of [
    ["", "index"],
    ["development/", "development"],
  ]) {
    const outputDir = new URL(`../dist/${directory}`, import.meta.url);
    const hashModule = await readFile(
      new URL("core/shopify-scripts/hashes.mjs", outputDir),
      "utf8",
    );
    expect(hashModule).toContain("sha256-");
    expect(hashModule).not.toContain("__SCRIPT_HASHES__");
    expect(hashModule).not.toContain("document.currentScript");
    assertScriptHashes(await import(new URL(`core/${entry}.mjs`, outputDir).href));
  }
});

function assertScriptHashes({
  getShopifyScriptTags,
  getShopifyScriptHashes,
  getShopifyCspDirectives,
  createContentSecurityPolicy,
}: Pick<
  typeof import("../src/core/index"),
  | "getShopifyScriptTags"
  | "getShopifyScriptHashes"
  | "getShopifyCspDirectives"
  | "createContentSecurityPolicy"
>) {
  const { scripts } = getShopifyScriptTags({
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
  const quotedHashes = getShopifyScriptHashes();
  expect(quotedHashes).toEqual(expectedHashes);
  quotedHashes.length = 0;
  expect(getShopifyScriptHashes()).toEqual(expectedHashes);
  expect(getShopifyScriptHashes({ quoted: true })).toEqual(expectedHashes);
  expect(getShopifyScriptHashes({ quoted: false })).toEqual(
    expectedHashes.map((hash) => hash.slice(1, -1)),
  );

  const defaults = getShopifyCspDirectives();
  for (const hash of expectedHashes) expect(defaults.scriptSrc).not.toContain(hash);
  expect(getShopifyCspDirectives(undefined, { hashes: false })).toEqual(defaults);
  expect(getShopifyCspDirectives(undefined, { hashes: true })).toEqual({
    ...defaults,
    scriptSrc: [...defaults.scriptSrc, ...expectedHashes],
  });

  const csp = createContentSecurityPolicy({
    nonce: false,
    directives: { scriptSrc: getShopifyScriptHashes() },
  });
  for (const hash of expectedHashes) expect(csp.header).toContain(hash);
  // Adding hashes to defaults would disable existing unsafe-inline policies.
  expect(createContentSecurityPolicy({ nonce: false }).header).not.toContain("sha256-");
}

async function bundle(source: string, modules: Record<string, string> = {}) {
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
          if (id === entry || id in modules) return id;
        },
        load(id) {
          if (id === entry) return source;
          return modules[id];
        },
      },
      inlineScriptImports({ version: "0.0.0-test" }),
    ],
  });
}
