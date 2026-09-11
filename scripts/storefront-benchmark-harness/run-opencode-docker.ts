#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_IMAGE = "hydrogen-benchmark-opencode";
const DEFAULT_WORKSPACE = ".storefront-benchmark-workspace";
const WORKSPACE_MARKER_FILE = ".storefront-benchmark-workspace";
const DEFAULT_COLIMA_PROFILE = "default";
const DOCKER_UNIX_SCHEME = "unix://";
const HARNESS_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATE_DIR = join(HARNESS_DIR, "workspace-template");
const DEFAULT_HYDROGEN_PACKAGE_ROOT = resolve(HARNESS_DIR, "../../packages/hydrogen");
const VENDOR_DIRECTORY_NAME = "vendor";
const HYDROGEN_TARBALL_NAME = "hydrogen.tgz";
const SUCCESS_STATUS = 0;
const DOCKER_COMMAND_INDEX = 0;
const DOCKER_RUN_COMMAND = "run";
const SPAWN_TIMEOUT_CODE = "ETIMEDOUT";
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const BENCHMARK_RUN_TIMEOUT_IN_MINUTES = 40;
const LLM_API_TOKEN_ENV_VAR = "LLM_API_TOKEN";
const LLM_API_BASE_URL_ENV_VAR = "LLM_API_BASE_URL";
export const BENCHMARK_RUN_TIMEOUT_IN_MILLISECONDS =
  BENCHMARK_RUN_TIMEOUT_IN_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

interface HostConfig {
  image: string;
  workspace: string;
  prompt: string;
  skipBuild: boolean;
}

type DockerEnv = Record<string, string | undefined>;

type SpawnResult = {
  status?: number | null;
  error?: Error & { code?: string };
  stdout?: string | Buffer;
  stderr?: string | Buffer;
};

type SpawnFn = (command: string, args: string[], options: Record<string, unknown>) => SpawnResult;

type DockerCheckResult = { ok: true } | { ok: false; message: string };
type DockerRuntimeResult = { ok: true; env: DockerEnv } | { ok: false; message: string };

export function parseOpenCodeHostArgs(args: string[]): HostConfig {
  const config = {
    image: DEFAULT_IMAGE,
    workspace: DEFAULT_WORKSPACE,
    prompt: "",
    skipBuild: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--skip-build") {
      config.skipBuild = true;
      continue;
    }
    if (arg === "--image") {
      config.image = readFlagValue(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === "--workspace") {
      config.workspace = readFlagValue(args, index, arg);
      index += 1;
      continue;
    }
    config.prompt = [...args.slice(index)].join(" ");
    break;
  }

  return config;
}

export function buildOpenCodeDockerBuildArgs({ image }: { image: string }): string[] {
  return ["build", "--tag", image, HARNESS_DIR];
}

export function buildOpenCodeDockerRunArgs({
  image,
  workspacePath,
  prompt,
}: {
  image: string;
  workspacePath: string;
  prompt: string;
}): string[] {
  const args = [
    "run",
    "--rm",
    "--network",
    "bridge",
    "-e",
    LLM_API_TOKEN_ENV_VAR,
    "-e",
    LLM_API_BASE_URL_ENV_VAR,
    "-e",
    "OPENCODE_MODEL",
    "-e",
    "OPENCODE_VARIANT",
    "-e",
    "BENCHMARK_DISABLE_THINKING",
    "-e",
    "BENCHMARK_OPENCODE_EVENTS_PATH",
    "-e",
    "BENCHMARK_OPENCODE_SESSION_PATH",
    "-e",
    "BENCHMARK_OPENCODE_OUTPUT_PATH",
    "-v",
    `${workspacePath}:/workspace`,
    "--mount",
    "type=volume,target=/workspace/node_modules",
    "-w",
    "/workspace",
    image,
  ];
  if (prompt) args.push(prompt);
  return args;
}

export function prepareBenchmarkWorkspace({
  workspacePath,
  templatePath = DEFAULT_TEMPLATE_DIR,
}: {
  workspacePath: string;
  templatePath?: string;
}): void {
  assertSafeWorkspacePath(workspacePath);
  rmSync(workspacePath, { recursive: true, force: true });
  mkdirSync(workspacePath, { recursive: true });
  cpSync(templatePath, workspacePath, { recursive: true });
  writeFileSync(
    join(workspacePath, WORKSPACE_MARKER_FILE),
    "owned by Hydrogen benchmark harness\n",
  );
}

export function stageHydrogenPackage({
  workspacePath,
  packageRoot = DEFAULT_HYDROGEN_PACKAGE_ROOT,
  spawnFn = spawnSync as SpawnFn,
}: {
  workspacePath: string;
  packageRoot?: string;
  spawnFn?: SpawnFn;
}): string {
  const vendorPath = join(workspacePath, VENDOR_DIRECTORY_NAME);
  const stableTarballPath = join(vendorPath, HYDROGEN_TARBALL_NAME);

  mkdirSync(vendorPath, { recursive: true });
  runHostCommand(spawnFn, "pnpm", ["--dir", packageRoot, "build"], {
    stdio: "inherit",
  });
  const packResult = runHostCommand(spawnFn, "npm", [
    "pack",
    packageRoot,
    "--pack-destination",
    vendorPath,
  ]);
  const packedTarballName = readPackedTarballName(packResult);
  const packedTarballPath = join(vendorPath, basename(packedTarballName));

  if (packedTarballPath !== stableTarballPath) {
    rmSync(stableTarballPath, { force: true });
    renameSync(packedTarballPath, stableTarballPath);
  }

  return stableTarballPath;
}

