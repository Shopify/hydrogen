import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, parse, resolve } from "node:path";
import { parseArgs } from "node:util";

import { createGraphQLPluginConfig } from "../graphql/plugin-config";

const GQL_TADA_CLI_PATH_FROM_PACKAGE_ROOT = "bin/cli.js";
const PACKAGE_ROOT_FROM_CLI_MODULE = "../../";
const SUCCESS_EXIT_CODE = 0;
const TSCONFIG_FILE_NAME = "tsconfig.json";
const TEMPORARY_TSCONFIG_PREFIX = ".hydrogen-gql-";
const CHECK_LEVELS = new Set(["info", "warn", "error"]);

interface RunCommandOptions {
  cwd: string;
}

type RunCommand = (command: string, args: string[], options: RunCommandOptions) => Promise<void>;

export interface CheckGraphQLOptions {
  args?: string[];
  cwd?: string;
  gqlTadaCliPath?: string;
  packageRoot?: string;
  runCommand?: RunCommand;
}

function findTsconfig(cwd: string, configuredPath: string | undefined): string {
  if (configuredPath) return resolve(cwd, configuredPath);

  let directory = cwd;
  const root = parse(directory).root;
  while (directory !== root) {
    const candidate = join(directory, TSCONFIG_FILE_NAME);
    if (existsSync(candidate)) return candidate;
    directory = dirname(directory);
  }

  const rootCandidate = join(root, TSCONFIG_FILE_NAME);
  if (existsSync(rootCandidate)) return rootCandidate;
  throw new Error(`Could not find ${TSCONFIG_FILE_NAME}.`);
}

function spawnRunCommand(
  command: string,
  args: string[],
  options: RunCommandOptions,
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === SUCCESS_EXIT_CODE) {
        resolvePromise();
        return;
      }

      reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(" ")}`));
    });
  });
}

function getPackageRoot(): string {
  return resolve(import.meta.dirname, PACKAGE_ROOT_FROM_CLI_MODULE);
}

function getGqlTadaCliPath(): string {
  const require = createRequire(import.meta.url);
  const gqlTadaPackageRoot = dirname(require.resolve("gql.tada/package.json"));
  return join(gqlTadaPackageRoot, GQL_TADA_CLI_PATH_FROM_PACKAGE_ROOT);
}

function parseCheckArgs(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      "fail-on-warn": { type: "boolean", short: "w", default: false },
      level: { type: "string", short: "l", default: "info" },
      tsconfig: { type: "string", short: "c" },
    },
    strict: true,
  });

  if (!CHECK_LEVELS.has(values.level)) {
    throw new Error(`Invalid diagnostic level: ${values.level}`);
  }

  return values;
}

export async function checkGraphQL(options: CheckGraphQLOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const packageRoot = options.packageRoot ?? getPackageRoot();
  const gqlTadaCliPath = options.gqlTadaCliPath ?? getGqlTadaCliPath();
  const runCommand = options.runCommand ?? spawnRunCommand;
  const values = parseCheckArgs(options.args ?? []);
  const tsconfigPath = findTsconfig(cwd, values.tsconfig);
  const temporaryTsconfigPath = join(
    dirname(tsconfigPath),
    `${TEMPORARY_TSCONFIG_PREFIX}${randomUUID()}.json`,
  );
  const pluginConfig = createGraphQLPluginConfig(join(packageRoot, "dist"));

  writeFileSync(
    temporaryTsconfigPath,
    JSON.stringify({
      extends: tsconfigPath,
      compilerOptions: { plugins: [pluginConfig] },
    }),
    { flag: "wx" },
  );

  const cliArgs = [
    gqlTadaCliPath,
    "check",
    "--tsconfig",
    temporaryTsconfigPath,
    "--level",
    values.level,
  ];
  if (values["fail-on-warn"]) cliArgs.push("--fail-on-warn");

  const cleanup = () => rmSync(temporaryTsconfigPath, { force: true });
  process.once("exit", cleanup);
  try {
    await runCommand(process.execPath, cliArgs, { cwd });
  } finally {
    process.off("exit", cleanup);
    cleanup();
  }
}
