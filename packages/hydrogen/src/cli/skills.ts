import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { isObjectRecord } from "../core/utils/record.ts";

const PACKAGE_NAME = "@shopify/hydrogen";
const PACKAGE_ROOT_FROM_CLI_MODULE = "../../";
const SKILLS_DIRECTORY_NAME = "skills";
const SKILL_FILE_NAME = "SKILL.md";
const CLAUDE_DIRECTORY_NAME = ".claude";
const AGENTS_DIRECTORY_NAME = ".agents";
const NODE_MODULES_DIRECTORY_NAME = "node_modules";
const PACKAGE_JSON_FILE_NAME = "package.json";
const HASH_ALGORITHM = "sha256";
const STAGING_SUFFIX = ".hydrogen-sync";
const FRONTMATTER_DELIMITER = "---";
const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---(?:\n|$)/;
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
type SkillAction = InstallAction | "unchanged" | "remove" | "skip";

interface PlannedSkillBase {
  skillName: string;
  destinationRoot: string;
}

type PlannedSkill =
  | (PlannedSkillBase & { action: InstallAction; shipped: ShippedSkill })
  | (PlannedSkillBase & { action: "unchanged" })
  | (PlannedSkillBase & { action: "remove" })
  | (PlannedSkillBase & { action: "skip" });

export interface SyncSkillsResult {
  destinationRoots: string[];
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
  skipped: string[];
}

export interface SyncSkillsOptions {
  args?: string[];
  cwd?: string;
  packageRoot?: string;
  log?: (message: string) => void;
}

function assertDirectory(directoryPath: string, message: string): void {
  if (!existsSync(directoryPath) || !statSync(directoryPath).isDirectory()) {
    throw new Error(message);
  }
}

function getPackageRoot(): string {
  return fileURLToPath(new URL(PACKAGE_ROOT_FROM_CLI_MODULE, import.meta.url));
}

function getLocalPackageRoot(appRoot: string): string | undefined {
  const localPackageRoot = join(appRoot, NODE_MODULES_DIRECTORY_NAME, PACKAGE_NAME);
  if (!existsSync(localPackageRoot)) return undefined;
  assertDirectory(localPackageRoot, `${localPackageRoot} exists but is not a directory.`);

  return realpathSync(localPackageRoot);
}

function readPackageVersion(packageRoot: string): string {
  const packageJsonPath = join(packageRoot, PACKAGE_JSON_FILE_NAME);
  const parsed: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (!isObjectRecord(parsed) || typeof parsed.version !== "string") {
    throw new Error(`${packageJsonPath} must declare a string version.`);
  }

  return parsed.version;
}

function getSkillsDestinationRoots(appRoot: string): string[] {
  const destinationRoots: string[] = [];
  const claudeDirectory = join(appRoot, CLAUDE_DIRECTORY_NAME);
  if (existsSync(claudeDirectory)) {
    assertDirectory(claudeDirectory, `${CLAUDE_DIRECTORY_NAME} exists but is not a directory.`);
    destinationRoots.push(join(claudeDirectory, SKILLS_DIRECTORY_NAME));
  }

  const agentsDirectory = join(appRoot, AGENTS_DIRECTORY_NAME);
  if (existsSync(agentsDirectory)) {
    assertDirectory(agentsDirectory, `${AGENTS_DIRECTORY_NAME} exists but is not a directory.`);
    destinationRoots.push(join(agentsDirectory, SKILLS_DIRECTORY_NAME));
  }

  return destinationRoots.length > 0
    ? destinationRoots
    : [join(appRoot, AGENTS_DIRECTORY_NAME, SKILLS_DIRECTORY_NAME)];
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
    if (relativePath === SKILL_FILE_NAME) content = content.replace(METADATA_BLOCK_PATTERN, "");

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

  const [fullMatch, frontmatter] = frontmatterMatch;
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
    "\n" +
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
      if (!state.modified && current) return "unchanged";
      if (!state.modified || force) return "update";
      return "skip";
    }
  }
}

function decideStaleAction(
  state: DestinationState,
  force: boolean,
): Extract<SkillAction, "remove" | "skip"> | undefined {
  if (state.kind !== "managed") return undefined;

  return !state.modified || force ? "remove" : "skip";
}

function planDestination(
  destinationRoot: string,
  shippedSkills: Map<string, ShippedSkill>,
  force: boolean,
): { planned: PlannedSkill[]; conflicts: string[] } {
  const planned: PlannedSkill[] = [];
  const conflicts: string[] = [];

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

    const action = decideStaleAction(readDestinationState(join(destinationRoot, skillName)), force);
    if (action) planned.push({ action, skillName, destinationRoot });
  }

  return { planned, conflicts };
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

function executePlan(destinationRoots: string[], planned: PlannedSkill[]): SyncSkillsResult {
  const result: SyncSkillsResult = {
    destinationRoots,
    added: 0,
    updated: 0,
    unchanged: 0,
    removed: 0,
    skipped: [],
  };

  for (const skill of planned) {
    const skillRoot = join(skill.destinationRoot, skill.skillName);
    switch (skill.action) {
      case "skip":
        result.skipped.push(skillRoot);
        break;
      case "unchanged":
        result.unchanged += 1;
        break;
      case "remove":
        rmSync(skillRoot, { recursive: true, force: true });
        result.removed += 1;
        break;
      case "add":
        installSkill(skill.destinationRoot, skillRoot, skill.shipped);
        result.added += 1;
        break;
      case "update":
        installSkill(skill.destinationRoot, skillRoot, skill.shipped);
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

export function syncSkills(options: SyncSkillsOptions = {}): SyncSkillsResult {
  const appRoot = options.cwd ?? process.cwd();
  const log = options.log ?? console.log;
  const { force } = parseSyncArgs(options.args ?? []);
  const packageRoot = options.packageRoot ?? getLocalPackageRoot(appRoot) ?? getPackageRoot();
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

  const result = executePlan(
    destinationRoots,
    plans.flatMap((plan) => plan.planned),
  );

  log(
    `Synced Hydrogen ${version} skills to ${destinationRoots.join(", ")}: ${result.added} added, ${result.updated} updated, ${result.unchanged} unchanged, ${result.removed} removed.`,
  );
  if (result.skipped.length > 0) {
    log(
      `Skipped ${result.skipped.length} locally modified skill(s): ${result.skipped.join(", ")}. Rerun with --force to overwrite.`,
    );
  }

  return result;
}
