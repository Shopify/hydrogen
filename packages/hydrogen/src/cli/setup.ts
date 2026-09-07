import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
  cwd?: string;
  packageRoot?: string;
  env?: Record<string, string | undefined>;
  runCommand?: RunCommand;
  log?: (message: string) => void;
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

  syncSkills({ cwd: appRoot, packageRoot: options.packageRoot, log });
}
