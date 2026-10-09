#!/usr/bin/env node

/**
 * Keeps `@shopify/hydrogen` on CalVer (YYYY.Q.P, where Q is the quarter's first month) while
 * changesets versions it with semver. The mapping matches the classic Hydrogen release scripts
 * (`.changeset/calver-shared.js` and `enforce-calver-ci.js`):
 *
 * - minor and patch changesets both increment P within the current quarter
 * - a major changeset moves to the next quarter: 2026.10.3 -> 2027.1.0
 * - leaving prerelease mode completes the prerelease: 2026.10.0-preview.3 -> 2026.10.0
 *
 * Changesets keeps the changesets a prerelease has already released in `.changeset/pre/` and
 * releases them again, with the rest, when prerelease mode ends.
 *
 * Commands:
 *   check    fail when pending changesets can't release as intended
 *   next     print the next Hydrogen version, or "semver" when Hydrogen isn't releasing
 *   version  run `changeset version`, then rewrite the Hydrogen version it computed
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseChangesetFile } from "@changesets/parse";

const HYDROGEN_PACKAGE = "@shopify/hydrogen";
// Markdown files in .changeset that changesets itself doesn't treat as changesets.
const NON_CHANGESET_FILES = new Set(["README.md", "AGENTS.md", "CLAUDE.md", "GEMINI.md"]);
const QUARTERS = [1, 4, 7, 10];
const CALVER_VERSION = /^(\d{4})\.(\d+)\.(\d+)(?:-(.+))?$/;
const defaultRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export type CalverBump = "major" | "patch";

interface CalverVersion {
  year: number;
  quarter: number;
  patch: number;
  prerelease?: string;
}

if (isDirectInvocation()) {
  runCli();
}

/**
 * Returns the version Hydrogen should release as, given the version before `changeset version`
 * ran, the version changesets computed, and the highest pending Hydrogen bump.
 */
export function resolveCalverVersion(
  baseline: string,
  changesetVersion: string,
  bump: CalverBump,
): string {
  const calverVersion = getNextCalverVersion(baseline, bump);
  const computed = parseCalverVersion(changesetVersion);
  if (computed.prerelease === undefined) return calverVersion;

  // Still in prerelease mode. Changesets' -<tag>.<n> numbering is right only while it counts
  // toward the CalVer version, which holds for YYYY.Q.0 prereleases like 2026.10.0-preview.3.
  if (formatCalverVersion({ ...computed, prerelease: undefined }) !== calverVersion) {
    throw new Error(
      `Changesets computed ${HYDROGEN_PACKAGE} ${changesetVersion}, which doesn't lead to its next CalVer version, ${calverVersion}. Hydrogen prereleases only work from a YYYY.Q.0-<tag>.<n> version.`,
    );
  }
  return changesetVersion;
}

export function getNextCalverVersion(current: string, bump: CalverBump): string {
  const version = parseCalverVersion(current);

  if (version.prerelease !== undefined) {
    if (bump === "major") {
      throw new Error(
        `${HYDROGEN_PACKAGE} ${current} is a prerelease, so a major changeset would skip its release. Use minor or patch.`,
      );
    }
    return formatCalverVersion({ ...version, prerelease: undefined });
  }

  if (bump === "patch") {
    return formatCalverVersion({ ...version, patch: version.patch + 1 });
  }

  const nextQuarter = QUARTERS.find((quarter) => quarter > version.quarter);
  return nextQuarter === undefined
    ? formatCalverVersion({ year: version.year + 1, quarter: QUARTERS[0], patch: 0 })
    : formatCalverVersion({ year: version.year, quarter: nextQuarter, patch: 0 });
}

/** Lists pending changesets that wouldn't release as intended. */
export function findCalverViolations(repoRoot = defaultRepoRoot): string[] {
  const violations: string[] = [];
  const preStatePath = join(repoRoot, ".changeset", "pre.json");

  // Changesets 3.0.0-next.8 listed released changesets in pre.json. Changesets 3 moves them into
  // pre/ the first time it reads the file, so a list still there means no 3.x command, such as
  // `changeset pre exit`, has run since the last next.8 prerelease.
  if (existsSync(preStatePath) && "changesets" in readJsonObject(preStatePath)) {
    violations.push(
      ".changeset/pre.json still lists changesets in the Changesets 3.0.0-next.8 layout. Run `pnpm changeset pre exit`, which moves them into .changeset/pre/ and ends prerelease mode.",
    );
  }

  // changesets/action counts pre/ as pending outside prerelease mode, so leftovers there keep
  // it opening release PRs instead of publishing.
  if (!existsSync(preStatePath)) {
    const leftovers = listChangesetFiles(join(repoRoot, ".changeset", "pre"));
    if (leftovers.length > 0) {
      violations.push(
        `.changeset/pre/ still has ${leftovers.length} changesets, but prerelease mode is over. changesets/action would keep versioning instead of publishing.`,
      );
    }
  }

  const version = readHydrogenVersion(repoRoot);
  if (parseCalverVersion(version).prerelease !== undefined) {
    for (const { file, type } of readHydrogenChangesets(repoRoot)) {
      if (type === "major") {
        violations.push(
          `.changeset/${file}: ${HYDROGEN_PACKAGE} is major, which would skip the ${version} release.`,
        );
      }
    }
  }

  return violations;
}

