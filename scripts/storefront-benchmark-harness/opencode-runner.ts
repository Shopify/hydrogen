#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";
import { finished } from "node:stream/promises";

const DEFAULT_MODEL = "anthropic/claude-opus-4-6";
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
const MAX_CAPTURED_STDERR_CHARACTERS = MEBIBYTE_IN_BYTES;
const LLM_API_TOKEN_ENV_VAR = "LLM_API_TOKEN";
const LLM_API_BASE_URL_ENV_VAR = "LLM_API_BASE_URL";
const HTTPS_PROTOCOL = "https:";
const DEFAULT_WORKSPACE_PATH = "/workspace";
const DEFAULT_WORKSPACE_WATCH_INTERVAL_IN_MILLISECONDS = 2000;
const MAX_LIVE_EVENT_LABEL_LENGTH = 140;
const TRUNCATION_MARKER = "...";
const CURRENT_DIRECTORY = "";
const PARENT_DIRECTORY = "..";
const PARENT_DIRECTORY_PREFIX = "../";
const IGNORED_WORKSPACE_DIRECTORIES = new Set([".git", ".pnpm-store", "node_modules"]);
const IGNORED_WORKSPACE_PATH_PREFIXES = [".opencode/node_modules", "tmp/workspace-node_modules"];

type RunnerEnv = Record<string, string | undefined>;
type LiveEventSink = (line: string) => void;

interface OpenCodeProcess {
  stdout: NodeJS.ReadableStream | null;
  stderr: NodeJS.ReadableStream | null;
  on(event: "close", listener: (code: number | null) => void): unknown;
  on(event: "error", listener: (error: Error) => void): unknown;
}

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

interface OpenCodeEventTracker {
  pendingLine: string;
  summary: OpenCodeEventSummary;
}

interface OpenCodeCommandResult {
  status: number | null;
  eventSummary: OpenCodeEventSummary;
  stderr: string;
}

type SpawnFn = (
  command: string,
  args: string[],
  options: Record<string, unknown>,
) => OpenCodeProcess;
type ExportResult = { status?: number | null; stdout?: string | Buffer; stderr?: string | Buffer };
type ExportSpawnFn = (
  command: string,
  args: string[],
  options: Record<string, unknown>,
) => ExportResult;

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

export function buildOpenCodeRunArgs(
  config: OpenCodeRunnerConfig,
  workspacePath = DEFAULT_WORKSPACE_PATH,
): string[] {
  const args = [
    "run",
    "--pure",
    "--format",
    "json",
    "--dangerously-skip-permissions",
    "--model",
    config.model,
    "--dir",
    workspacePath,
  ];
  if (config.showThinking) args.push("--thinking");
  if (config.variant) args.push("--variant", config.variant);
  args.push(config.prompt);
  return args;
}

