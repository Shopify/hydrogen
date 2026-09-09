import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, sep } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

// Explicit extension: scripts/preview-template-dist.ts runs this module under
// plain `node` type stripping, which cannot resolve extensionless imports.
import { isObjectRecord } from "../core/utils/record.ts";

const PACKAGE_NAME = "@shopify/hydrogen";
const PACKAGE_ROOT_FROM_CLI_MODULE = "../../";
const SKILLS_DIRECTORY_NAME = "skills";
const SKILL_FILE_NAME = "SKILL.md";
const CLAUDE_DIRECTORY_NAME = ".claude";
const AGENTS_DIRECTORY_NAME = ".agents";
const PACKAGE_JSON_FILE_NAME = "package.json";
const HASH_ALGORITHM = "sha256";
const STAGING_SUFFIX = ".hydrogen-sync";
const FRONTMATTER_DELIMITER = "---";
// Captures the closing delimiter's terminator so injection can reproduce a
// frontmatter-only file that ends without a newline byte for byte.
const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---(\n|$)/;
// Files editors and operating systems drop into directories; never user edits.
const IGNORED_FILE_NAMES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

/**
 * The exact block `renderMetadataBlock` writes. Reading, verifying, and
 * stripping all go through this one pattern so writer and reader cannot drift.
 */
const METADATA_BLOCK_PATTERN = new RegExp(
  `^metadata:\\n {2}source: "${PACKAGE_NAME}"\\n {2}version: "([^"\\n]*)"\\n {2}hash: "([^"\\n]*)"\\n`,
  "m",
);
/**
 * Hashing strips every occurrence, not just the first: a skill whose body
 * documents the block would otherwise hash differently before and after
 * injection and read as locally modified forever.
 */
const METADATA_BLOCK_GLOBAL_PATTERN = new RegExp(METADATA_BLOCK_PATTERN.source, "gm");

interface SkillMetadata {
  version: string;
  hash: string;
}

interface ShippedSkill {
  skillName: string;
  sourceRoot: string;
  metadata: SkillMetadata;
  /** SKILL.md with the metadata block injected, ready to write. */
  skillFile: string;
}

type DestinationState =
  | { kind: "absent" }
  | { kind: "partial" }
  | { kind: "unmanaged" }
  | { kind: "managed"; metadata: SkillMetadata; modified: boolean };

type InstallAction = "add" | "update";
/** `skip` holds back a shipped update; `keep` retains an edited skill the package no longer ships. */
type SkillAction = InstallAction | "unchanged" | "remove" | "skip" | "keep";

interface PlannedSkillBase {
  skillName: string;
  destinationRoot: string;
}

type PlannedSkill =
  | (PlannedSkillBase & { action: InstallAction; shipped: ShippedSkill })
  | (PlannedSkillBase & { action: Exclude<SkillAction, InstallAction> });

interface DestinationPlan {
  destinationRoot: string;
  planned: PlannedSkill[];
  conflicts: string[];
  /** Locally edited skills the package no longer ships; removal needs consent. */
  orphans: string[];
}

export interface SyncSkillsRootResult {
  root: string;
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
  /** Locally edited skills holding back a newer shipped version. */
  skipped: string[];
  /** Locally edited skills the package no longer ships, left in place. */
  kept: string[];
}

export interface SyncSkillsResult {
  version: string;
  roots: SyncSkillsRootResult[];
}

export interface SyncSkillsOptions {
  args?: string[];
  cwd?: string;
  packageRoot?: string;
  log?: (message: string) => void;
  /**
   * Asked once per locally edited skill the package no longer ships; resolve
   * `true` to remove it. Defaults to a terminal prompt, and to keeping the
   * skill when there is no TTY or `CI` is set.
   */
  confirm?: (question: string) => Promise<boolean>;
}

function assertDirectory(directoryPath: string, message: string): void {
  if (!existsSync(directoryPath) || !statSync(directoryPath).isDirectory()) {
    throw new Error(message);
  }
}

function assertDirectoryIfPresent(directoryPath: string, label: string): void {
  if (existsSync(directoryPath)) {
    assertDirectory(directoryPath, `${label} exists but is not a directory.`);
  }
}

function getPackageRoot(): string {
  return fileURLToPath(new URL(PACKAGE_ROOT_FROM_CLI_MODULE, import.meta.url));
}

/**
 * Resolves the Hydrogen the app actually depends on, walking up parent
 * node_modules the way Node itself would. This finds hoisted installs in
 * monorepos, which a plain `<appRoot>/node_modules` lookup misses.
 */
