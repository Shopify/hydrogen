import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, isAbsolute, join, parse, relative, resolve } from "node:path";
import type * as NodePath from "node:path";
import { parseArgs } from "node:util";

import { createGraphQLPluginConfig, GRAPHQL_SCHEMA_FILE_NAMES } from "../graphql/plugin-config";

const GQL_TADA_CLI_PATH_FROM_PACKAGE_ROOT = "bin/cli.js";
const PACKAGE_ROOT_FROM_CLI_MODULE = "../../";
const SUCCESS_EXIT_CODE = 0;
const TSCONFIG_FILE_NAME = "tsconfig.json";
const TEMPORARY_TSCONFIG_PREFIX = ".hydrogen-gql-";
const TEMPORARY_SCHEMA_DIRECTORY_SUFFIX = "-schemas";
const PACKAGE_SCHEMA_DIRECTORY = "dist";
const CHECK_LEVELS = new Set(["info", "warn", "error"]);

interface RunCommandOptions {
  cwd: string;
}

type RunCommand = (command: string, args: string[], options: RunCommandOptions) => Promise<void>;

interface CheckGraphQLOptions {
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

type PathApi = Pick<typeof NodePath, "basename" | "dirname" | "isAbsolute" | "join" | "relative">;

const nodePathApi: PathApi = { basename, dirname, isAbsolute, join, relative };

/**
 * gql.tada tries `new URL(schema)` before falling back to a file read. On Windows an absolute
 * path such as `C:\\x\\y.json` parses as a URL (protocol `c:`), so the schema would be fetched
 * over the network. A relative path is not a valid URL and is read from disk instead.
 */
export function getSchemaDirectory(
  temporaryTsconfigPath: string,
  packageRoot: string,
  pathApi: PathApi = nodePathApi,
): string {
  return pathApi.relative(
    pathApi.dirname(temporaryTsconfigPath),
    pathApi.join(packageRoot, PACKAGE_SCHEMA_DIRECTORY),
  );
}

interface SchemaLocation {
  /** The schema directory to give gql.tada, relative to the temporary tsconfig. */
  schemaDirectory: string;
  /** Whether the schemas must first be copied to `temporarySchemaDirectoryPath`. */
  copySchemas: boolean;
}

/**
 * `path.relative` cannot go from one Windows drive to another, so when the project and the
 * Hydrogen package are on different drives the schema directory stays absolute, and gql.tada
 * would fetch it as a URL. In that case the schemas are copied next to the temporary tsconfig
 * and referenced by the relative name of their temporary directory.
 */
export function getSchemaLocation(
  temporaryTsconfigPath: string,
  packageRoot: string,
  temporarySchemaDirectoryPath: string,
  pathApi: PathApi = nodePathApi,
): SchemaLocation {
  const schemaDirectory = getSchemaDirectory(temporaryTsconfigPath, packageRoot, pathApi);
  if (!pathApi.isAbsolute(schemaDirectory)) return { schemaDirectory, copySchemas: false };

  return { schemaDirectory: pathApi.basename(temporarySchemaDirectoryPath), copySchemas: true };
}

function copySchemaFiles(packageRoot: string, temporarySchemaDirectoryPath: string): void {
  for (const fileName of GRAPHQL_SCHEMA_FILE_NAMES) {
    copyFileSync(
      join(packageRoot, PACKAGE_SCHEMA_DIRECTORY, fileName),
      join(temporarySchemaDirectoryPath, fileName),
    );
  }
}

export async function checkGraphQL(options: CheckGraphQLOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const packageRoot = options.packageRoot ?? getPackageRoot();
  const gqlTadaCliPath = options.gqlTadaCliPath ?? getGqlTadaCliPath();
  const runCommand = options.runCommand ?? spawnRunCommand;
  const values = parseCheckArgs(options.args ?? []);
  const tsconfigPath = findTsconfig(cwd, values.tsconfig);
  const temporaryPathPrefix = join(
    dirname(tsconfigPath),
    `${TEMPORARY_TSCONFIG_PREFIX}${randomUUID()}`,
  );
  const temporaryTsconfigPath = `${temporaryPathPrefix}.json`;
  const temporarySchemaDirectoryPath = `${temporaryPathPrefix}${TEMPORARY_SCHEMA_DIRECTORY_SUFFIX}`;
  const schemaLocation = getSchemaLocation(
    temporaryTsconfigPath,
    packageRoot,
    temporarySchemaDirectoryPath,
  );
  const pluginConfig = createGraphQLPluginConfig(schemaLocation.schemaDirectory);

  // Only remove what this run created, so a name clash never deletes someone else's files.
  let createdTsconfig = false;
  let createdSchemaDirectory = false;
  const cleanup = () => {
    if (createdTsconfig) rmSync(temporaryTsconfigPath, { force: true });
    if (createdSchemaDirectory) {
      rmSync(temporarySchemaDirectoryPath, { recursive: true, force: true });
    }
  };
  process.once("exit", cleanup);
  try {
    if (schemaLocation.copySchemas) {
      mkdirSync(temporarySchemaDirectoryPath);
      createdSchemaDirectory = true;
      copySchemaFiles(packageRoot, temporarySchemaDirectoryPath);
    }

    writeFileSync(
      temporaryTsconfigPath,
      JSON.stringify({
        extends: tsconfigPath,
        compilerOptions: { plugins: [pluginConfig] },
      }),
      { flag: "wx" },
    );
    createdTsconfig = true;

    const cliArgs = [
      gqlTadaCliPath,
      "check",
      "--tsconfig",
      temporaryTsconfigPath,
      "--level",
      values.level,
    ];
    if (values["fail-on-warn"]) cliArgs.push("--fail-on-warn");

    await runCommand(process.execPath, cliArgs, { cwd });
  } finally {
    process.off("exit", cleanup);
    cleanup();
  }
}