export function checkDockerAvailable(
  spawnFn: SpawnFn = spawnSync as SpawnFn,
  env: DockerEnv = process.env,
): DockerCheckResult {
  const result = spawnFn("docker", ["info", "--format", "{{.ServerVersion}}"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env,
  });

  if (result.error) {
    return {
      ok: false,
      message: `Docker CLI could not be started: ${result.error.message}`,
    };
  }

  if (result.status === SUCCESS_STATUS) return { ok: true };

  return {
    ok: false,
    message: formatDockerUnavailableMessage([result.stderr, result.stdout].join("\n")),
  };
}

export function resolveDockerRuntime({
  env = process.env,
  existsFn = existsSync,
  spawnFn = spawnSync as SpawnFn,
  homeDir = homedir(),
}: {
  env?: DockerEnv;
  existsFn?: (path: string) => boolean;
  spawnFn?: SpawnFn;
  homeDir?: string;
} = {}): DockerRuntimeResult {
  const directCheck = checkDockerAvailable(spawnFn, env);
  if (directCheck.ok) return { ok: true, env };

  const colimaEnv = buildColimaDockerEnv({ env, existsFn, homeDir });
  if (colimaEnv) {
    const colimaCheck = checkDockerAvailable(spawnFn, colimaEnv);
    if (colimaCheck.ok) return { ok: true, env: colimaEnv };
  }

  return { ok: false, message: directCheck.message };
}

function readFlagValue(args: string[], index: number, flagName: string): string {
  const value = args[index + 1];
  if (typeof value === "string" && value.trim()) return value;
  throw new Error(`${flagName} requires a value`);
}

function main(): void {
  const config = parseOpenCodeHostArgs(process.argv.slice(2));
  const dockerRuntime = resolveDockerRuntime();
  if (!dockerRuntime.ok) throw new Error(dockerRuntime.message);

  const workspacePath = resolve(config.workspace);
  prepareBenchmarkWorkspace({ workspacePath });
  stageHydrogenPackage({ workspacePath });

  if (!config.skipBuild)
    runDocker(buildOpenCodeDockerBuildArgs({ image: config.image }), dockerRuntime.env);
  runDocker(
    buildOpenCodeDockerRunArgs({ image: config.image, workspacePath, prompt: config.prompt }),
    dockerRuntime.env,
  );
}

function assertSafeWorkspacePath(workspacePath: string): void {
  const resolvedPath = resolve(workspacePath);
  if (resolvedPath === resolve("/"))
    throw new Error("Refusing to use filesystem root as workspace");
  if (resolvedPath === process.cwd())
    throw new Error("Refusing to reset the current project directory");
  if (existsSync(join(resolvedPath, ".git"))) {
    throw new Error("Refusing to reset a git worktree as the benchmark workspace");
  }
  if (resolvedPath !== resolve(DEFAULT_WORKSPACE) && existsSync(resolvedPath)) {
    const markerPath = join(resolvedPath, WORKSPACE_MARKER_FILE);
    if (!existsSync(markerPath)) {
      throw new Error(
        `Refusing to reset existing custom workspace without ${WORKSPACE_MARKER_FILE} marker`,
      );
    }
  }
}

export function runDocker(
  args: string[],
  env: DockerEnv,
  spawnFn: SpawnFn = spawnSync as SpawnFn,
): void {
  const result = spawnFn("docker", args, {
    stdio: "inherit",
    env,
    ...(args[DOCKER_COMMAND_INDEX] === DOCKER_RUN_COMMAND && {
      timeout: BENCHMARK_RUN_TIMEOUT_IN_MILLISECONDS,
    }),
  });
  if (isSpawnTimeout(result.error)) {
    throw new Error(`docker run timed out after ${BENCHMARK_RUN_TIMEOUT_IN_MINUTES} minutes`);
  }
  if (result.error) throw new Error(`failed to start docker: ${result.error.message}`);
  if (result.status === SUCCESS_STATUS) return;
  throw new Error(
    `docker ${args[DOCKER_COMMAND_INDEX]} failed with status ${result.status ?? "unknown"}`,
  );
}

function isSpawnTimeout(error: SpawnResult["error"]): boolean {
  return error?.code === SPAWN_TIMEOUT_CODE;
}

function runHostCommand(
  spawnFn: SpawnFn,
  command: string,
  args: string[],
  options: Record<string, unknown> = {},
): SpawnResult {
  const result = spawnFn(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
  if (result.error) throw new Error(`failed to start ${command}: ${result.error.message}`);
  if (result.status === SUCCESS_STATUS) return result;
  throw new Error(`${command} ${args.join(" ")} failed with status ${result.status ?? "unknown"}`);
}

function readPackedTarballName(result: SpawnResult): string {
  const output = String(result.stdout ?? "");
  const filename = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
  if (!filename) throw new Error("npm pack did not report a tarball filename");
  return filename;
}

function buildColimaDockerEnv({
  env,
  existsFn,
  homeDir,
}: {
  env: DockerEnv;
  existsFn: (path: string) => boolean;
  homeDir: string;
}): DockerEnv | null {
  if (env.DOCKER_HOST) return null;

  const socketPath = join(homeDir, ".colima", DEFAULT_COLIMA_PROFILE, "docker.sock");
  if (!existsFn(socketPath)) return null;

  return {
    ...env,
    DOCKER_HOST: `${DOCKER_UNIX_SCHEME}${socketPath}`,
  };
}

function formatDockerUnavailableMessage(output: string): string {
  const detail = output.trim();
  const lines = [
    "Docker daemon is not reachable.",
    "Start Docker Desktop or Rancher Desktop, then retry.",
    "If you prefer Colima and it is not installed, run `brew install colima docker docker-buildx`, then `colima start`.",
  ];
  if (detail) lines.push(`Docker said: ${detail}`);
  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "OpenCode Docker benchmark failed");
    process.exitCode = 1;
  }
}
