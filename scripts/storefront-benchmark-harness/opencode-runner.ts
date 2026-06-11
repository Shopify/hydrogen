#!/usr/bin/env node

import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DEFAULT_MODEL = "anthropic/claude-sonnet-4-6";
const DEFAULT_OUTPUT_PATH = "benchmark-opencode-events.jsonl";
const DEFAULT_SESSION_OUTPUT_PATH = "benchmark-opencode-session.json";
const DEFAULT_SUMMARY_OUTPUT_PATH = "benchmark-opencode-output.json";
const DEFAULT_PROMPT =
  "Reply with one short sentence confirming the OpenCode benchmark harness works.";
const DEFAULT_HOME = "/home/bench";
const SUCCESS_STATUS = 0;
const NO_MALFORMED_EVENTS = 0;
const SINGULAR_COUNT = 1;
const KIBIBYTE_IN_BYTES = 1024;
const MEBIBYTE_IN_BYTES = KIBIBYTE_IN_BYTES * KIBIBYTE_IN_BYTES;
const OPENCODE_MAX_BUFFER_IN_MEBIBYTES = 50;
const OPENCODE_MAX_BUFFER_IN_BYTES = OPENCODE_MAX_BUFFER_IN_MEBIBYTES * MEBIBYTE_IN_BYTES;
const LLM_API_TOKEN_ENV_VAR = "LLM_API_TOKEN";
const LLM_API_BASE_URL_ENV_VAR = "LLM_API_BASE_URL";
const HTTPS_PROTOCOL = "https:";

type RunnerEnv = Record<string, string | undefined>;

interface OpenCodeRunnerConfig {
  token: string;
  model: string;
  baseUrl: string;
  prompt: string;
  outputPath: string;
  sessionOutputPath: string;
  summaryOutputPath: string;
  home: string;
  showThinking: boolean;
  variant?: string;
}

interface OpenCodeSummary {
  ok: boolean;
  model: string;
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  eventsPath: string;
  sessionPath: string;
  exitCode: number | null;
  stderr: string;
  sessionId?: string;
  warnings?: string[];
  error?: string;
}

interface OpenCodeEventSummary {
  sessionId?: string;
  malformedEventCount: number;
}

type SpawnFn = typeof spawnSync;

export function readOpenCodeRunnerConfig({
  env,
  args,
}: {
  env: RunnerEnv;
  args: string[];
}): OpenCodeRunnerConfig {
  return {
    token: requiredEnv(env, LLM_API_TOKEN_ENV_VAR),
    model: env.OPENCODE_MODEL ?? DEFAULT_MODEL,
    baseUrl: readBaseUrl(env),
    prompt: readPrompt({ env, args }),
    outputPath: env.BENCHMARK_OPENCODE_EVENTS_PATH ?? DEFAULT_OUTPUT_PATH,
    sessionOutputPath: env.BENCHMARK_OPENCODE_SESSION_PATH ?? DEFAULT_SESSION_OUTPUT_PATH,
    summaryOutputPath: env.BENCHMARK_OPENCODE_OUTPUT_PATH ?? DEFAULT_SUMMARY_OUTPUT_PATH,
    home: env.HOME ?? DEFAULT_HOME,
    showThinking: env.BENCHMARK_DISABLE_THINKING !== "true",
    variant: env.OPENCODE_VARIANT,
  };
}

export function buildOpenCodeConfig(config: OpenCodeRunnerConfig) {
  return {
    $schema: "https://opencode.ai/config.json",
    model: config.model,
    small_model: config.model,
    share: "disabled",
    autoupdate: false,
    provider: {
      anthropic: {
        options: {
          apiKey: config.token,
          baseURL: config.baseUrl,
        },
      },
    },
    permission: {
      bash: "allow",
      edit: "allow",
      read: "allow",
      grep: "allow",
      glob: "allow",
      webfetch: "allow",
      websearch: "allow",
      skill: "allow",
      todowrite: "allow",
    },
  };
}

export function buildOpenCodeRunArgs(config: OpenCodeRunnerConfig): string[] {
  const args = [
    "run",
    "--pure",
    "--format",
    "json",
    "--dangerously-skip-permissions",
    "--model",
    config.model,
    "--dir",
    "/workspace",
  ];
  if (config.showThinking) args.push("--thinking");
  if (config.variant) args.push("--variant", config.variant);
  args.push(config.prompt);
  return args;
}

