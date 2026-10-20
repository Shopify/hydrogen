#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

const STATUSES = ["planned", "experimental", "shipped", "deprecated"] as const;
type Status = (typeof STATUSES)[number];

const ID_PATTERN = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
const ISSUE_PATTERN = /^(https?:\/\/\S+|#\d+)$/;

export type KnownGap = { gap: string; accepted: string } | { gap: string; issue: string };

export type Feature = {
  id: string;
  promise: string;
  status: Status;
  owner: string;
  entry_points: string[];
  depends_on: string[];
  verified_by: string[];
  e2e_groups: string[];
  known_gaps: KnownGap[];
};

export type ProofResult = { passed: number; failed: number; skipped: number };

export type Workspace = {
  /** Paths in `entry_points` and `verified_by` are relative to packages/hydrogen. */
  fileExists: (hydrogenRelativePath: string) => boolean;
  /** Names in `e2e_groups` are directories under packages/storefront-e2e/specs. */
  e2eGroupExists: (name: string) => boolean;
  /** Every `*.property.test.ts` under packages/hydrogen/src, relative to packages/hydrogen. */
  propertyTests: string[];
  /** Present only when --proofs was passed. Maps hydrogen-relative path to its test outcome. */
  proofs?: ReadonlyMap<string, ProofResult>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function parseKnownGap(rawGap: unknown, gapLabel: string, errors: string[]): KnownGap | undefined {
  if (!isRecord(rawGap)) {
    errors.push(`${gapLabel}: must be a mapping`);
    return undefined;
  }
  const { gap, accepted, issue } = rawGap;
  if (!isNonEmptyString(gap)) {
    errors.push(`${gapLabel}: gap must be a non-empty string`);
    return undefined;
  }
  if (isNonEmptyString(accepted) && issue === undefined) return { gap, accepted };
  if (isNonEmptyString(issue) && accepted === undefined) {
    if (!ISSUE_PATTERN.test(issue)) errors.push(`${gapLabel}: issue must be a URL or #number`);
    return { gap, issue };
  }
  errors.push(
    `${gapLabel}: needs exactly one of accepted (why this is fine) or issue (where the fix is tracked)`,
  );
  return undefined;
}

function parseFeature(entry: unknown, index: number, errors: string[]): Feature | undefined {
  if (!isRecord(entry)) {
    errors.push(`features[${index}]: must be a mapping`);
    return undefined;
  }
  const label =
    typeof entry.id === "string" ? `features[${index}] (${entry.id})` : `features[${index}]`;
  const errorsBefore = errors.length;

  const text = (key: string): string => {
    const value = entry[key];
    if (!isNonEmptyString(value)) {
      errors.push(`${label}: ${key} must be a non-empty string`);
      return "";
    }
    return value;
  };
  const list = (key: string): string[] => {
    const value = entry[key];
    if (!isStringList(value)) {
      errors.push(`${label}: ${key} must be a list of strings`);
      return [];
    }
    return value;
  };

  const statusText = text("status");
  const status = STATUSES.find((candidate) => candidate === statusText);
  if (statusText !== "" && status === undefined) {
    errors.push(`${label}: status must be one of ${STATUSES.join(", ")}`);
  }

  const rawGaps: unknown[] | undefined = Array.isArray(entry.known_gaps)
    ? entry.known_gaps
    : undefined;
  if (rawGaps === undefined) errors.push(`${label}: known_gaps must be a list`);
  const known_gaps = (rawGaps ?? []).flatMap((rawGap, gapIndex) => {
    const gap = parseKnownGap(rawGap, `${label}.known_gaps[${gapIndex}]`, errors);
    return gap ? [gap] : [];
  });

  const feature = {
    id: text("id"),
    promise: text("promise"),
    owner: text("owner"),
    entry_points: list("entry_points"),
    depends_on: list("depends_on"),
    verified_by: list("verified_by"),
    e2e_groups: list("e2e_groups"),
    known_gaps,
  };
  if (status === undefined || errors.length > errorsBefore) return undefined;
  return { ...feature, status };
}

export function parseRegistry(raw: unknown): { features: Feature[]; errors: string[] } {
  if (!Array.isArray(raw)) {
    return { features: [], errors: ["registry must be a top-level list of features"] };
  }
  const errors: string[] = [];
  const features = raw.flatMap((entry: unknown, index) => {
    const feature = parseFeature(entry, index, errors);
    return feature ? [feature] : [];
  });
  return { features, errors };
}

function checkProofs(feature: Feature, proofs: ReadonlyMap<string, ProofResult>): string[] {
  const errors: string[] = [];
  for (const path of feature.verified_by) {
    const result = proofs.get(path);
    if (result === undefined) {
      errors.push(`${feature.id}: ${path} was not collected by vitest`);
    } else if (result.failed > 0) {
      errors.push(`${feature.id}: ${path} has ${result.failed} failing test(s)`);
    } else if (result.passed === 0) {
      errors.push(`${feature.id}: ${path} has no passing tests`);
    }
  }
  return errors;
}

function checkFeature(feature: Feature, workspace: Workspace): string[] {
  const errors: string[] = [];
  if (!ID_PATTERN.test(feature.id))
    errors.push(`${feature.id}: id must look like area.feature-name`);
  for (const path of [...feature.entry_points, ...feature.verified_by]) {
    if (!workspace.fileExists(path))
      errors.push(`${feature.id}: packages/hydrogen/${path} does not exist`);
  }
  if (feature.status === "shipped" && feature.verified_by.length === 0) {
    errors.push(`${feature.id}: shipped features need at least one verified_by test`);
  }
  for (const group of feature.e2e_groups) {
    if (!workspace.e2eGroupExists(group)) {
      errors.push(
        `${feature.id}: no packages/storefront-e2e/specs/${group} for e2e group ${group}`,
      );
    }
  }
  if (workspace.proofs !== undefined) {
    errors.push(...checkProofs(feature, workspace.proofs));
  }
  return errors;
}

function duplicateIds(features: Feature[]): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const { id } of features) {
    if (seen.has(id)) errors.push(`${id}: duplicate id`);
    seen.add(id);
  }
  return errors;
}

