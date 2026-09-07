import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { isObjectRecord } from "../core/utils/record";

const PACKAGE_NAME = "@shopify/hydrogen";
const PACKAGE_ROOT_FROM_CLI_MODULE = "../../";
const SKILLS_DIRECTORY_NAME = "skills";
const SKILL_FILE_NAME = "SKILL.md";
const CLAUDE_DIRECTORY_NAME = ".claude";
const AGENTS_DIRECTORY_NAME = ".agents";
const NODE_MODULES_DIRECTORY_NAME = "node_modules";
const PACKAGE_JSON_FILE_NAME = "package.json";
const HASH_ALGORITHM = "sha256";
const FRONTMATTER_DELIMITER = "---";
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/;
const MANAGED_SOURCE_PATTERN = /^\s+source:\s*"?@shopify\/hydrogen"?\s*$/m;

interface SkillMetadata {
  version: string;
  hash: string;
}

type InstallAction = "add" | "update";
type SkillAction = InstallAction | "unchanged" | "remove" | "skip";

interface PlannedSkillBase {
  skillName: string;
  destinationRoot: string;
}

type PlannedSkill =
  | (PlannedSkillBase & { action: InstallAction; sourceHash: string })
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

export function resolvePackageRoot(appRoot: string, packageRoot?: string): string {
  return packageRoot ?? getLocalPackageRoot(appRoot) ?? getPackageRoot();
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

function buildMetadataBlock(metadata: SkillMetadata): string {
  return [
    "metadata:",
    `  source: "${PACKAGE_NAME}"`,
    `  version: "${metadata.version}"`,
    `  hash: "${metadata.hash}"`,
  ].join("\n");
}

function stripMetadataBlock(skillFileContent: string, metadata: SkillMetadata): string {
  return skillFileContent.replace(`${buildMetadataBlock(metadata)}\n`, "");
}

/**
 * Hashes every file in a skill directory. Line endings are normalized so a skill
 * checked out through git autocrlf still verifies against the hash written on
 * another platform. The dest SKILL.md carries the metadata block that was
 * injected on copy; callers strip it so dest and source hash the same bytes.
 */
function hashSkillDirectory(skillRoot: string, metadataToStrip?: SkillMetadata): string {
  const hash = createHash(HASH_ALGORITHM);

  for (const relativePath of listFilesRecursively(skillRoot)) {
    let content = readFileSync(join(skillRoot, relativePath), "utf8").replaceAll("\r\n", "\n");
    if (relativePath === SKILL_FILE_NAME && metadataToStrip) {
      content = stripMetadataBlock(content, metadataToStrip);
    }

    hash.update(relativePath);
    hash.update("\0");
    hash.update(content);
    hash.update("\0");
  }

  return `${HASH_ALGORITHM}:${hash.digest("hex")}`;
}

function readFrontmatter(skillFilePath: string): string | undefined {
  if (!existsSync(skillFilePath)) return undefined;

  return FRONTMATTER_PATTERN.exec(readFileSync(skillFilePath, "utf8"))?.[1];
}

function readManagedMetadata(skillRoot: string): SkillMetadata | undefined {
  const frontmatter = readFrontmatter(join(skillRoot, SKILL_FILE_NAME));
  if (frontmatter === undefined || !MANAGED_SOURCE_PATTERN.test(frontmatter)) return undefined;

  const version = /^\s+version:\s*"([^"\n]*)"\s*$/m.exec(frontmatter)?.[1] ?? "";
  const hash = /^\s+hash:\s*"([^"\n]*)"\s*$/m.exec(frontmatter)?.[1] ?? "";
  return { version, hash };
}

function isUnmodified(skillRoot: string, metadata: SkillMetadata): boolean {
  return hashSkillDirectory(skillRoot, metadata) === metadata.hash;
}

