import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const PACKAGE_ROOT = resolve(import.meta.dirname, "../../..");
const CLI_PATH = resolve(PACKAGE_ROOT, "dist/cli/index.mjs");
const SUCCESS_EXIT_CODE = 0;
const tempDirectories: string[] = [];

function runGraphQLCheck(query: string) {
  const fixtureDirectory = mkdtempSync(join(tmpdir(), "hydrogen-gql-integration-"));
  tempDirectories.push(fixtureDirectory);

  writeFileSync(
    join(fixtureDirectory, "query.ts"),
    `declare const gql: {
  (source: string): unknown;
  readonly __name: "storefront";
};
gql(${JSON.stringify(query)});
`,
  );
  writeFileSync(
    join(fixtureDirectory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "Bundler",
        skipLibCheck: true,
        strict: true,
        target: "ES2022",
      },
      include: ["query.ts"],
    }),
  );

  return spawnSync(process.execPath, [CLI_PATH, "gql", "check", "--fail-on-warn"], {
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
  it("accepts a valid Storefront API query", () => {
    const result = runGraphQLCheck("query { shop { name } }");

    expect(result.status).toBe(SUCCESS_EXIT_CODE);
  });

  it("rejects an invalid Storefront API field", () => {
    const result = runGraphQLCheck("query { shop { doesNotExist } }");

    expect(result.stdout).toContain("doesNotExist");
    expect(result.status).not.toBe(SUCCESS_EXIT_CODE);
  });
});