function findCycle(features: Feature[]): string | undefined {
  const dependencies = new Map(features.map((feature) => [feature.id, feature.depends_on]));
  const state = new Map<string, "visiting" | "done">();
  const path: string[] = [];

  const visit = (id: string): string | undefined => {
    if (state.get(id) === "done") return undefined;
    if (state.get(id) === "visiting") return [...path.slice(path.indexOf(id)), id].join(" -> ");
    state.set(id, "visiting");
    path.push(id);
    for (const dependency of dependencies.get(id) ?? []) {
      const cycle = visit(dependency);
      if (cycle) return cycle;
    }
    path.pop();
    state.set(id, "done");
    return undefined;
  };

  for (const feature of features) {
    const cycle = visit(feature.id);
    if (cycle) return cycle;
  }
  return undefined;
}

function checkDependencies(features: Feature[]): string[] {
  const ids = new Set(features.map((feature) => feature.id));
  const errors = features.flatMap((feature) =>
    feature.depends_on
      .filter((dependency) => !ids.has(dependency))
      .map((dependency) => `${feature.id}: depends_on ${dependency} is not a registered feature`),
  );
  const cycle = findCycle(features);
  if (cycle) errors.push(`depends_on cycle: ${cycle}`);
  return errors;
}

function unclaimedPropertyTests(features: Feature[], workspace: Workspace): string[] {
  const claimed = new Set(features.flatMap((feature) => feature.verified_by));
  return workspace.propertyTests
    .filter((test) => !claimed.has(test))
    .map((test) => `${test}: property test is not claimed by any feature's verified_by`);
}

export function checkFeatures(features: Feature[], workspace: Workspace): string[] {
  return [
    ...duplicateIds(features),
    ...features.flatMap((feature) => checkFeature(feature, workspace)),
    ...checkDependencies(features),
    ...unclaimedPropertyTests(features, workspace),
  ];
}

function countAssertions(assertions: { status: string }[]): ProofResult {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const assertion of assertions) {
    if (assertion.status === "passed") passed++;
    else if (assertion.status === "failed") failed++;
    else skipped++;
  }
  return { passed, failed, skipped };
}

export function runProofs(
  hydrogenDir: string,
  paths: string[],
): ReadonlyMap<string, ProofResult> | string {
  const tmp = mkdtempSync(join(tmpdir(), "check-features-"));
  const reportPath = join(tmp, "report.json");
  try {
    const vitest = spawnSync(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        ...paths,
        "--reporter=default",
        "--reporter=json",
        `--outputFile=${reportPath}`,
      ],
      {
        cwd: hydrogenDir,
        stdio: "inherit",
      },
    );
    if (vitest.error) return `could not run vitest: ${vitest.error.message}`;
    if (!existsSync(reportPath)) return "vitest did not produce a JSON report";
    const report: {
      testResults: { name: string; assertionResults: { status: string }[] }[];
    } = JSON.parse(readFileSync(reportPath, "utf8"));
    const map = new Map<string, ProofResult>();
    for (const suite of report.testResults) {
      const rel = relative(hydrogenDir, suite.name);
      map.set(rel, countAssertions(suite.assertionResults));
    }
    return map;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export function loadWorkspace(repoRoot: string): Workspace {
  const hydrogenDir = join(repoRoot, "packages/hydrogen");
  const specsDir = join(repoRoot, "packages/storefront-e2e/specs");
  const propertyTests = readdirSync(join(hydrogenDir, "src"), { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".property.test.ts"))
    .map((path) => join("src", path))
    .toSorted();
  return {
    fileExists: (path) => existsSync(join(hydrogenDir, path)),
    e2eGroupExists: (name) => existsSync(join(specsDir, name)),
    propertyTests,
  };
}

export function run(repoRoot: string, options: { proofs?: boolean } = {}): string[] {
  const registryPath = join(repoRoot, "packages/hydrogen/features.yaml");
  const parsed = parseRegistry(parse(readFileSync(registryPath, "utf8")));
  if (parsed.errors.length > 0) return parsed.errors;

  const workspace = loadWorkspace(repoRoot);
  const proofPaths = [...new Set(parsed.features.flatMap((feature) => feature.verified_by))];
  if (options.proofs && proofPaths.length > 0) {
    const result = runProofs(join(repoRoot, "packages/hydrogen"), proofPaths);
    if (typeof result === "string") return [result];
    workspace.proofs = result;
  }
  return checkFeatures(parsed.features, workspace);
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const proofs = process.argv.includes("--proofs");
  const errors = run(resolve(fileURLToPath(import.meta.url), "../.."), { proofs });
  if (errors.length > 0) {
    console.error(`features.yaml: ${errors.length} problem${errors.length === 1 ? "" : "s"}`);
    for (const error of errors) console.error(`  ${error}`);
    process.exit(1);
  }
  console.log("features.yaml: all checks pass");
}
