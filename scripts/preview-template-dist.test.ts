import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  assertPublishedPreviewVersion,
  preparePreviewTemplateDist,
  resolvePublishedHydrogenVersion,
  validatePreviewTemplateDist,
} from "./preview-template-dist.ts";

const VERSION = "2026.10.0-preview.3";

test("resolves the exact published Hydrogen preview version", () => {
  const publishedPackages = JSON.stringify([
    { name: "unrelated-package", version: "1.0.0" },
    { name: "@shopify/hydrogen", version: VERSION },
  ]);

  assert.equal(resolvePublishedHydrogenVersion(publishedPackages), VERSION);
});

test("rejects missing, old, and unpublished preview versions", () => {
  assert.throws(() => resolvePublishedHydrogenVersion("[]"), /Expected one published/);
  assert.throws(
    () => assertPublishedPreviewVersion("0.0.0-preview-deadbee-20260730120000"),
    /2026\.10\.0-preview/,
  );
  assert.throws(() => assertPublishedPreviewVersion("2026.10.0-preview.0"), /published/);
});

test("prepares manifests and synchronizes skills", () => {
  withFixture((repoRoot) => {
    const reactRouterLock = join(repoRoot, "templates", "react-router", "package-lock.json");
    const nextjsLock = join(repoRoot, "templates", "nextjs", "pnpm-lock.yaml");
    writeFile(reactRouterLock, "stale");
    writeFile(nextjsLock, "stale");
    writeFile(join(repoRoot, "templates", "react-router", "__test__", "shop.test.ts"), "test");
    writeFile(join(repoRoot, "templates", "nextjs", "__test__", "url-params.test.ts"), "test");
    writeFile(
      join(repoRoot, "templates", "react-router", ".agents", "skills", "stale", "SKILL.md"),
      "stale",
    );

    preparePreviewTemplateDist({ repoRoot, version: VERSION, log: () => {} });

    assert.equal(readHydrogenDependency(repoRoot, "react-router"), VERSION);
    assert.equal(readHydrogenDependency(repoRoot, "nextjs"), VERSION);
    assert.equal(readPackageManager(repoRoot, "react-router"), "npm@11.17.0");
    assert.equal(readPackageManager(repoRoot, "nextjs"), "pnpm@10.33.0");
    assert.equal(existsSync(reactRouterLock), false);
    assert.equal(existsSync(nextjsLock), false);
    assert.equal(existsSync(join(repoRoot, "templates", "react-router", "__test__")), false);
    assert.equal(existsSync(join(repoRoot, "templates", "nextjs", "__test__")), false);
    assert.equal(
      readFileSync(
        join(
          repoRoot,
          "templates",
          "react-router",
          ".agents",
          "skills",
          "hydrogen-setup",
          "SKILL.md",
        ),
        "utf8",
      ),
      "current skill",
    );
  });
});

test("fails preflight without partially preparing templates", () => {
  withFixture((repoRoot) => {
    const reactRouterLock = join(repoRoot, "templates", "react-router", "package-lock.json");
    writeFile(reactRouterLock, "keep me");
    writeFile(
      join(repoRoot, "templates", "react-router", ".agents", "skills", "stale", "SKILL.md"),
      "keep me",
    );
    writeTemplatePackage(repoRoot, "nextjs", "pnpm@10.33.0", "preview");

    assert.throws(
      () => preparePreviewTemplateDist({ repoRoot, version: VERSION, log: () => {} }),
      /must use workspace/,
    );
    assert.equal(readHydrogenDependency(repoRoot, "react-router"), "workspace:*");
    assert.equal(readFileSync(reactRouterLock, "utf8"), "keep me");
    assert.equal(
      readFileSync(
        join(repoRoot, "templates", "react-router", ".agents", "skills", "stale", "SKILL.md"),
        "utf8",
      ),
      "keep me",
    );
  });
});

test("validates compiled manifests", () => {
  withFixture((repoRoot) => {
    preparePreviewTemplateDist({ repoRoot, version: VERSION, log: () => {} });

    assert.doesNotThrow(() =>
      validatePreviewTemplateDist({ repoRoot, version: VERSION, log: () => {} }),
    );
  });
});

test("rejects source-only tests in compiled templates", () => {
  withFixture((repoRoot) => {
    preparePreviewTemplateDist({ repoRoot, version: VERSION, log: () => {} });
    writeFile(join(repoRoot, "templates", "nextjs", "__test__", "unexpected.test.ts"), "test");

    assert.throws(
      () => validatePreviewTemplateDist({ repoRoot, version: VERSION, log: () => {} }),
      /distribution contains source-only tests/,
    );
  });
});

function withFixture(run: (repoRoot: string) => void): void {
  const repoRoot = mkdtempSync(join(tmpdir(), "preview-template-dist-"));

  try {
    writeJson(join(repoRoot, "packages", "hydrogen", "package.json"), {
      name: "@shopify/hydrogen",
      version: VERSION,
    });
    writeFile(
      join(repoRoot, "packages", "hydrogen", "skills", "hydrogen-setup", "SKILL.md"),
      "current skill",
    );
    writeTemplatePackage(repoRoot, "react-router", "pnpm@10.33.0");
    writeTemplatePackage(repoRoot, "nextjs", "pnpm@10.33.0");
    run(repoRoot);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
}

function writeTemplatePackage(
  repoRoot: string,
  template: string,
  packageManager: string,
  hydrogenVersion = "workspace:*",
): void {
  writeJson(join(repoRoot, "templates", template, "package.json"), {
    name: `@shopify/hydrogen-template-${template}`,
    version: "0.0.0",
    private: true,
    dependencies: {
      "@shopify/hydrogen": hydrogenVersion,
    },
    packageManager,
  });
}

function readHydrogenDependency(repoRoot: string, template: string): string | undefined {
  const packageJson: unknown = JSON.parse(
    readFileSync(join(repoRoot, "templates", template, "package.json"), "utf8"),
  );
  if (!isRecord(packageJson) || !isRecord(packageJson.dependencies)) return undefined;
  const dependency = packageJson.dependencies["@shopify/hydrogen"];
  return typeof dependency === "string" ? dependency : undefined;
}

function readPackageManager(repoRoot: string, template: string): string | undefined {
  const packageJson: unknown = JSON.parse(
    readFileSync(join(repoRoot, "templates", template, "package.json"), "utf8"),
  );
  if (!isRecord(packageJson)) return undefined;
  return typeof packageJson.packageManager === "string" ? packageJson.packageManager : undefined;
}

function writeJson(path: string, value: unknown): void {
  writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFile(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