export async function runOpenCodeBenchmark({
  env,
  args,
  spawnFn = spawnSync,
}: {
  env: RunnerEnv;
  args: string[];
  spawnFn?: SpawnFn;
}): Promise<OpenCodeSummary> {
  const startedAt = new Date().toISOString();
  const config = readOpenCodeRunnerConfig({ env, args });
  const childEnv = buildChildEnv(env, config);

  await writeOpenCodeConfig(config);
  const result = spawnFn("opencode", buildOpenCodeRunArgs(config), {
    cwd: "/workspace",
    env: childEnv,
    encoding: "utf8",
    maxBuffer: OPENCODE_MAX_BUFFER_IN_BYTES,
  });
  const stdout = String(result.stdout ?? "");
  const stderr = String(result.stderr ?? "");
  await writeText(config.outputPath, stdout);

  const eventSummary = readOpenCodeEventSummary(stdout);
  const { sessionId } = eventSummary;
  if (sessionId) {
    const exportResult = spawnFn("opencode", ["export", sessionId], {
      cwd: "/workspace",
      env: childEnv,
      encoding: "utf8",
      maxBuffer: OPENCODE_MAX_BUFFER_IN_BYTES,
    });
    if (exportResult.status === SUCCESS_STATUS) {
      await writeText(config.sessionOutputPath, String(exportResult.stdout ?? ""));
    }
  }

  const ok = result.status === SUCCESS_STATUS;
  const summary: OpenCodeSummary = {
    ok,
    model: config.model,
    baseUrl: config.baseUrl,
    startedAt,
    finishedAt: new Date().toISOString(),
    eventsPath: config.outputPath,
    sessionPath: config.sessionOutputPath,
    exitCode: result.status,
    stderr,
    ...(sessionId && { sessionId }),
    ...summaryWarnings(eventSummary),
    ...(!ok && {
      error: stderr || `opencode run failed with status ${result.status ?? "unknown"}`,
    }),
  };
  await writeJson(config.summaryOutputPath, summary);
  if (!ok) throw new Error(summary.error);
  return summary;
}

function readPrompt({ env, args }: { env: RunnerEnv; args: string[] }): string {
  const argsPrompt = args.join(" ").trim();
  if (argsPrompt) return argsPrompt;
  return env.BENCHMARK_PROMPT ?? DEFAULT_PROMPT;
}

function requiredEnv(env: RunnerEnv, name: string): string {
  const value = env[name];
  if (typeof value === "string" && value.trim()) return value;
  throw new Error(`${name} is required`);
}

function readBaseUrl(env: RunnerEnv): string {
  const value = requiredEnv(env, LLM_API_BASE_URL_ENV_VAR);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${LLM_API_BASE_URL_ENV_VAR} must be a valid URL`);
  }

  if (url.protocol !== HTTPS_PROTOCOL) {
    throw new Error(`${LLM_API_BASE_URL_ENV_VAR} must use https`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      `${LLM_API_BASE_URL_ENV_VAR} must not include credentials, query parameters, or a fragment`,
    );
  }
  return url.toString();
}

function buildChildEnv(env: RunnerEnv, config: OpenCodeRunnerConfig): RunnerEnv {
  return {
    HOME: config.home,
    PATH: env.PATH,
    OPENCODE_CONFIG: join(config.home, ".config", "opencode", "opencode.json"),
    OPENCODE_DISABLE_CLAUDE_CODE_PROMPT: "true",
    OPENCODE_DISABLE_DEFAULT_PLUGINS: "true",
    OPENCODE_DISABLE_AUTOUPDATE: "true",
    OPENCODE_DISABLE_MODELS_FETCH: "true",
    OPENCODE_ENABLE_EXA: "1",
  };
}

async function writeOpenCodeConfig(config: OpenCodeRunnerConfig): Promise<void> {
  const configPath = join(config.home, ".config", "opencode", "opencode.json");
  await writeJson(configPath, buildOpenCodeConfig(config));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value);
}

function readOpenCodeEventSummary(stdout: string): OpenCodeEventSummary {
  let sessionId: string | undefined;
  let malformedEventCount = NO_MALFORMED_EVENTS;

  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as Record<string, unknown>;
      const eventSessionId = event.sessionID ?? event.sessionId ?? event.session_id;
      if (!sessionId && typeof eventSessionId === "string") sessionId = eventSessionId;
    } catch {
      malformedEventCount += 1;
    }
  }

  return { sessionId, malformedEventCount };
}

function summaryWarnings(
  eventSummary: OpenCodeEventSummary,
): Pick<OpenCodeSummary, "warnings"> | {} {
  if (eventSummary.malformedEventCount === NO_MALFORMED_EVENTS) return {};
  const eventNoun = eventSummary.malformedEventCount === SINGULAR_COUNT ? "event" : "events";
  return {
    warnings: [
      `Ignored ${eventSummary.malformedEventCount} malformed OpenCode JSON ${eventNoun} while reading the session id.`,
    ],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runOpenCodeBenchmark({ env: process.env, args: process.argv.slice(2) })
    .then((summary) => {
      console.log(`OpenCode benchmark complete. Events: ${summary.eventsPath}`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "OpenCode benchmark failed");
      process.exitCode = 1;
    });
}
