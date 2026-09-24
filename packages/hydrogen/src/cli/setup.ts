import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { createInterface } from "node:readline/promises";

import { isObjectRecord } from "../core/utils/record";
import { getInstalledPackageRoot, syncSkills } from "./skills";
import { canPromptInTerminal } from "./terminal";

const PACKAGE_NAME = "@shopify/hydrogen";
const PACKAGE_INSTALL_SPEC = `${PACKAGE_NAME}@preview`;
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

interface SetupHydrogenOptions {
  /** Forwarded to `skills sync`, so `hydrogen setup --force` overwrites like `hydrogen skills sync --force`. */
  force?: boolean;
  cwd?: string;
  packageRoot?: string;
  env?: Record<string, string | undefined>;
  runCommand?: RunCommand;
  log?: (message: string) => void;
  /** Override the interactive prompt for testing. When omitted, prompts only in an interactive non-CI terminal; otherwise defaults to skills-only. */
  prompt?: (log: (message: string) => void) => Promise<SetupChoice>;
}

function getStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isObjectRecord(value)) return undefined;

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
  if (!isObjectRecord(parsed)) {
    throw new Error(`${PACKAGE_JSON_FILE_NAME} must contain a JSON object.`);
  }

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

function detectPackageManagerFromEnv(
  env: Record<string, string | undefined>,
): PackageManager | undefined {
  return parsePackageManager(env.npm_config_user_agent);
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

  return detectPackageManagerFromEnv(env) ?? "npm";
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

// TODO: Update branch from "dist-preview" to "dist" before GA launch
const TEMPLATE_TARBALL_URL = "https://codeload.github.com/Shopify/hydrogen/tar.gz/dist-preview";
const TEMPLATE_TARBALL_PREFIX = "hydrogen-dist-preview/templates/react-router/";
const TEMPLATE_TARBALL_STRIP_COMPONENTS = TEMPLATE_TARBALL_PREFIX.split("/").filter(Boolean).length;

type SetupChoice = "scaffold" | "skills";

async function promptSetupChoice(log: (message: string) => void): Promise<SetupChoice> {
  log("\nNo project found in this directory.\n");
  log("  1) Create a new Hydrogen storefront (React Router)");
  log("  2) Just install Hydrogen skills\n");

  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      const answer = (await readline.question("Your choice [1] ")).trim();
      if (answer === "" || answer === "1") return "scaffold";
      if (answer === "2") return "skills";
      log('Please enter "1" or "2".');
    }
  } finally {
    readline.close();
  }
}

function hasPackageJson(appRoot: string): boolean {
  return existsSync(join(appRoot, PACKAGE_JSON_FILE_NAME));
}

async function downloadAndExtractTemplate(appRoot: string, runCommand: RunCommand): Promise<void> {
  const response = await fetch(TEMPLATE_TARBALL_URL, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(
      `Failed to download template (${response.status}). Check your internet connection.`,
    );
  }

  const tempDir = mkdtempSync(join(tmpdir(), "hydrogen-template-"));
  const tempFile = "template.tar.gz";
  try {
    writeFileSync(join(tempDir, tempFile), Buffer.from(await response.arrayBuffer()));
    await runCommand(
      "tar",
      [
        "xzf",
        tempFile,
        `--strip-components=${TEMPLATE_TARBALL_STRIP_COMPONENTS}`,
        "-C",
        appRoot,
        TEMPLATE_TARBALL_PREFIX,
      ],
      { cwd: tempDir },
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function updateScaffoldedPackageJson(appRoot: string): void {
  const packageJsonPath = join(appRoot, PACKAGE_JSON_FILE_NAME);
  const raw = readFileSync(packageJsonPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!isObjectRecord(parsed)) return;

  parsed.name = basename(appRoot);
  delete parsed.private;
  delete parsed.packageManager;

  writeFileSync(packageJsonPath, JSON.stringify(parsed, null, 2) + "\n");
}

async function scaffoldTemplate(
  appRoot: string,
  env: Record<string, string | undefined>,
  runCommand: RunCommand,
  log: (message: string) => void,
): Promise<string> {
  log("Downloading Hydrogen template...");
  await downloadAndExtractTemplate(appRoot, runCommand);

  updateScaffoldedPackageJson(appRoot);

  const packageManager = detectPackageManagerFromEnv(env) ?? "npm";
  log(`Installing dependencies with ${packageManager}...`);
  try {
    await runCommand(packageManager, ["install"], { cwd: appRoot });
  } catch (error) {
    throw new Error(
      `Template was created but dependency install failed. Run \`${packageManager} install\` or re-run \`npx @shopify/hydrogen setup\` in ${appRoot} to finish.`,
      { cause: error },
    );
  }

  return packageManager;
}

async function ensureHydrogenInstalled(
  appRoot: string,
  env: Record<string, string | undefined>,
  runCommand: RunCommand,
  log: (message: string) => void,
): Promise<void> {
  const packageJson = readPackageJson(appRoot);

  if (hasHydrogenDependency(packageJson) && getInstalledPackageRoot(appRoot)) return;

  if (hasHydrogenDependency(packageJson)) {
    const packageManager = detectPackageManager(appRoot, packageJson, env);
    log(`${PACKAGE_NAME} is declared but not installed. Running ${packageManager} install...`);
    await runCommand(packageManager, ["install"], { cwd: appRoot });
    return;
  }

  const packageManager = detectPackageManager(appRoot, packageJson, env);
  log(`Installing ${PACKAGE_NAME} with ${packageManager}...`);
  await installHydrogen(appRoot, packageManager, runCommand);
}

interface ResolvedSetupOptions {
  appRoot: string;
  env: Record<string, string | undefined>;
  runCommand: RunCommand;
  log: (message: string) => void;
  prompt: ((log: (message: string) => void) => Promise<SetupChoice>) | undefined;
}

function resolveSetupOptions(options: SetupHydrogenOptions): ResolvedSetupOptions {
  const env = options.env ?? process.env;
  return {
    appRoot: options.cwd ?? process.cwd(),
    env,
    runCommand: options.runCommand ?? spawnRunCommand,
    log: options.log ?? console.log,
    prompt: options.prompt ?? (canPromptInTerminal(env) ? promptSetupChoice : undefined),
  };
}

const IGNORED_DIRECTORY_ENTRIES = new Set([".git", ".DS_Store"]);

function isEmptyDirectory(dir: string): boolean {
  return readdirSync(dir).every((entry) => IGNORED_DIRECTORY_ENTRIES.has(entry));
}

export async function setupHydrogen(options: SetupHydrogenOptions = {}): Promise<void> {
  const { appRoot, env, runCommand, log, prompt } = resolveSetupOptions(options);

  if (hasPackageJson(appRoot)) {
    await ensureHydrogenInstalled(appRoot, env, runCommand, log);
  } else if (isEmptyDirectory(appRoot)) {
    let choice: SetupChoice;
    if (prompt) {
      choice = await prompt(log);
    } else {
      log("No package.json found and no terminal to prompt; installing skills only.");
      choice = "skills";
    }

    if (choice === "scaffold") {
      const packageManager = await scaffoldTemplate(appRoot, env, runCommand, log);
      log(
        `\nHydrogen storefront created. Run \`${packageManager} run dev\` to start (uses mock.shop by default).\n`,
      );
    }
  } else {
    throw new Error("No package.json found. Run this command from your project root.");
  }

  await syncSkills({ force: options.force, cwd: appRoot, packageRoot: options.packageRoot, log });
}
