import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  preparePreviewTemplateDist,
  validatePreviewTemplateDist,
} from "./preview-template-dist.ts";

const VERSION = "2026.10.0";
const MINI_OXYGEN_VERSION = "4.2.3";

test("rejects prerelease and snapshot Hydrogen versions", async () => {
  await withFixture(async (repoRoot) => {
    for (const version of ["2026.10.0-preview.3", "0.0.0-next-deadbee-20260730120000"]) {
      await assert.rejects(
        preparePreviewTemplateDist({ repoRoot, version, log: () => {} }),
        /Expected a stable YYYY\.Q\.P/,
      );
    }
    assert.equal(readHydrogenDependency(repoRoot, "react-router"), "workspace:*");
  });
});

test("prepares manifests and synchronizes skills", async () => {
  await withFixture(async (repoRoot) => {
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

    await preparePreviewTemplateDist({ repoRoot, version: VERSION, log: () => {} });

    assert.equal(readHydrogenDependency(repoRoot, "react-router"), VERSION);
    assert.equal(readHydrogenDependency(repoRoot, "nextjs"), VERSION);
    assert.equal(
      readDependency(repoRoot, "react-router", "devDependencies", "@shopify/mini-oxygen"),
      MINI_OXYGEN_VERSION,
    );
    assert.equal(readPackageManager(repoRoot, "react-router"), "npm@11.17.0");
    assert.equal(readPackageManager(repoRoot, "nextjs"), "pnpm@10.33.0");
    assert.equal(existsSync(reactRouterLock), false);
    assert.equal(existsSync(nextjsLock), false);
    assert.equal(existsSync(join(repoRoot, "templates", "react-router", "__test__")), false);
    assert.equal(existsSync(join(repoRoot, "templates", "nextjs", "__test__")), false);
    const syncedSkill = readFileSync(
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
    );
    assert.match(syncedSkill, /current skill/);
    assert.match(syncedSkill, /^ {2}source: "@shopify\/hydrogen"$/m);
    assert.match(
      syncedSkill,
      new RegExp(`^ {2}version: "${VERSION.replaceAll(".", "\\.")}"$`, "m"),
    );
    assert.equal(
      existsSync(join(repoRoot, "templates", "react-router", ".agents", "skills", "stale")),
      false,
    );
    assert.equal(
      readFileSync(
        join(
          repoRoot,
          "templates",
          "react-router",
          ".claude",
          "skills",
          "hydrogen-setup",
          "SKILL.md",
        ),
        "utf8",
      ),
      syncedSkill,
    );
  });
});

test("fails preflight without partially preparing templates", async () => {
  await withFixture(async (repoRoot) => {
    const reactRouterLock = join(repoRoot, "templates", "react-router", "package-lock.json");
    writeFile(reactRouterLock, "keep me");
    writeFile(
      join(repoRoot, "templates", "react-router", ".agents", "skills", "stale", "SKILL.md"),
      "keep me",
    );
    writeTemplatePackage(repoRoot, "nextjs", "pnpm@10.33.0", "preview");

    await assert.rejects(
      preparePreviewTemplateDist({ repoRoot, version: VERSION, log: () => {} }),
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

test("validates compiled manifests", async () => {
  await withFixture(async (repoRoot) => {
    await preparePreviewTemplateDist({ repoRoot, version: VERSION, log: () => {} });

    assert.doesNotThrow(() =>
      validatePreviewTemplateDist({ repoRoot, version: VERSION, log: () => {} }),
    );
  });
});

test("rejects source-only tests in compiled templates", async () => {
  await withFixture(async (repoRoot) => {
    await preparePreviewTemplateDist({ repoRoot, version: VERSION, log: () => {} });
    writeFile(join(repoRoot, "templates", "nextjs", "__test__", "unexpected.test.ts"), "test");

    assert.throws(
      () => validatePreviewTemplateDist({ repoRoot, version: VERSION, log: () => {} }),
      /distribution contains source-only tests/,
    );
  });
});

async function withFixture(run: (repoRoot: string) => Promise<void>): Promise<void> {
  const repoRoot = mkdtempSync(join(tmpdir(), "preview-template-dist-"));

  try {
    writeJson(join(repoRoot, "packages", "hydrogen", "package.json"), {
      name: "@shopify/hydrogen",
      version: VERSION,
    });
    writeJson(join(repoRoot, "packages", "mini-oxygen", "package.json"), {
      name: "@shopify/mini-oxygen",
      version: MINI_OXYGEN_VERSION,
    });
    writeFile(
      join(repoRoot, "packages", "hydrogen", "skills", "hydrogen-setup", "SKILL.md"),
      "---\nname: hydrogen-setup\n---\ncurrent skill\n",
    );
    writeTemplatePackage(repoRoot, "react-router", "pnpm@10.33.0", "workspace:*", {
      "@shopify/mini-oxygen": "workspace:*",
    });
    writeTemplatePackage(repoRoot, "nextjs", "pnpm@10.33.0");
    await run(repoRoot);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
}

function writeTemplatePackage(
  repoRoot: string,
  template: string,
  packageManager: string,
  hydrogenVersion = "workspace:*",
  devDependencies: Record<string, string> = {},
): void {
  writeJson(join(repoRoot, "templates", template, "package.json"), {
    name: `@shopify/hydrogen-template-${template}`,
    version: "0.0.0",
    private: true,
    dependencies: {
      "@shopify/hydrogen": hydrogenVersion,
    },
    devDependencies,
    packageManager,
  });
}

function readHydrogenDependency(repoRoot: string, template: string): string | undefined {
  return readDependency(repoRoot, template, "dependencies", "@shopify/hydrogen");
}

function readDependency(
  repoRoot: string,
  template: string,
  field: "dependencies" | "devDependencies",
  name: string,
): string | undefined {
  const packageJson: unknown = JSON.parse(
    readFileSync(join(repoRoot, "templates", template, "package.json"), "utf8"),
  );
  if (!isRecord(packageJson)) return undefined;
  const dependencies = packageJson[field];
  if (!isRecord(dependencies)) return undefined;
  const dependency = dependencies[name];
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