function injectMetadata(skillFilePath: string, metadata: SkillMetadata): void {
  const content = readFileSync(skillFilePath, "utf8");
  const frontmatterMatch = FRONTMATTER_PATTERN.exec(content);
  if (!frontmatterMatch) {
    throw new Error(`${skillFilePath} has no frontmatter to record Hydrogen metadata in.`);
  }

  const [fullMatch, frontmatter] = frontmatterMatch;
  if (/^metadata:/m.test(frontmatter)) {
    throw new Error(`${skillFilePath} already declares frontmatter metadata.`);
  }

  const withMetadata = [
    FRONTMATTER_DELIMITER,
    frontmatter,
    buildMetadataBlock(metadata),
    FRONTMATTER_DELIMITER,
    "",
  ].join("\n");
  writeFileSync(skillFilePath, withMetadata + content.slice(fullMatch.length));
}

/**
 * Decides what to do with a destination directory that shares a shipped skill's
 * name. Returns undefined when the directory is user content we must not touch.
 */
function classifyShippedSkill(
  skillRoot: string,
  sourceHash: string,
  force: boolean,
): Extract<SkillAction, InstallAction | "unchanged" | "skip"> | undefined {
  if (!existsSync(skillRoot)) return "add";

  // A directory without SKILL.md is a partial copy, never user content.
  if (!existsSync(join(skillRoot, SKILL_FILE_NAME))) return "update";

  const metadata = readManagedMetadata(skillRoot);
  if (!metadata) return force ? "update" : undefined;
  if (!force && !isUnmodified(skillRoot, metadata)) return "skip";

  return metadata.hash === sourceHash ? "unchanged" : "update";
}

function classifyStaleSkill(
  skillRoot: string,
  force: boolean,
): Extract<SkillAction, "remove" | "skip"> | undefined {
  const metadata = readManagedMetadata(skillRoot);
  if (!metadata) return undefined;

  return force || isUnmodified(skillRoot, metadata) ? "remove" : "skip";
}

function planDestination(
  destinationRoot: string,
  shippedSkills: Map<string, string>,
  force: boolean,
): { planned: PlannedSkill[]; conflicts: string[] } {
  const planned: PlannedSkill[] = [];
  const conflicts: string[] = [];

  for (const [skillName, sourceHash] of shippedSkills) {
    const skillRoot = join(destinationRoot, skillName);
    const action = classifyShippedSkill(skillRoot, sourceHash, force);
    if (!action) conflicts.push(skillRoot);
    else if (action === "add" || action === "update") {
      planned.push({ action, skillName, destinationRoot, sourceHash });
    } else planned.push({ action, skillName, destinationRoot });
  }

  for (const skillName of listDirectoryNames(destinationRoot)) {
    if (shippedSkills.has(skillName)) continue;

    const action = classifyStaleSkill(join(destinationRoot, skillName), force);
    if (action) planned.push({ action, skillName, destinationRoot });
  }

  return { planned, conflicts };
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
  const packageRoot = resolvePackageRoot(appRoot, options.packageRoot);
  const sourceSkillsRoot = join(packageRoot, SKILLS_DIRECTORY_NAME);
  assertDirectory(sourceSkillsRoot, `No packaged skills found at ${sourceSkillsRoot}.`);

  const version = readPackageVersion(packageRoot);
  const shippedSkills = new Map(
    listDirectoryNames(sourceSkillsRoot).map((skillName) => [
      skillName,
      hashSkillDirectory(join(sourceSkillsRoot, skillName)),
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

  const result: SyncSkillsResult = {
    destinationRoots,
    added: 0,
    updated: 0,
    unchanged: 0,
    removed: 0,
    skipped: [],
  };

  for (const planned of plans.flatMap((plan) => plan.planned)) {
    const skillRoot = join(planned.destinationRoot, planned.skillName);
    if (planned.action === "skip") {
      result.skipped.push(skillRoot);
      continue;
    }
    if (planned.action === "unchanged") {
      result.unchanged += 1;
      continue;
    }

    rmSync(skillRoot, { recursive: true, force: true });
    if (planned.action === "remove") {
      result.removed += 1;
      continue;
    }

    mkdirSync(planned.destinationRoot, { recursive: true });
    cpSync(join(sourceSkillsRoot, planned.skillName), skillRoot, { recursive: true });
    injectMetadata(join(skillRoot, SKILL_FILE_NAME), { version, hash: planned.sourceHash });
    if (planned.action === "add") result.added += 1;
    else result.updated += 1;
  }

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
