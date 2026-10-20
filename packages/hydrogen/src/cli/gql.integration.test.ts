import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../..");
const CLI_PATH = resolve(PACKAGE_ROOT, "dist/cli/index.mjs");
const SUCCESS_EXIT_CODE = 0;
const tempDirectories: string[] = [];

const TSCONFIG = JSON.stringify({
  compilerOptions: { strict: true, paths: { "~/*": ["./app/*"] } },
  include: ["app"],
});

function runGraphQLCheck(files: Record<string, string>, args: string[] = []) {
  const fixtureDirectory = mkdtempSync(join(tmpdir(), "hydrogen-gql-integration-"));
  tempDirectories.push(fixtureDirectory);

  for (const [path, contents] of Object.entries({ "tsconfig.json": TSCONFIG, ...files })) {
    mkdirSync(dirname(join(fixtureDirectory, path)), { recursive: true });
    writeFileSync(join(fixtureDirectory, path), contents);
  }

  return spawnSync(process.execPath, [CLI_PATH, "gql", "check", ...args], {
    cwd: fixtureDirectory,
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("hydrogen gql check", () => {
  it("accepts valid Storefront API and Customer Account API documents", () => {
    const result = runGraphQLCheck({
      "app/queries.ts": `import { gql } from "@shopify/hydrogen";
import * as account from "@shopify/hydrogen/customer-account";
export const SHOP = gql(\`query Shop { shop { name } }\`);
export const CUSTOMER = account.gql(\`query Customer { customer { firstName } }\`);
`,
    });

    expect(result.stdout).toContain("Validated 2 gql() documents in 1 file: 0 errors, 0 warnings.");
    expect(result.status).toBe(SUCCESS_EXIT_CODE);
  });

  it.each([
    {
      name: "an unknown field, at its position in the file",
      source: `import { gql } from "@shopify/hydrogen";
const QUERY = gql(\`query Shop { shop { doesNotExist } }\`);`,
      expected: `app/query.ts:2:40 - error: Cannot query field "doesNotExist" on type "Shop".`,
    },
    {
      name: "an unknown field in a CRLF file, at its position in the file",
      source: [
        `import { gql } from "@shopify/hydrogen";`,
        "const QUERY = gql(`",
        "  query Shop {",
        "    shop {",
        "      doesNotExist",
        "    }",
        "  }",
        "`);",
      ].join("\r\n"),
      expected: `app/query.ts:5:7 - error: Cannot query field "doesNotExist" on type "Shop".`,
    },
    {
      name: "a document against the schema of the gql() import it uses",
      source: `import { gql } from "@shopify/hydrogen/customer-account";
const QUERY = gql(\`query Products { products(first: 1) { nodes { id } } }\`);`,
      expected: `error: Cannot query field "products" on type "QueryRoot".`,
    },
  ])("rejects $name", ({ source, expected }) => {
    const result = runGraphQLCheck({ "app/query.ts": source });

    expect(result.stdout).toContain(expected);
    expect(result.status).not.toBe(SUCCESS_EXIT_CODE);
  });

  it("follows fragments through path aliases and re-exports, and reports a broken fragment once in its own file", () => {
    const result = runGraphQLCheck({
      "app/fragments/shop.ts": `import { gql } from "@shopify/hydrogen";
export const SHOP_FRAGMENT = gql(\`
  fragment ShopName on Shop {
    nmae
  }
\`);`,
      "app/fragments/index.ts": `export { SHOP_FRAGMENT as SHOP } from "./shop.ts";`,
      "app/home.ts": `import { gql } from "@shopify/hydrogen";
import { SHOP } from "~/fragments";
export const HOME = gql(\`query Home { shop { ...ShopName } }\`, [SHOP]);
export const FOOTER = gql(\`query Footer { shop { ...ShopName } }\`, [SHOP]);`,
    });

    const diagnostics = result.stdout.split("\n").filter((line) => line.includes(" - "));
    expect(diagnostics).toEqual([
      `app/fragments/shop.ts:4:5 - error: Cannot query field "nmae" on type "Shop". Did you mean "name"?`,
    ]);
    expect(result.status).not.toBe(SUCCESS_EXIT_CODE);
  });

  it.each([
    {
      name: "deprecated fields",
      source: `import { gql } from "@shopify/hydrogen/customer-account";
const QUERY = gql(\`query Address { customer { defaultAddress { territoryCode } } }\`);`,
      expected: "warn: The field CustomerAddress.territoryCode is deprecated.",
    },
    {
      name: "documents it can't read statically",
      source: `import { gql } from "@shopify/hydrogen";
const field = "name";
const QUERY = gql(\`query Shop { shop { \${field} } }\`);`,
      expected: "warn: Could not read this gql() document statically",
    },
  ])("warns about $name and fails only with --fail-on-warn", ({ source, expected }) => {
    const lenient = runGraphQLCheck({ "app/query.ts": source });
    const strict = runGraphQLCheck({ "app/query.ts": source }, ["--fail-on-warn"]);

    expect(lenient.stdout).toContain(expected);
    expect(lenient.status).toBe(SUCCESS_EXIT_CODE);
    expect(strict.stdout).toContain(expected);
    expect(strict.status).not.toBe(SUCCESS_EXIT_CODE);
  });

  it("checks the files a custom tsconfig includes, following extends", () => {
    const result = runGraphQLCheck(
      {
        "config/tsconfig.app.json": JSON.stringify({ extends: "./base.json" }),
        "config/base.json": JSON.stringify({ include: ["../app"], exclude: ["../app/legacy"] }),
        "app/query.ts": `import { gql } from "@shopify/hydrogen";
const QUERY = gql(\`query Shop { shop { name } }\`);`,
        "app/legacy/query.ts": `import { gql } from "@shopify/hydrogen";
const QUERY = gql(\`query Shop { shop { doesNotExist } }\`);`,
        "scripts/query.ts": `import { gql } from "@shopify/hydrogen";
const QUERY = gql(\`query Shop { shop { doesNotExist } }\`);`,
      },
      ["--fail-on-warn", "--tsconfig", "config/tsconfig.app.json"],
    );

    expect(result.stdout).toContain("Validated 1 gql() document in 1 file: 0 errors, 0 warnings.");
    expect(result.status).toBe(SUCCESS_EXIT_CODE);
  });

  it("rejects unknown diagnostic levels", () => {
    const result = runGraphQLCheck({}, ["--level", "verbose"]);

    expect(result.stderr).toContain("Invalid diagnostic level: verbose");
    expect(result.status).not.toBe(SUCCESS_EXIT_CODE);
  });
});
