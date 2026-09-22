import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { tmpdir } from "node:os";

import { isObjectRecord } from "../core/utils/record";
import { syncSkills } from "./skills";

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
  /** Override the tarball URL for testing. */
  tarballUrl?: string;
  /** Override the interactive prompt for testing. Return `undefined` to skip prompting (CI default). */
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

  const envManager = detectPackageManagerFromEnv(env);
  if (envManager) return envManager;

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

const TEMPLATE_TARBALL_URL =
  "https://codeload.github.com/Shopify/hydrogen/tar.gz/dist-preview";
const TEMPLATE_TARBALL_PREFIX = "hydrogen-dist-preview/templates/react-router/";

type SetupChoice = "scaffold" | "skills";

function canPromptInTerminal(env: Record<string, string | undefined>): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY) && !env.CI;
}

async function promptSetupChoice(log: (message: string) => void): Promise<SetupChoice> {
  log("\nNo project found in this directory.\n");
  log("  1) Create a new Hydrogen storefront (React Router)");
  log("  2) Just install Hydrogen skills\n");

  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await readline.question("Your choice [1] ")).trim();
    return answer === "2" ? "skills" : "scaffold";
  } finally {
    readline.close();
  }
}

function hasPackageJson(appRoot: string): boolean {
  return existsSync(join(appRoot, PACKAGE_JSON_FILE_NAME));
}

async function downloadAndExtractTemplate(
  appRoot: string,
  tarballUrl: string,
  runCommand: RunCommand,
): Promise<void> {
  const response = await fetch(tarballUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(
      `Failed to download template (${response.status}). Check your internet connection.`,
    );
  }

  const tempFile = join(tmpdir(), `hydrogen-template-${Date.now()}.tar.gz`);
  try {
    writeFileSync(tempFile, Buffer.from(await response.arrayBuffer()));
    await runCommand(
      "tar",
      ["xzf", tempFile, "--strip-components=3", "-C", appRoot, TEMPLATE_TARBALL_PREFIX],
      { cwd: appRoot },
    );
  } finally {
    rmSync(tempFile, { force: true });
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
  tarballUrl: string,
): Promise<void> {
  log("Downloading Hydrogen template...");
  await downloadAndExtractTemplate(appRoot, tarballUrl, runCommand);

  updateScaffoldedPackageJson(appRoot);
  for (const [, lockfile] of PACKAGE_MANAGER_LOCKFILES) {
    rmSync(join(appRoot, lockfile), { force: true });
  }

  const packageManager = detectPackageManagerFromEnv(env) ?? "npm";
  log(`Installing dependencies with ${packageManager}...`);
  await runCommand(packageManager, ["install"], { cwd: appRoot });
}

async function ensureHydrogenInstalled(
  appRoot: string,
  env: Record<string, string | undefined>,
  runCommand: RunCommand,
  log: (message: string) => void,
): Promise<void> {
  const packageJson = readPackageJson(appRoot);
  if (hasHydrogenDependency(packageJson)) return;

  const packageManager = detectPackageManager(appRoot, packageJson, env);
  log(`Installing ${PACKAGE_NAME} with ${packageManager}...`);
  await installHydrogen(appRoot, packageManager, runCommand);
}

interface ResolvedSetupOptions {
  appRoot: string;
  env: Record<string, string | undefined>;
  runCommand: RunCommand;
  log: (message: string) => void;
  tarballUrl: string;
  prompt: ((log: (message: string) => void) => Promise<SetupChoice>) | undefined;
}

function resolveSetupOptions(options: SetupHydrogenOptions): ResolvedSetupOptions {
  const env = options.env ?? process.env;
  return {
    appRoot: options.cwd ?? process.cwd(),
    env,
    runCommand: options.runCommand ?? spawnRunCommand,
    log: options.log ?? console.log,
    tarballUrl: options.tarballUrl ?? TEMPLATE_TARBALL_URL,
    prompt: options.prompt ?? (canPromptInTerminal(env) ? promptSetupChoice : undefined),
  };
}

export async function setupHydrogen(options: SetupHydrogenOptions = {}): Promise<void> {
  const { appRoot, env, runCommand, log, tarballUrl, prompt } = resolveSetupOptions(options);

  if (hasPackageJson(appRoot)) {
    await ensureHydrogenInstalled(appRoot, env, runCommand, log);
  } else {
    const choice = prompt ? await prompt(log) : "skills";
    if (choice === "scaffold") {
      const entries = readdirSync(appRoot).filter((e) => e !== ".git");
      if (entries.length > 0) {
        throw new Error(
          "Directory is not empty. Scaffold into an empty directory or remove existing files first.",
        );
      }
      await scaffoldTemplate(appRoot, env, runCommand, log, tarballUrl);
    }
  }

  await syncSkills({ force: options.force, cwd: appRoot, packageRoot: options.packageRoot, log });
}
