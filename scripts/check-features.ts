#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

const STATUSES = ["planned", "experimental", "shipped", "deprecated"] as const;
type Status = (typeof STATUSES)[number];

const ID_PATTERN = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;
const ISSUE_PATTERN = /^(https?:\/\/\S+|#\d+)$/;

export type KnownGap = { gap: string; accepted: string } | { gap: string; issue: string };

/** A one-line change to an entry point that should make a proof fail. */
export type Mutant = { mutant: string; file: string; find: string; replace: string };

export type Feature = {
  id: string;
  promise: string;
  status: Status;
  owner: string;
  entry_points: string[];
  depends_on: string[];
  verified_by: string[];
  falsified_by: Mutant[];
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

/** A path that stays inside packages/hydrogen and cannot be read as a flag. */
function isPackagePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9_]/.test(value) &&
    !value.split("/").some((segment) => segment === "" || segment === "..")
  );
}

const PATH_RULE = "must be a relative path inside packages/hydrogen";

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

function parseMutant(raw: unknown, label: string, errors: string[]): Mutant | undefined {
  if (!isRecord(raw)) {
    errors.push(`${label}: must be a mapping`);
    return undefined;
  }
  const { mutant, file, find, replace } = raw;
  if (
    !isNonEmptyString(mutant) ||
    !isNonEmptyString(file) ||
    !isNonEmptyString(find) ||
    typeof replace !== "string"
  ) {
    errors.push(`${label}: needs mutant, file, find, and replace strings`);
    return undefined;
  }
  if (!isPackagePath(file)) {
    errors.push(`${label}: file ${PATH_RULE}`);
    return undefined;
  }
  if (find === replace) {
    errors.push(`${label}: find and replace are identical`);
    return undefined;
  }
  return { mutant, file, find, replace };
}

