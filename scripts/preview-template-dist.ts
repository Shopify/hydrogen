#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HYDROGEN_PACKAGE = "@shopify/hydrogen";
const PUBLISHED_PREVIEW_VERSION = /^2026\.10\.0-preview\.[1-9]\d*$/;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..");

const templates = [
  {
    name: "React Router",
    directory: "react-router",
    lockfile: "package-lock.json",
    distributionPackageManager: "npm@11.17.0",
  },
  {
    name: "Next.js",
    directory: "nextjs",
    lockfile: "pnpm-lock.yaml",
    distributionPackageManager: "pnpm@10.33.0",
  },
] as const;

interface PreviewDistOptions {
  repoRoot?: string;
  version: string;
  log?: (message: string) => void;
}

if (isDirectInvocation()) {
  runCli();
}

export function resolvePublishedHydrogenVersion(publishedPackagesJson: string): string {
  let publishedPackages: unknown;

  try {
    publishedPackages = JSON.parse(publishedPackagesJson);
  } catch {
    throw new Error("publishedPackages is not valid JSON.");
  }

  if (!Array.isArray(publishedPackages)) {
    throw new Error("publishedPackages must be an array.");
  }

  const versions: string[] = [];

  for (const publishedPackage of publishedPackages) {
    if (!isRecord(publishedPackage) || publishedPackage.name !== HYDROGEN_PACKAGE) continue;
    if (typeof publishedPackage.version !== "string") {
      throw new Error(`${HYDROGEN_PACKAGE} is missing a published version.`);
    }
    versions.push(publishedPackage.version);
  }

  if (versions.length !== 1) {
    throw new Error(
      `Expected one published ${HYDROGEN_PACKAGE} version, but found ${versions.length}.`,
    );
  }

  assertPublishedPreviewVersion(versions[0]);
  return versions[0];
}

export function preparePreviewTemplateDist(options: PreviewDistOptions): void {
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const log = options.log ?? console.log;
  const version = options.version;

  assertPublishedPreviewVersion(version);
  assertHydrogenPackageVersion(repoRoot, version);

  const templatePackages = templates.map((template) => {
    const templateRoot = join(repoRoot, "templates", template.directory);
    const packageJsonPath = join(templateRoot, "package.json");
    const packageJson = readJsonObject(packageJsonPath);
    const dependencies = readDependencies(packageJson, packageJsonPath);
    const currentVersion = dependencies[HYDROGEN_PACKAGE];

    if (currentVersion !== "workspace:*" && currentVersion !== version) {
      throw new Error(
        `${template.name} must use workspace:* before compilation; found ${String(currentVersion)}.`,
      );
    }

    return { dependencies, packageJson, packageJsonPath, template, templateRoot };
  });

  copyTemplateSkills(
    join(repoRoot, "packages", "hydrogen", "skills"),
    templates.map(({ directory }) => join(repoRoot, "templates", directory, ".agents", "skills")),
    log,
  );

  for (const templatePackage of templatePackages) {
    const { dependencies, packageJson, packageJsonPath, template, templateRoot } = templatePackage;
    dependencies[HYDROGEN_PACKAGE] = version;
    packageJson.packageManager = template.distributionPackageManager;
    writeJsonObject(packageJsonPath, packageJson);
    rmSync(join(templateRoot, template.lockfile), { force: true });
    log(`Prepared ${template.name} for ${HYDROGEN_PACKAGE}@${version}.`);
  }
}

export function validatePreviewTemplateDist(options: PreviewDistOptions): void {
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const log = options.log ?? console.log;
  const version = options.version;

  assertPublishedPreviewVersion(version);
  assertHydrogenPackageVersion(repoRoot, version);

  for (const template of templates) {
    const templateRoot = join(repoRoot, "templates", template.directory);
    const packageJsonPath = join(templateRoot, "package.json");
    const packageJson = readJsonObject(packageJsonPath);
    const dependencies = readDependencies(packageJson, packageJsonPath);

    if (dependencies[HYDROGEN_PACKAGE] !== version) {
      throw new Error(`${template.name} does not depend on ${HYDROGEN_PACKAGE}@${version}.`);
    }
    if (packageJson.packageManager !== template.distributionPackageManager) {
      throw new Error(
        `${template.name} does not use ${template.distributionPackageManager} for distribution.`,
      );
    }
  }

  log(`Validated preview templates for ${HYDROGEN_PACKAGE}@${version}.`);
}

export function assertPublishedPreviewVersion(version: string): void {
  if (!PUBLISHED_PREVIEW_VERSION.test(version)) {
    throw new Error(
      `Expected a published 2026.10.0-preview.<n> version, but received ${version || "an empty value"}.`,
    );
  }
}

function assertHydrogenPackageVersion(repoRoot: string, version: string): void {
  const packageJsonPath = join(repoRoot, "packages", "hydrogen", "package.json");
  const packageJson = readJsonObject(packageJsonPath);

  if (packageJson.name !== HYDROGEN_PACKAGE) {
    throw new Error(`Expected ${packageJsonPath} to describe ${HYDROGEN_PACKAGE}.`);
  }
  if (packageJson.version !== version) {
    throw new Error(
      `${packageJsonPath} contains ${String(packageJson.version)} instead of published version ${version}.`,
    );
  }
}

function copyTemplateSkills(
  sourceRoot: string,
  targets: string[],
  log: (message: string) => void,
): void {
  for (const target of targets) {
    rmSync(target, { recursive: true, force: true });
    mkdirSync(dirname(target), { recursive: true });
    cpSync(sourceRoot, target, { recursive: true });
    log(`Copied ${relative(process.cwd(), sourceRoot)} -> ${relative(process.cwd(), target)}`);
  }
}

function readDependencies(
  packageJson: Record<string, unknown>,
  packageJsonPath: string,
): Record<string, unknown> {
  if (!isRecord(packageJson.dependencies)) {
    throw new Error(`${packageJsonPath} does not contain dependencies.`);
  }
  return packageJson.dependencies;
}

function readJsonObject(path: string): Record<string, unknown> {
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}.`);
  }

  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isRecord(value)) {
    throw new Error(`${path} must contain a JSON object.`);
  }
  return value;
}

function writeJsonObject(path: string, value: Record<string, unknown>): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function runCli(): void {
  const [command, version] = process.argv.slice(2);

  try {
    if (command === "resolve") {
      process.stdout.write(
        `${resolvePublishedHydrogenVersion(process.env.PUBLISHED_PACKAGES ?? "")}\n`,
      );
      return;
    }
    if (command === "prepare" && version) {
      preparePreviewTemplateDist({ version });
      return;
    }
    if (command === "validate" && version) {
      validatePreviewTemplateDist({ version });
      return;
    }

    throw new Error("Usage: preview-template-dist.ts <resolve|prepare|validate> [version]");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

function isDirectInvocation(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && import.meta.url === pathToFileURL(entrypoint).href);
}