function getInstalledPackageRoot(appRoot: string): string | undefined {
  const require = createRequire(join(appRoot, PACKAGE_JSON_FILE_NAME));
  try {
    return dirname(require.resolve(`${PACKAGE_NAME}/${PACKAGE_JSON_FILE_NAME}`));
  } catch {
    return undefined;
  }
}

function readPackageVersion(packageRoot: string): string {
  const packageJsonPath = join(packageRoot, PACKAGE_JSON_FILE_NAME);
  const parsed: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (!isObjectRecord(parsed) || typeof parsed.version !== "string") {
    throw new Error(`${packageJsonPath} must declare a string version.`);
  }

  return parsed.version;
}

/**
 * Every harness dir is written unconditionally: Claude Code reads `.claude/skills`,
 * while Codex, Cursor, and OpenCode read `.agents/skills`. Writing both means no
 * project has to declare which agents it uses.
 */
function getSkillsDestinationRoots(appRoot: string): string[] {
  return [CLAUDE_DIRECTORY_NAME, AGENTS_DIRECTORY_NAME].map((harnessDirectory) => {
    const skillsDirectory = join(harnessDirectory, SKILLS_DIRECTORY_NAME);
    assertDirectoryIfPresent(join(appRoot, harnessDirectory), harnessDirectory);
    assertDirectoryIfPresent(join(appRoot, skillsDirectory), skillsDirectory);
    return join(appRoot, skillsDirectory);
  });
}

