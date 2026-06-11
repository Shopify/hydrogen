import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_NAME = "@shopify/hydrogen";
const PACKAGE_INSTALL_SPEC = `${PACKAGE_NAME}@preview`;
const PACKAGE_ROOT_FROM_CLI_MODULE = "../../";
const SKILLS_DIRECTORY_NAME = "skills";
const CLAUDE_DIRECTORY_NAME = ".claude";
const AGENTS_DIRECTORY_NAME = ".agents";
const NODE_MODULES_DIRECTORY_NAME = "node_modules";
const PACKAGE_JSON_FILE_NAME = "package.json";
const SUCCESS_EXIT_CODE = 0;

const PACKAGE_MANAGER_LOCKFILES = [
  ["pnpm", "pnpm-lock.yaml"],
  ["yarn", "yarn.lock"],
  ["npm", "package-lock.json"],
  ["bun", "bun.lockb"],
  ["bun", "bun.lock"],
] as const;

const INSTALL_ARGS = {
  pnpm: ["add", PACKAGE_INSTALL_SPEC],
  npm: ["install", PACKAGE_INSTALL_SPEC],
  yarn: ["add", PACKAGE_INSTALL_SPEC],
  bun: ["add", PACKAGE_INSTALL_SPEC],
} as const;

type PackageManager = keyof typeof INSTALL_ARGS;

interface PackageJson {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export type RunCommand = (
  command: string,
  args: string[],
  options: { cwd: string },
) => Promise<void>;

export interface SetupHydrogenOptions {
  cwd?: string;
  packageRoot?: string;
  env?: Record<string, string | undefined>;
  runCommand?: RunCommand;
  log?: (message: string) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined;

  const entries = Object.entries(value);
  if (entries.some(([, entryValue]) => typeof entryValue !== "string")) return undefined;

  return Object.fromEntries(entries) as Record<string, string>;
}

function readPackageJson(appRoot: string): PackageJson {
  const packageJsonPath = join(appRoot, PACKAGE_JSON_FILE_NAME);
  if (!existsSync(packageJsonPath)) {
    throw new Error(`No ${PACKAGE_JSON_FILE_NAME} found. Run this command from the app root.`);
  }

  const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as unknown;
  if (!isRecord(parsed)) throw new Error(`${PACKAGE_JSON_FILE_NAME} must contain a JSON object.`);

  return {
    packageManager: typeof parsed.packageManager === "string" ? parsed.packageManager : undefined,
    dependencies: getStringRecord(parsed.dependencies),
    devDependencies: getStringRecord(parsed.devDependencies),
  };
}

function parsePackageManager(value: string | undefined): PackageManager | undefined {
  if (!value) return undefined;

  for (const packageManager of Object.keys(INSTALL_ARGS) as PackageManager[]) {
    if (value === packageManager) return packageManager;
    if (value.startsWith(`${packageManager}@`)) return packageManager;
    if (value.startsWith(`${packageManager}/`)) return packageManager;
  }
}

function detectPackageManager(
  appRoot: string,
  packageJson: PackageJson,
  env: Record<string, string | undefined>,
): PackageManager {
  const packageJsonManager = parsePackageManager(packageJson.packageManager);
  if (packageJsonManager) return packageJsonManager;

  for (const [packageManager, lockfile] of PACKAGE_MANAGER_LOCKFILES) {
    if (existsSync(join(appRoot, lockfile))) return packageManager;
  }

  const userAgentManager = parsePackageManager(env.npm_config_user_agent);
  if (userAgentManager) return userAgentManager;

  throw new Error(
    "Could not detect a package manager. Add a packageManager field or a lockfile before running setup.",
  );
}

function hasHydrogenDependency(packageJson: PackageJson): boolean {
  return Boolean(
    packageJson.dependencies?.[PACKAGE_NAME] ?? packageJson.devDependencies?.[PACKAGE_NAME],
  );
}

async function installHydrogen(
  appRoot: string,
  packageManager: PackageManager,
  runCommand: RunCommand,
): Promise<void> {
  await runCommand(packageManager, [...INSTALL_ARGS[packageManager]], { cwd: appRoot });
}

function assertDirectory(directoryPath: string, message: string): void {
  if (!existsSync(directoryPath) || !statSync(directoryPath).isDirectory()) {
    throw new Error(message);
  }
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

function getSkillNames(sourceSkillsRoot: string): string[] {
  assertDirectory(sourceSkillsRoot, `No packaged skills found at ${sourceSkillsRoot}.`);

  return readdirSync(sourceSkillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function findConflictingSkills(destinationRoot: string, skillNames: string[]): string[] {
  return skillNames.filter((skillName) => existsSync(join(destinationRoot, skillName, "SKILL.md")));
}

function removeIncompleteSkills(destinationRoot: string, skillNames: string[]): void {
  for (const skillName of skillNames) {
    const destinationPath = join(destinationRoot, skillName);
    if (!existsSync(destinationPath)) continue;
    if (existsSync(join(destinationPath, "SKILL.md"))) continue;
    rmSync(destinationPath, { recursive: true, force: true });
  }
}

function copySkills(
  packageRoot: string,
  appRoot: string,
): { destinationRoots: string[]; copiedCount: number } {
  const sourceSkillsRoot = join(packageRoot, SKILLS_DIRECTORY_NAME);
  const destinationRoots = getSkillsDestinationRoots(appRoot);
  const skillNames = getSkillNames(sourceSkillsRoot);
  const conflictingSkills = destinationRoots.flatMap((destinationRoot) =>
    findConflictingSkills(destinationRoot, skillNames).map((skillName) =>
      join(destinationRoot, skillName),
    ),
  );

  if (conflictingSkills.length > 0) {
    throw new Error(
      `Skill directories already exist: ${conflictingSkills.join(", ")}. Remove them and rerun setup.`,
    );
  }

  for (const destinationRoot of destinationRoots) {
    removeIncompleteSkills(destinationRoot, skillNames);
    mkdirSync(destinationRoot, { recursive: true });

    for (const skillName of skillNames) {
      cpSync(join(sourceSkillsRoot, skillName), join(destinationRoot, skillName), {
        recursive: true,
        errorOnExist: true,
        force: false,
      });
    }
  }

  return { destinationRoots, copiedCount: skillNames.length * destinationRoots.length };
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

function spawnRunCommand(command: string, args: string[], options: { cwd: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, stdio: "inherit" });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === SUCCESS_EXIT_CODE) {
        resolve();
        return;
      }

      reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(" ")}`));
    });
  });
}

export async function setupHydrogen(options: SetupHydrogenOptions = {}): Promise<void> {
  const appRoot = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const runCommand = options.runCommand ?? spawnRunCommand;
  const log = options.log ?? console.log;
  const packageJson = readPackageJson(appRoot);

  if (!hasHydrogenDependency(packageJson)) {
    const packageManager = detectPackageManager(appRoot, packageJson, env);
    log(`Installing ${PACKAGE_NAME} with ${packageManager}...`);
    await installHydrogen(appRoot, packageManager, runCommand);
  }

  const packageRoot = options.packageRoot ?? getLocalPackageRoot(appRoot) ?? getPackageRoot();
  const result = copySkills(packageRoot, appRoot);
  log(`Copied ${result.copiedCount} Hydrogen skills to ${result.destinationRoots.join(", ")}.`);
}
