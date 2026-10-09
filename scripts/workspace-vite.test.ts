import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const MINI_OXYGEN_PACKAGE = "@shopify/mini-oxygen";
const WORKSPACE_DIRECTORIES = ["packages", "templates", "examples"];
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// A workspace link makes MiniOxygen run each consumer's SSR environment on the vite that
// packages/mini-oxygen resolves, not the consumer's. If the versions drift, repository dev and
// E2E test MiniOxygen against a vite that distributed templates don't install.
test("MiniOxygen's workspace consumers resolve MiniOxygen's vite version", () => {
  const miniOxygenRoot = join(repoRoot, "packages", "mini-oxygen");
  const expected = readViteVersion(miniOxygenRoot);
  const consumers = findWorkspaceConsumers();

  assert.notEqual(consumers.length, 0, `Expected a workspace consumer of ${MINI_OXYGEN_PACKAGE}.`);
  for (const consumer of consumers) {
    assert.equal(
      readViteVersion(consumer),
      expected,
      `${relative(repoRoot, consumer)} resolves a different vite than packages/mini-oxygen. Align them so both resolve the same version.`,
    );
  }
});

function findWorkspaceConsumers(): string[] {
  return WORKSPACE_DIRECTORIES.flatMap((directory) =>
    readdirSync(join(repoRoot, directory), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(repoRoot, directory, entry.name))
      .filter((packageRoot) => dependsOnWorkspaceMiniOxygen(packageRoot)),
  );
}

function dependsOnWorkspaceMiniOxygen(packageRoot: string): boolean {
  const packageJsonPath = join(packageRoot, "package.json");
  if (!existsSync(packageJsonPath)) return false;

  const packageJson: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (!isRecord(packageJson)) return false;

  return ["dependencies", "devDependencies"].some((field) => {
    const dependencies = packageJson[field];
    const range = isRecord(dependencies) ? dependencies[MINI_OXYGEN_PACKAGE] : undefined;
    return typeof range === "string" && range.startsWith("workspace:");
  });
}

function readViteVersion(packageRoot: string): unknown {
  const require = createRequire(join(packageRoot, "package.json"));
  const packageJson: unknown = JSON.parse(
    readFileSync(require.resolve("vite/package.json"), "utf8"),
  );
  return isRecord(packageJson) ? packageJson.version : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