function listDirectoryNames(root: string): string[] {
  if (!existsSync(root)) return [];

  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function listFilesRecursively(root: string): string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (IGNORED_FILE_NAMES.has(entry.name)) continue;
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else files.push(entryPath);
    }
  };
  visit(root);

  // Posix separators so a hash computed on one platform verifies on another.
  return files
    .map((filePath) => relative(root, filePath).split(sep).join("/"))
    .toSorted((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function readNormalizedText(filePath: string): string {
  return readFileSync(filePath, "utf8").replaceAll("\r\n", "\n");
}

function renderMetadataBlock(metadata: SkillMetadata): string {
  return [
    "metadata:",
    `  source: "${PACKAGE_NAME}"`,
    `  version: "${metadata.version}"`,
    `  hash: "${metadata.hash}"`,
    "",
  ].join("\n");
}

/**
 * Hashes every file in a skill directory. Line endings are normalized so a skill
 * checked out through git autocrlf still verifies against the hash written on
 * another platform. The injected metadata block is stripped from SKILL.md so a
 * synced copy hashes to the same value as its shipped source.
 */
function hashSkillDirectory(skillRoot: string): string {
  const hash = createHash(HASH_ALGORITHM);

  for (const relativePath of listFilesRecursively(skillRoot)) {
    let content = readNormalizedText(join(skillRoot, relativePath));
    if (relativePath === SKILL_FILE_NAME) {
      content = content.replaceAll(METADATA_BLOCK_GLOBAL_PATTERN, "");
    }

    hash.update(relativePath);
    hash.update("\0");
    hash.update(content);
    hash.update("\0");
  }

  return `${HASH_ALGORITHM}:${hash.digest("hex")}`;
}

function readShippedSkill(
  sourceSkillsRoot: string,
  skillName: string,
  version: string,
): ShippedSkill {
  const sourceRoot = join(sourceSkillsRoot, skillName);
  const skillFilePath = join(sourceRoot, SKILL_FILE_NAME);
  if (!existsSync(skillFilePath)) throw new Error(`${skillFilePath} is missing.`);

  const content = readNormalizedText(skillFilePath);
  const frontmatterMatch = FRONTMATTER_PATTERN.exec(content);
  if (!frontmatterMatch) {
    throw new Error(`${skillFilePath} has no frontmatter to record Hydrogen metadata in.`);
  }

  const [fullMatch, frontmatter, terminator] = frontmatterMatch;
  if (/^metadata:/m.test(frontmatter)) {
    throw new Error(`${skillFilePath} already declares frontmatter metadata.`);
  }

  const metadata = { version, hash: hashSkillDirectory(sourceRoot) };
  const skillFile =
    [
      FRONTMATTER_DELIMITER,
      frontmatter,
      renderMetadataBlock(metadata) + FRONTMATTER_DELIMITER,
    ].join("\n") +
    terminator +
    content.slice(fullMatch.length);

  return { skillName, sourceRoot, metadata, skillFile };
}

function readDestinationState(skillRoot: string): DestinationState {
  if (!existsSync(skillRoot)) return { kind: "absent" };

  const skillFilePath = join(skillRoot, SKILL_FILE_NAME);
  // A directory without SKILL.md is a partial copy, never user content.
  if (!existsSync(skillFilePath)) return { kind: "partial" };

  const frontmatter = FRONTMATTER_PATTERN.exec(readNormalizedText(skillFilePath))?.[1];
  const metadataMatch =
    frontmatter === undefined ? null : METADATA_BLOCK_PATTERN.exec(frontmatter + "\n");
  if (!metadataMatch) return { kind: "unmanaged" };

  const metadata = { version: metadataMatch[1] ?? "", hash: metadataMatch[2] ?? "" };
  return { kind: "managed", metadata, modified: hashSkillDirectory(skillRoot) !== metadata.hash };
}

/** Returns undefined when the destination is user content that must not be touched. */
function decideShippedAction(
  state: DestinationState,
  shipped: SkillMetadata,
  force: boolean,
): Extract<SkillAction, InstallAction | "unchanged" | "skip"> | undefined {
  switch (state.kind) {
    case "absent":
      return "add";
    case "partial":
      return "update";
    case "unmanaged":
      return force ? "update" : undefined;
    case "managed": {
      const current =
        state.metadata.hash === shipped.hash && state.metadata.version === shipped.version;
      if (!state.modified) return current ? "unchanged" : "update";
      if (force) return "update";
      // A local edit of the current version has nothing new to pull, so there
      // is nothing to report; only nag when an update is actually waiting.
      return current ? "unchanged" : "skip";
    }
  }
}

/** Returns undefined when the stale directory is user content that must not be touched. */
function decideStaleAction(
  state: DestinationState,
  force: boolean,
): "remove" | "orphan" | undefined {
  if (state.kind !== "managed") return undefined;

  return !state.modified || force ? "remove" : "orphan";
}

function planDestination(
  destinationRoot: string,
  shippedSkills: Map<string, ShippedSkill>,
  force: boolean,
): DestinationPlan {
  const planned: PlannedSkill[] = [];
  const conflicts: string[] = [];
  const orphans: string[] = [];

  for (const [skillName, shipped] of shippedSkills) {
    const skillRoot = join(destinationRoot, skillName);
    const action = decideShippedAction(readDestinationState(skillRoot), shipped.metadata, force);
    if (!action) conflicts.push(skillRoot);
    else if (action === "add" || action === "update") {
      planned.push({ action, skillName, destinationRoot, shipped });
    } else planned.push({ action, skillName, destinationRoot });
  }

  for (const skillName of listDirectoryNames(destinationRoot)) {
    if (shippedSkills.has(skillName)) continue;

    // A staging directory left by an interrupted run is ours regardless of content.
    if (skillName.endsWith(STAGING_SUFFIX)) {
      planned.push({ action: "remove", skillName, destinationRoot });
      continue;
    }

    const action = decideStaleAction(readDestinationState(join(destinationRoot, skillName)), force);
    if (action === "orphan") orphans.push(skillName);
    else if (action) planned.push({ action, skillName, destinationRoot });
  }

  return { destinationRoot, planned, conflicts, orphans };
}

/**
 * Asks once per skill name rather than once per harness directory, since both
 * copies came from the same shipped skill and the answer applies to both.
 */
async function planOrphans(
  plans: DestinationPlan[],
  version: string,
  confirm: (question: string) => Promise<boolean>,
): Promise<void> {
  const orphanNames = new Set(plans.flatMap((plan) => plan.orphans));
  for (const skillName of orphanNames) {
    const remove = await confirm(
      `Skill ${skillName} was edited locally and Hydrogen ${version} no longer ships it. Remove it?`,
    );
    const action = remove ? "remove" : "keep";
    for (const plan of plans) {
      if (plan.orphans.includes(skillName)) {
        plan.planned.push({ action, skillName, destinationRoot: plan.destinationRoot });
      }
    }
  }
}

function canPromptInTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY) && !process.env.CI;
}

async function confirmInTerminal(question: string): Promise<boolean> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await readline.question(`${question} [Y/n] `)).trim().toLowerCase();
    return answer === "" || answer === "y" || answer === "yes";
  } finally {
    readline.close();
  }
}

/** Never removes user edits without an answer, so no TTY means keep. */
function confirmByDefault(question: string): Promise<boolean> {
  return canPromptInTerminal() ? confirmInTerminal(question) : Promise.resolve(false);
}