/** The version the next release gives Hydrogen, or undefined when it has no changesets. */
export function getNextHydrogenVersion(repoRoot = defaultRepoRoot): string | undefined {
  const bump = readHydrogenBump(repoRoot);
  return bump === undefined ? undefined : getNextCalverVersion(readHydrogenVersion(repoRoot), bump);
}

/** Rewrites the Hydrogen version changesets wrote to package.json and the CHANGELOG heading. */
export function applyCalverVersion(repoRoot: string, from: string, to: string): void {
  const packageJsonPath = join(repoRoot, "packages", "hydrogen", "package.json");
  const packageJson = readJsonObject(packageJsonPath);
  packageJson.version = to;
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  const changelogPath = join(repoRoot, "packages", "hydrogen", "CHANGELOG.md");
  const changelog = readFileSync(changelogPath, "utf8");
  const heading = `## ${from}\n`;
  if (!changelog.includes(heading)) {
    throw new Error(`${changelogPath} has no "## ${from}" heading to rewrite.`);
  }
  writeFileSync(changelogPath, changelog.replace(heading, `## ${to}\n`));
}

function versionPackages(repoRoot: string): void {
  const baseline = readHydrogenVersion(repoRoot);
  // Read before changesets deletes the files it consumes.
  const bump = readHydrogenBump(repoRoot);

  execFileSync("pnpm", ["changeset", "version"], { cwd: repoRoot, stdio: "inherit" });

  const changesetVersion = readHydrogenVersion(repoRoot);
  if (changesetVersion === baseline) return;

  // A bump without a Hydrogen changeset can only come from a dependency, so it is a patch.
  const calverVersion = resolveCalverVersion(baseline, changesetVersion, bump ?? "patch");
  if (calverVersion === changesetVersion) return;

  applyCalverVersion(repoRoot, changesetVersion, calverVersion);
  console.log(`${HYDROGEN_PACKAGE}: ${changesetVersion} -> ${calverVersion} (CalVer)`);
}

function readHydrogenBump(repoRoot: string): CalverBump | undefined {
  const types = new Set(readHydrogenChangesets(repoRoot).map(({ type }) => type));
  if (types.has("major")) return "major";
  if (types.has("minor") || types.has("patch")) return "patch";
  return undefined;
}

/** The Hydrogen releases that the next `changeset version` consumes. */
function readHydrogenChangesets(repoRoot: string): Array<{ file: string; type: string }> {
  const changesetDir = join(repoRoot, ".changeset");
  // In prerelease mode, pre/ holds changesets earlier prereleases already released.
  const directories = isPrereleaseMode(repoRoot) ? [""] : ["", "pre"];

  return directories
    .flatMap((directory) =>
      listChangesetFiles(join(changesetDir, directory)).map((file) => join(directory, file)),
    )
    .flatMap((file) =>
      parseChangesetFile(readFileSync(join(changesetDir, file), "utf8"))
        .releases.filter(({ name }) => name === HYDROGEN_PACKAGE)
        .map(({ type }) => ({ file, type })),
    );
}

function listChangesetFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).filter(
    (file) => file.endsWith(".md") && !file.startsWith(".") && !NON_CHANGESET_FILES.has(file),
  );
}

function isPrereleaseMode(repoRoot: string): boolean {
  const preStatePath = join(repoRoot, ".changeset", "pre.json");
  return existsSync(preStatePath) && readJsonObject(preStatePath).mode === "pre";
}

function readHydrogenVersion(repoRoot: string): string {
  const packageJsonPath = join(repoRoot, "packages", "hydrogen", "package.json");
  const { version } = readJsonObject(packageJsonPath);
  if (typeof version !== "string") {
    throw new Error(`${packageJsonPath} has no version.`);
  }
  return version;
}

function parseCalverVersion(version: string): CalverVersion {
  const match = CALVER_VERSION.exec(version);
  if (!match) {
    throw new Error(`${version} is not a YYYY.Q.P ${HYDROGEN_PACKAGE} version.`);
  }

  return {
    year: Number(match[1]),
    quarter: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  };
}

function formatCalverVersion({ year, quarter, patch, prerelease }: CalverVersion): string {
  return prerelease === undefined
    ? `${year}.${quarter}.${patch}`
    : `${year}.${quarter}.${patch}-${prerelease}`;
}

function readJsonObject(path: string): Record<string, unknown> {
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must contain a JSON object.`);
  }
  return Object.fromEntries(Object.entries(value));
}

function runCli(): void {
  const [command] = process.argv.slice(2);

  try {
    if (command === "check") {
      const violations = findCalverViolations();
      if (violations.length > 0) {
        console.error(violations.join("\n"));
        process.exitCode = 1;
      }
      return;
    }
    if (command === "next") {
      console.log(getNextHydrogenVersion() ?? "semver");
      return;
    }
    if (command === "version") {
      versionPackages(defaultRepoRoot);
      return;
    }

    throw new Error("Usage: calver.ts <check|next|version>");
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
