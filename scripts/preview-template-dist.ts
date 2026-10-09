#!/usr/bin/env node

import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { syncSkills } from "../packages/hydrogen/src/cli/skills.ts";

const HYDROGEN_PACKAGE = "@shopify/hydrogen";
const DEPENDENCY_FIELDS = ["dependencies", "devDependencies"] as const;
const SOURCE_ONLY_TEST_DIRECTORY = "__test__";
// Module-level consts must precede the runCli() call below, which runs at import time.
const SKILL_HARNESS_DIRECTORIES = [".claude", ".agents"];
const STABLE_CALVER_VERSION = /^\d{4}\.\d{1,2}\.\d+$/;
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

interface WorkspacePin {
  dependencies: Record<string, unknown>;
  name: string;
  version: string;
}

if (isDirectInvocation()) {
  void runCli();
}

export async function preparePreviewTemplateDist(options: PreviewDistOptions): Promise<void> {
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const log = options.log ?? console.log;
  const version = options.version;

  assertStableVersion(version);
  assertHydrogenPackageVersion(repoRoot, version);
  const workspaceVersions = readWorkspaceVersions(repoRoot);

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

    const workspacePins = resolveWorkspacePins(template.name, packageJson, workspaceVersions);
    return { packageJson, packageJsonPath, template, templateRoot, workspacePins };
  });

  await syncTemplateSkills(
    join(repoRoot, "packages", "hydrogen"),
    templates.map(({ directory }) => join(repoRoot, "templates", directory)),
    log,
  );

  for (const templatePackage of templatePackages) {
    const { packageJson, packageJsonPath, template, templateRoot, workspacePins } = templatePackage;
    for (const pin of workspacePins) {
      pin.dependencies[pin.name] = pin.version;
    }
    packageJson.packageManager = template.distributionPackageManager;
    writeJsonObject(packageJsonPath, packageJson);
    rmSync(join(templateRoot, SOURCE_ONLY_TEST_DIRECTORY), { recursive: true, force: true });
    rmSync(join(templateRoot, template.lockfile), { force: true });
    log(`Prepared ${template.name} for ${HYDROGEN_PACKAGE}@${version}.`);
  }
}

export function validatePreviewTemplateDist(options: PreviewDistOptions): void {
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const log = options.log ?? console.log;
  const version = options.version;

  assertStableVersion(version);
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
    if (existsSync(join(templateRoot, SOURCE_ONLY_TEST_DIRECTORY))) {
      throw new Error(`${template.name} distribution contains source-only tests.`);
    }
  }

  log(`Validated preview templates for ${HYDROGEN_PACKAGE}@${version}.`);
}

function assertStableVersion(version: string): void {
  if (!STABLE_CALVER_VERSION.test(version)) {
    throw new Error(
      `Expected a stable YYYY.Q.P ${HYDROGEN_PACKAGE} version, but received ${version || "an empty value"}.`,
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

/**
 * Template sources never carry skill copies, so start from empty harness skill
 * directories and let the same sync that consumers run stamp each skill with
 * version and hash metadata. That keeps `hydrogen skills sync` working after
 * a template is deployed and upgraded.
 */
async function syncTemplateSkills(
  packageRoot: string,
  templateRoots: string[],
  log: (message: string) => void,
): Promise<void> {
  for (const templateRoot of templateRoots) {
    for (const harness of SKILL_HARNESS_DIRECTORIES) {
      rmSync(join(templateRoot, harness, "skills"), { recursive: true, force: true });
    }
    await syncSkills({ cwd: templateRoot, packageRoot, log });
  }
}

/** Versions of the packages in packages/ that publish to npm. */
function readWorkspaceVersions(repoRoot: string): Map<string, string> {
  const packagesRoot = join(repoRoot, "packages");
  const versions = new Map<string, string>();

  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    const packageJsonPath = join(packagesRoot, entry.name, "package.json");
    if (!entry.isDirectory() || !existsSync(packageJsonPath)) continue;

    const { name, version, private: isPrivate } = readJsonObject(packageJsonPath);
    if (typeof name === "string" && typeof version === "string" && isPrivate !== true) {
      versions.set(name, version);
    }
  }

  return versions;
}

/**
 * Standalone templates install from npm, which rejects the `workspace:` protocol,
 * so each workspace dependency is pinned to the version its workspace package declares.
 */
function resolveWorkspacePins(
  templateName: string,
  packageJson: Record<string, unknown>,
  workspaceVersions: ReadonlyMap<string, string>,
): WorkspacePin[] {
  const pins: WorkspacePin[] = [];

  for (const field of DEPENDENCY_FIELDS) {
    const dependencies = packageJson[field];
    if (!isRecord(dependencies)) continue;

    for (const [name, range] of Object.entries(dependencies)) {
      if (typeof range !== "string" || !range.startsWith("workspace:")) continue;

      const version = workspaceVersions.get(name);
      if (version === undefined) {
        throw new Error(
          `${templateName} depends on ${name}@${range}, which isn't a published package in packages/.`,
        );
      }
      pins.push({ dependencies, name, version });
    }
  }

  return pins;
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

async function runCli(): Promise<void> {
  const [command, version] = process.argv.slice(2);

  try {
    if (command === "prepare" && version) {
      await preparePreviewTemplateDist({ version });
      return;
    }
    if (command === "validate" && version) {
      validatePreviewTemplateDist({ version });
      return;
    }

    throw new Error("Usage: preview-template-dist.ts <prepare|validate> <version>");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

function isDirectInvocation(): boolean {
  const entrypoint = process.argv[1];
  // import.meta.url has symlinks resolved, and argv[1] doesn't.
  return Boolean(entrypoint && import.meta.url === pathToFileURL(realpathSync(entrypoint)).href);
}