/**
 * Stages the full copy next to the destination and swaps it in last, so an
 * interrupted run never leaves a half-written skill that a later sync would
 * mistake for user content.
 */
function installSkill(destinationRoot: string, skillRoot: string, shipped: ShippedSkill): void {
  const stagingRoot = skillRoot + STAGING_SUFFIX;
  mkdirSync(destinationRoot, { recursive: true });
  rmSync(stagingRoot, { recursive: true, force: true });
  cpSync(shipped.sourceRoot, stagingRoot, { recursive: true });
  writeFileSync(join(stagingRoot, SKILL_FILE_NAME), shipped.skillFile);
  rmSync(skillRoot, { recursive: true, force: true });
  renameSync(stagingRoot, skillRoot);
}

function executePlan(destinationRoot: string, planned: PlannedSkill[]): SyncSkillsRootResult {
  const result: SyncSkillsRootResult = {
    root: destinationRoot,
    added: 0,
    updated: 0,
    unchanged: 0,
    removed: 0,
    skipped: [],
    kept: [],
  };

  for (const skill of planned) {
    const skillRoot = join(destinationRoot, skill.skillName);
    switch (skill.action) {
      case "skip":
        result.skipped.push(skillRoot);
        break;
      case "keep":
        result.kept.push(skillRoot);
        break;
      case "unchanged":
        result.unchanged += 1;
        break;
      case "remove":
        rmSync(skillRoot, { recursive: true, force: true });
        result.removed += 1;
        break;
      case "add":
        installSkill(destinationRoot, skillRoot, skill.shipped);
        result.added += 1;
        break;
      case "update":
        installSkill(destinationRoot, skillRoot, skill.shipped);
        result.updated += 1;
        break;
    }
  }

  return result;
}

function parseSyncArgs(args: string[]): { force: boolean } {
  const { values } = parseArgs({
    args,
    options: { force: { type: "boolean", default: false } },
    strict: true,
  });

  return { force: values.force };
}

export async function syncSkills(options: SyncSkillsOptions = {}): Promise<SyncSkillsResult> {
  const appRoot = options.cwd ?? process.cwd();
  const log = options.log ?? console.log;
  const confirm = options.confirm ?? confirmByDefault;
  const { force } = parseSyncArgs(options.args ?? []);
  const packageRoot = options.packageRoot ?? getInstalledPackageRoot(appRoot) ?? getPackageRoot();
  const sourceSkillsRoot = join(packageRoot, SKILLS_DIRECTORY_NAME);
  assertDirectory(sourceSkillsRoot, `No packaged skills found at ${sourceSkillsRoot}.`);

  const version = readPackageVersion(packageRoot);
  const shippedSkills = new Map(
    listDirectoryNames(sourceSkillsRoot).map((skillName) => [
      skillName,
      readShippedSkill(sourceSkillsRoot, skillName, version),
    ]),
  );
  const destinationRoots = getSkillsDestinationRoots(appRoot);
  const plans = destinationRoots.map((destinationRoot) =>
    planDestination(destinationRoot, shippedSkills, force),
  );

  const conflicts = plans.flatMap((plan) => plan.conflicts);
  if (conflicts.length > 0) {
    throw new Error(
      `Skill directories exist that Hydrogen did not create: ${conflicts.join(", ")}. Remove them or rerun with --force to overwrite.`,
    );
  }

  // Prompt only once the run is known to be conflict-free, so nobody answers
  // questions for a sync that then refuses to write.
  await planOrphans(plans, version, confirm);

  const roots = plans.map((plan) => executePlan(plan.destinationRoot, plan.planned));
  for (const root of roots) {
    log(
      `Synced Hydrogen ${version} skills to ${root.root}: ${root.added} added, ${root.updated} updated, ${root.unchanged} unchanged, ${root.removed} removed.`,
    );
  }

  const skipped = roots.flatMap((root) => root.skipped);
  if (skipped.length > 0) {
    log(
      `Skipped ${skipped.length} locally modified skill(s): ${skipped.join(", ")}. Rerun with --force to overwrite.`,
    );
  }

  const kept = roots.flatMap((root) => root.kept);
  if (kept.length > 0) {
    log(
      [
        "",
        `WARNING: Hydrogen ${version} no longer ships these skills, but they were edited locally so they were kept:`,
        ...kept.map((skillRoot) => `  - ${skillRoot}`),
        "Delete them yourself, or rerun with --force to remove them.",
        "",
      ].join("\n"),
    );
  }

  return { version, roots };
}