export async function runOpenCodeBenchmark({
  env,
  args,
  spawnFn = spawn as SpawnFn,
  exportSpawnFn = spawnSync as ExportSpawnFn,
  liveEventSink = writeLiveEventLine,
  workspacePath = DEFAULT_WORKSPACE_PATH,
  workspaceWatchIntervalInMilliseconds = DEFAULT_WORKSPACE_WATCH_INTERVAL_IN_MILLISECONDS,
}: {
  env: RunnerEnv;
  args: string[];
  spawnFn?: SpawnFn;
  exportSpawnFn?: ExportSpawnFn;
  liveEventSink?: LiveEventSink;
  workspacePath?: string;
  workspaceWatchIntervalInMilliseconds?: number;
}): Promise<OpenCodeSummary> {
  const startedAt = new Date().toISOString();
  const config = readOpenCodeRunnerConfig({ env, args });
  const childEnv = buildChildEnv(env, config);

  await writeOpenCodeConfig(config);
  let result: OpenCodeCommandResult;
  try {
    result = await runStreamingOpenCodeCommand({
      spawnFn,
      outputPath: config.outputPath,
      liveEventSink,
      command: "opencode",
      args: buildOpenCodeRunArgs(config, workspacePath),
      options: {
        cwd: workspacePath,
        env: childEnv,
        stdio: ["ignore", "pipe", "pipe"],
      },
      workspacePath,
      workspaceWatchIntervalInMilliseconds,
      ignoredWorkspaceRelativePaths: buildIgnoredWorkspaceRelativePaths({
        workspacePath,
        paths: [config.outputPath, config.sessionOutputPath, config.summaryOutputPath],
      }),
    });
  } catch (error) {
    const summary = buildFailedOpenCodeSummary({ config, startedAt, error });
    await writeJson(config.summaryOutputPath, summary);
    throw error instanceof Error ? error : new Error(summary.error);
  }

  const { eventSummary, stderr } = result;
  const { sessionId } = eventSummary;
  if (sessionId) {
    const exportResult = exportSpawnFn("opencode", ["export", sessionId], {
      cwd: workspacePath,
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

function buildFailedOpenCodeSummary({
  config,
  startedAt,
  error,
}: {
  config: OpenCodeRunnerConfig;
  startedAt: string;
  error: unknown;
}): OpenCodeSummary {
  return {
    ok: false,
    model: config.model,
    baseUrl: config.baseUrl,
    startedAt,
    finishedAt: new Date().toISOString(),
    eventsPath: config.outputPath,
    sessionPath: config.sessionOutputPath,
    exitCode: null,
    stderr: "",
    error: formatErrorMessage(error),
  };
}

async function runStreamingOpenCodeCommand({
  spawnFn,
  command,
  args,
  options,
  outputPath,
  liveEventSink,
  workspacePath,
  workspaceWatchIntervalInMilliseconds,
  ignoredWorkspaceRelativePaths,
}: {
  spawnFn: SpawnFn;
  command: string;
  args: string[];
  options: Record<string, unknown>;
  outputPath: string;
  liveEventSink: LiveEventSink;
  workspacePath: string;
  workspaceWatchIntervalInMilliseconds: number;
  ignoredWorkspaceRelativePaths: Set<string>;
}): Promise<OpenCodeCommandResult> {
  await mkdir(dirname(outputPath), { recursive: true });
  const stopWorkspaceChangeMonitor = await startWorkspaceChangeMonitor({
    workspacePath,
    intervalInMilliseconds: workspaceWatchIntervalInMilliseconds,
    liveEventSink,
    ignoredWorkspaceRelativePaths,
  });
  const output = createWriteStream(outputPath, { encoding: "utf8" });
  const eventTracker = createOpenCodeEventTracker();
  let stderr = "";
  let pendingStdoutLine = "";

  try {
    const child = spawnFn(command, args, options);

    child.stdout?.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      output.write(text);
      readOpenCodeEventText(eventTracker, text);
      pendingStdoutLine = emitLiveEventLines(pendingStdoutLine + text, liveEventSink);
    });

    child.stderr?.on("data", (chunk: Buffer | string) => {
      const text = String(chunk);
      stderr = appendBoundedText(stderr, text, MAX_CAPTURED_STDERR_CHARACTERS);
      process.stderr.write(text);
    });

    const status = await new Promise<number | null>((resolve, reject) => {
      child.on("error", reject);
      child.on("close", resolve);
    });

    if (pendingStdoutLine.trim()) emitLiveEventLine(pendingStdoutLine, liveEventSink);
    return { status, eventSummary: finishOpenCodeEventTracker(eventTracker), stderr };
  } finally {
    await stopWorkspaceChangeMonitor();
    output.end();
    await finished(output);
  }
}

async function startWorkspaceChangeMonitor({
  workspacePath,
  intervalInMilliseconds,
  liveEventSink,
  ignoredWorkspaceRelativePaths,
}: {
  workspacePath: string;
  intervalInMilliseconds: number;
  liveEventSink: LiveEventSink;
  ignoredWorkspaceRelativePaths: Set<string>;
}): Promise<() => Promise<void>> {
  try {
    await stat(workspacePath);
  } catch {
    return async () => {};
  }

  const knownFiles = new Map<string, number>();
  let scanInFlight = false;

  async function scan({ emit }: { emit: boolean }): Promise<void> {
    if (scanInFlight) return;

    scanInFlight = true;
    try {
      await updateWorkspaceSnapshot({
        workspacePath,
        knownFiles,
        emit,
        liveEventSink,
        ignoredWorkspaceRelativePaths,
      });
    } catch (error) {
      if (emit) liveEventSink(`[workspace] watch error: ${formatErrorMessage(error)}`);
    } finally {
      scanInFlight = false;
    }
  }

  await scan({ emit: false });
  const interval = setInterval(() => void scan({ emit: true }), intervalInMilliseconds);

  return async () => {
    clearInterval(interval);
    await scan({ emit: true });
  };
}

async function updateWorkspaceSnapshot({
  workspacePath,
  knownFiles,
  emit,
  liveEventSink,
  ignoredWorkspaceRelativePaths,
}: {
  workspacePath: string;
  knownFiles: Map<string, number>;
  emit: boolean;
  liveEventSink: LiveEventSink;
  ignoredWorkspaceRelativePaths: Set<string>;
}): Promise<void> {
  const files = await listWorkspaceFiles({ workspacePath, ignoredWorkspaceRelativePaths });
  const seen = new Set<string>();

  for (const file of files) {
    seen.add(file.relativePath);
    const previousModifiedAtInMilliseconds = knownFiles.get(file.relativePath);
    knownFiles.set(file.relativePath, file.modifiedAtInMilliseconds);
    if (emit) emitWorkspaceFileChange({ file, previousModifiedAtInMilliseconds, liveEventSink });
  }

  if (emit) emitDeletedWorkspaceFiles({ seen, knownFiles, liveEventSink });
}

function emitWorkspaceFileChange({
  file,
  previousModifiedAtInMilliseconds,
  liveEventSink,
}: {
  file: { relativePath: string; modifiedAtInMilliseconds: number };
  previousModifiedAtInMilliseconds: number | undefined;
  liveEventSink: LiveEventSink;
}): void {
  if (previousModifiedAtInMilliseconds === undefined) {
    liveEventSink(`[workspace] added: ${file.relativePath}`);
    return;
  }

  if (previousModifiedAtInMilliseconds !== file.modifiedAtInMilliseconds) {
    liveEventSink(`[workspace] changed: ${file.relativePath}`);
  }
}

function emitDeletedWorkspaceFiles({
  seen,
  knownFiles,
  liveEventSink,
}: {
  seen: Set<string>;
  knownFiles: Map<string, number>;
  liveEventSink: LiveEventSink;
}): void {
  for (const previousPath of knownFiles.keys()) {
    if (seen.has(previousPath)) continue;
    knownFiles.delete(previousPath);
    liveEventSink(`[workspace] deleted: ${previousPath}`);
  }
}

async function listWorkspaceFiles({
  workspacePath,
  ignoredWorkspaceRelativePaths,
  currentPath = workspacePath,
}: {
  workspacePath: string;
  ignoredWorkspaceRelativePaths: Set<string>;
  currentPath?: string;
}): Promise<Array<{ relativePath: string; modifiedAtInMilliseconds: number }>> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const files: Array<{ relativePath: string; modifiedAtInMilliseconds: number }> = [];

  for (const entry of entries) {
    const absolutePath = join(currentPath, entry.name);
    const relativePath = toWorkspaceRelativePath(workspacePath, absolutePath);
    if (ignoredWorkspaceRelativePaths.has(relativePath)) continue;

    if (entry.isDirectory()) {
      if (!shouldIgnoreWorkspaceDirectory(entry.name, relativePath)) {
        files.push(
          ...(await listWorkspaceFiles({
            workspacePath,
            ignoredWorkspaceRelativePaths,
            currentPath: absolutePath,
          })),
        );
      }
      continue;
    }

    if (entry.isFile()) files.push(await readWorkspaceFileEntry(relativePath, absolutePath));
  }

  return files;
}

async function readWorkspaceFileEntry(
  relativePath: string,
  absolutePath: string,
): Promise<{ relativePath: string; modifiedAtInMilliseconds: number }> {
  const fileStat = await stat(absolutePath);
  return { relativePath, modifiedAtInMilliseconds: fileStat.mtimeMs };
}

function shouldIgnoreWorkspaceDirectory(directoryName: string, relativePath: string): boolean {
  if (IGNORED_WORKSPACE_DIRECTORIES.has(directoryName)) return true;
  return IGNORED_WORKSPACE_PATH_PREFIXES.some(
    (prefix) => relativePath === prefix || relativePath.startsWith(`${prefix}/`),
  );
}

function toWorkspaceRelativePath(workspacePath: string, absolutePath: string): string {
  return relative(workspacePath, absolutePath).split("\\").join("/");
}

function buildIgnoredWorkspaceRelativePaths({
  workspacePath,
  paths,
}: {
  workspacePath: string;
  paths: string[];
}): Set<string> {
  const ignoredPaths = new Set<string>();

  for (const path of paths) {
    const absolutePath = isAbsolute(path) ? path : join(workspacePath, path);
    const relativePath = toWorkspaceRelativePath(workspacePath, absolutePath);
    if (isWorkspaceChildPath(relativePath)) ignoredPaths.add(relativePath);
  }

  return ignoredPaths;
}

function isWorkspaceChildPath(relativePath: string): boolean {
  if (relativePath === CURRENT_DIRECTORY) return false;
  if (relativePath === PARENT_DIRECTORY) return false;
  return !relativePath.startsWith(PARENT_DIRECTORY_PREFIX);
}

function appendBoundedText(text: string, nextText: string, maxCharacters: number): string {
  const combinedText = text + nextText;
  if (combinedText.length <= maxCharacters) return combinedText;
  const visibleTextLength = maxCharacters - TRUNCATION_MARKER.length;
  return `${TRUNCATION_MARKER}${combinedText.slice(-visibleTextLength)}`;
}

function emitLiveEventLines(text: string, liveEventSink: LiveEventSink): string {
  const lines = text.split("\n");
  const pendingLine = lines.pop() ?? "";
  for (const line of lines) emitLiveEventLine(line, liveEventSink);
  return pendingLine;
}

function emitLiveEventLine(line: string, liveEventSink: LiveEventSink): void {
  const formatted = formatOpenCodeLiveEventLine(line);
  if (formatted) liveEventSink(formatted);
}

export function formatOpenCodeLiveEventLine(line: string): string | null {
  if (!line.trim()) return null;

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return null;
  }

  const type = readFirstString(event.type, event.event, event.kind);
  if (!type || /delta/i.test(type)) return null;

  const label = readFirstString(
    event.name,
    event.tool,
    event.toolName,
    event.command,
    event.title,
    event.message,
  );
  return `[opencode] ${type}${label ? `: ${truncateLiveEventLabel(label)}` : ""}`;
}

function readFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function truncateLiveEventLabel(label: string): string {
  if (label.length <= MAX_LIVE_EVENT_LABEL_LENGTH) return label;
  return `${label.slice(0, MAX_LIVE_EVENT_LABEL_LENGTH - TRUNCATION_MARKER.length)}${TRUNCATION_MARKER}`;
}

function writeLiveEventLine(line: string): void {
  process.stderr.write(`${line}\n`);
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
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

function createOpenCodeEventTracker(): OpenCodeEventTracker {
  return {
    pendingLine: "",
    summary: { malformedEventCount: NO_MALFORMED_EVENTS },
  };
}

function readOpenCodeEventText(tracker: OpenCodeEventTracker, text: string): void {
  const lines = `${tracker.pendingLine}${text}`.split("\n");
  tracker.pendingLine = lines.pop() ?? "";
  for (const line of lines) readOpenCodeEventLine(tracker.summary, line);
}

function finishOpenCodeEventTracker(tracker: OpenCodeEventTracker): OpenCodeEventSummary {
  if (tracker.pendingLine.trim()) readOpenCodeEventLine(tracker.summary, tracker.pendingLine);
  tracker.pendingLine = "";
  return tracker.summary;
}

function readOpenCodeEventLine(summary: OpenCodeEventSummary, line: string): void {
  if (!line.trim()) return;

  try {
    const event = JSON.parse(line) as Record<string, unknown>;
    const eventSessionId = event.sessionID ?? event.sessionId ?? event.session_id;
    if (!summary.sessionId && typeof eventSessionId === "string")
      summary.sessionId = eventSessionId;
  } catch {
    summary.malformedEventCount += 1;
  }
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