function parseEntries<T>(
  entry: Record<string, unknown>,
  key: string,
  label: string,
  errors: string[],
  parseEntry: (raw: unknown, entryLabel: string, errors: string[]) => T | undefined,
  options: { optional?: boolean } = {},
): T[] {
  const raw = entry[key];
  if (raw === undefined && options.optional) return [];
  if (!Array.isArray(raw)) {
    errors.push(`${label}: ${key} must be a list`);
    return [];
  }
  return raw.flatMap((item: unknown, itemIndex) => {
    const parsed = parseEntry(item, `${label}.${key}[${itemIndex}]`, errors);
    return parsed ? [parsed] : [];
  });
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
  const paths = (key: string): string[] => {
    const value = list(key);
    for (const path of value) {
      if (!isPackagePath(path)) errors.push(`${label}: ${key} ${path} ${PATH_RULE}`);
    }
    return value;
  };

  const statusText = text("status");
  const status = STATUSES.find((candidate) => candidate === statusText);
  if (statusText !== "" && status === undefined) {
    errors.push(`${label}: status must be one of ${STATUSES.join(", ")}`);
  }

  const known_gaps = parseEntries(entry, "known_gaps", label, errors, parseKnownGap);
  const falsified_by = parseEntries(entry, "falsified_by", label, errors, parseMutant, {
    optional: true,
  });

  const feature = {
    id: text("id"),
    promise: text("promise"),
    owner: text("owner"),
    entry_points: paths("entry_points"),
    depends_on: list("depends_on"),
    verified_by: paths("verified_by"),
    falsified_by,
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
  for (const { mutant, file } of feature.falsified_by) {
    if (!feature.entry_points.includes(file)) {
      errors.push(`${feature.id}: mutant "${mutant}" targets ${file}, which is not an entry point`);
    }
  }
  for (const group of feature.e2e_groups) {
    if (!workspace.e2eGroupExists(group)) {
      errors.push(
        `${feature.id}: no packages/storefront-e2e/specs/${group} for e2e group ${group}`,
      );
    }
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

export function checkProofs(
  features: Feature[],
  proofs: ReadonlyMap<string, ProofResult>,
): string[] {
  const errors: string[] = [];
  for (const feature of features) {
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
  }
  return errors;
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
  options: { quiet?: boolean; root?: string } = {},
): ReadonlyMap<string, ProofResult> | string {
  const root = options.root ?? hydrogenDir;
  const tmp = mkdtempSync(join(tmpdir(), "check-features-"));
  const reportPath = join(tmp, "report.json");
  try {
    const vitest = spawnSync(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "--root",
        root,
        ...paths,
        "--reporter=default",
        "--reporter=json",
        `--outputFile=${reportPath}`,
      ],
      {
        cwd: hydrogenDir,
        stdio: options.quiet ? "pipe" : "inherit",
      },
    );
    if (vitest.error) return `could not run vitest: ${vitest.error.message}`;
    if (!existsSync(reportPath)) return "vitest did not produce a JSON report";
    const report: {
      testResults: { name: string; assertionResults: { status: string }[] }[];
    } = JSON.parse(readFileSync(reportPath, "utf8"));
    const map = new Map<string, ProofResult>();
    for (const suite of report.testResults) {
      const rel = relative(root, suite.name);
      map.set(rel, countAssertions(suite.assertionResults));
    }
    return map;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Returns the mutated source, or undefined unless `find` occurs exactly once. */
export function applyMutant(source: string, mutant: Mutant): string | undefined {
  const first = source.indexOf(mutant.find);
  if (first === -1 || source.indexOf(mutant.find, first + 1) !== -1) return undefined;
  return source.slice(0, first) + mutant.replace + source.slice(first + mutant.find.length);
}

export type MutantVerdict = "killed" | "survived" | { broke: string };

/**
 * A mutant is killed when some proof fails. A proof that vitest could not
 * collect or that ran zero tests under the mutant did not fail, it broke,
 * which usually means the mutant is not valid code.
 */
export function judgeMutant(
  proofs: ReadonlyMap<string, ProofResult>,
  verifiedBy: string[],
): MutantVerdict {
  for (const path of verifiedBy) {
    const result = proofs.get(path);
    if (result === undefined || (result.passed === 0 && result.failed === 0)) {
      return { broke: path };
    }
  }
  return verifiedBy.some((path) => (proofs.get(path)?.failed ?? 0) > 0) ? "killed" : "survived";
}

/** Mutants are written to `copy`, a copy of packages/hydrogen, never to the real tree. */
export function runFalsification(
  hydrogenDir: string,
  copy: string,
  feature: Feature,
): { errors: string[]; killed: string[] } {
  const errors: string[] = [];
  const killed: string[] = [];
  for (const mutant of feature.falsified_by) {
    const label = `${feature.id}: mutant "${mutant.mutant}"`;
    const original = readFileSync(join(hydrogenDir, mutant.file), "utf8");
    const mutated = applyMutant(original, mutant);
    if (mutated === undefined) {
      errors.push(`${label} find text does not occur exactly once in ${mutant.file}`);
      continue;
    }
    writeFileSync(join(copy, mutant.file), mutated);
    const proofs = runProofs(hydrogenDir, feature.verified_by, { quiet: true, root: copy });
    writeFileSync(join(copy, mutant.file), original);
    const verdict = typeof proofs === "string" ? proofs : judgeMutant(proofs, feature.verified_by);
    if (verdict === "killed") killed.push(label);
    else if (verdict === "survived") errors.push(`${label} survived every proof`);
    else if (typeof verdict === "string") errors.push(`${label}: ${verdict}`);
    else errors.push(`${label} broke ${verdict.broke} instead of failing it; is it valid code?`);
  }
  return { errors, killed };
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

export function run(
  repoRoot: string,
  options: { proofs?: boolean; falsify?: boolean } = {},
): { errors: string[]; killed: string[] } {
  const registryPath = join(repoRoot, "packages/hydrogen/features.yaml");
  const parsed = parseRegistry(parse(readFileSync(registryPath, "utf8")));
  if (parsed.errors.length > 0) return { errors: parsed.errors, killed: [] };

  // Nothing is spawned until the registry's shape and paths have passed.
  const errors = checkFeatures(parsed.features, loadWorkspace(repoRoot));
  if (errors.length > 0 || !(options.proofs || options.falsify)) return { errors, killed: [] };

  const hydrogenDir = join(repoRoot, "packages/hydrogen");
  const proofPaths = [...new Set(parsed.features.flatMap((feature) => feature.verified_by))];
  if (proofPaths.length > 0) {
    const result = runProofs(hydrogenDir, proofPaths);
    if (typeof result === "string") return { errors: [result], killed: [] };
    errors.push(...checkProofs(parsed.features, result));
  }
  // Mutants only mean something against a registry whose proofs are green.
  if (errors.length > 0 || !options.falsify) return { errors, killed: [] };

  // Mutants run in a copy of the package so a crash, a signal, or a watcher never sees them.
  const copy = realpathSync(mkdtempSync(join(tmpdir(), "check-features-mutants-")));
  const killed: string[] = [];
  try {
    cpSync(hydrogenDir, copy, {
      recursive: true,
      filter: (source) => basename(source) !== "node_modules",
    });
    symlinkSync(join(hydrogenDir, "node_modules"), join(copy, "node_modules"));
    for (const feature of parsed.features) {
      const outcome = runFalsification(hydrogenDir, copy, feature);
      errors.push(...outcome.errors);
      killed.push(...outcome.killed);
    }
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
  return { errors, killed };
}

const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const proofs = process.argv.includes("--proofs");
  const falsify = process.argv.includes("--falsify");
  const { errors, killed } = run(resolve(fileURLToPath(import.meta.url), "../.."), {
    proofs,
    falsify,
  });
  for (const label of killed) console.log(`  killed ${label}`);
  if (errors.length > 0) {
    console.error(`features.yaml: ${errors.length} problem${errors.length === 1 ? "" : "s"}`);
    for (const error of errors) console.error(`  ${error}`);
    process.exit(1);
  }
  console.log("features.yaml: all checks pass");
}
