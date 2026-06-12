import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { describe, it } from "node:test";

import {
  buildOpenCodeConfig,
  buildOpenCodeRunArgs,
  readOpenCodeRunnerConfig,
  runOpenCodeBenchmark,
} from "./opencode-runner.ts";

const SUCCESS_STATUS = 0;
const SAFE_LLM_API_BASE_URL = "https://proxy.example/apis/anthropic/v1";

function fakeOpenCodeProcess({ stdout, stderr = "" }: { stdout: string; stderr?: string }) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
  };
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  queueMicrotask(() => {
    child.stdout.end(stdout);
    child.stderr.end(stderr);
    child.emit("close", SUCCESS_STATUS);
  });
  return child;
}

function fakeChunkedOpenCodeProcess(stdoutChunks: string[]) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
  };
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  queueMicrotask(() => {
    for (const chunk of stdoutChunks) child.stdout.write(chunk);
    child.stdout.end();
    child.stderr.end("");
    child.emit("close", SUCCESS_STATUS);
  });
  return child;
}

function fakeDelayedOpenCodeProcess({
  stdout,
  onStart,
}: {
  stdout: string;
  onStart: () => Promise<void>;
}) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
  };
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  queueMicrotask(async () => {
    await onStart();
    child.stdout.end(stdout);
    child.stderr.end("");
    child.emit("close", SUCCESS_STATUS);
  });
  return child;
}

function fakeFailedOpenCodeProcess(error: Error) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
  };
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  queueMicrotask(() => child.emit("error", error));
  return child;
}

function assertRejectsBaseUrl(baseUrl: string): void {
  assert.throws(() => {
    readOpenCodeRunnerConfig({
      env: { LLM_API_TOKEN: "token", LLM_API_BASE_URL: baseUrl },
      args: [],
    });
  }, /LLM_API_BASE_URL/);
}

describe("opencode runner", () => {
  it("reads config from env and prompt args", () => {
    assert.deepEqual(
      readOpenCodeRunnerConfig({
        env: {
          LLM_API_TOKEN: "token",
          OPENCODE_MODEL: "anthropic/custom-sonnet",
          LLM_API_BASE_URL: SAFE_LLM_API_BASE_URL,
          HOME: "/tmp/home",
        },
        args: ["hello", "world"],
      }),
      {
        token: "token",
        model: "anthropic/custom-sonnet",
        baseUrl: SAFE_LLM_API_BASE_URL,
        prompt: "hello world",
        outputPath: "benchmark-opencode-events.jsonl",
        sessionOutputPath: "benchmark-opencode-session.json",
        summaryOutputPath: "benchmark-opencode-output.json",
        home: "/tmp/home",
        showThinking: true,
        variant: undefined,
      },
    );
  });

  it("builds an opencode config for the configured LLM API", () => {
    const config = readOpenCodeRunnerConfig({
      env: {
        LLM_API_TOKEN: "token",
        LLM_API_BASE_URL: SAFE_LLM_API_BASE_URL,
      },
      args: [],
    });

    assert.deepEqual(buildOpenCodeConfig(config).provider.anthropic.options, {
      apiKey: "token",
      baseURL: SAFE_LLM_API_BASE_URL,
    });
    assert.equal(buildOpenCodeConfig(config).permission.webfetch, "allow");
    assert.equal(buildOpenCodeConfig(config).permission.skill, "allow");
  });

  it("builds opencode run args with JSON events and thinking", () => {
    const config = readOpenCodeRunnerConfig({
      env: {
        LLM_API_TOKEN: "token",
        LLM_API_BASE_URL: SAFE_LLM_API_BASE_URL,
        OPENCODE_VARIANT: "max",
      },
      args: ["do", "work"],
    });

    assert.deepEqual(buildOpenCodeRunArgs(config), [
      "run",
      "--pure",
      "--format",
      "json",
      "--dangerously-skip-permissions",
      "--model",
      "anthropic/claude-opus-4-6",
      "--dir",
      "/workspace",
      "--thinking",
      "--variant",
      "max",
      "do work",
    ]);
  });

  it("rejects unsafe LLM API base URLs", () => {
    const unsafeBaseUrls = [
      "http://proxy.example/apis/anthropic/v1",
      "https://user:token@proxy.example/apis/anthropic/v1",
      "https://proxy.example/apis/anthropic/v1?token=secret",
      "https://proxy.example/apis/anthropic/v1#token",
    ];

    for (const unsafeBaseUrl of unsafeBaseUrls) assertRejectsBaseUrl(unsafeBaseUrl);
  });

  it("does not pass runner secrets to the OpenCode child process", async () => {
    const homePath = await mkdtemp(join(tmpdir(), "opencode-home-"));
    let observedEnv: Record<string, string | undefined> | undefined;
    const spawnFn = (_command: string, _args: string[], options: { env?: unknown }) => {
      observedEnv = options.env as Record<string, string | undefined>;
      return fakeOpenCodeProcess({ stdout: "" });
    };

    await runOpenCodeBenchmark({
      env: {
        LLM_API_TOKEN: "token",
        LLM_API_BASE_URL: SAFE_LLM_API_BASE_URL,
        GITHUB_TOKEN: "github-token",
        PATH: "/usr/local/bin:/usr/bin",
        HOME: homePath,
        BENCHMARK_OPENCODE_EVENTS_PATH: join(homePath, "events.jsonl"),
        BENCHMARK_OPENCODE_SESSION_PATH: join(homePath, "session.json"),
        BENCHMARK_OPENCODE_OUTPUT_PATH: join(homePath, "summary.json"),
      },
      args: ["hello"],
      spawnFn,
      exportSpawnFn: () => ({ status: SUCCESS_STATUS, stdout: "{}", stderr: "" }),
    });

    assert.equal(observedEnv?.GITHUB_TOKEN, undefined);
    assert.equal(observedEnv?.LLM_API_TOKEN, undefined);
    assert.equal(observedEnv?.LLM_API_BASE_URL, undefined);
    assert.equal(observedEnv?.PATH, "/usr/local/bin:/usr/bin");
  });

  it("warns in the summary when OpenCode emits malformed JSON events", async () => {
    const homePath = await mkdtemp(join(tmpdir(), "opencode-home-"));
    const summaryOutputPath = join(homePath, "summary.json");

    const summary = await runOpenCodeBenchmark({
      env: {
        LLM_API_TOKEN: "token",
        LLM_API_BASE_URL: SAFE_LLM_API_BASE_URL,
        HOME: homePath,
        BENCHMARK_OPENCODE_EVENTS_PATH: join(homePath, "events.jsonl"),
        BENCHMARK_OPENCODE_SESSION_PATH: join(homePath, "session.json"),
        BENCHMARK_OPENCODE_OUTPUT_PATH: summaryOutputPath,
      },
      args: ["hello"],
      spawnFn: () => fakeOpenCodeProcess({ stdout: 'not json\n{"sessionID":"session_123"}\n' }),
      exportSpawnFn: () => ({ status: SUCCESS_STATUS, stdout: "{}", stderr: "" }),
    });

    assert.deepEqual(summary.warnings, [
      "Ignored 1 malformed OpenCode JSON event while reading the session id.",
    ]);
    assert.deepEqual(
      JSON.parse(await readFile(summaryOutputPath, "utf8")).warnings,
      summary.warnings,
    );
  });

  it("streams OpenCode events to artifacts and live output", async () => {
    const homePath = await mkdtemp(join(tmpdir(), "opencode-home-"));
    const eventsPath = join(homePath, "events.jsonl");
    const liveLines: string[] = [];
    let observedSpawnOptions: Record<string, unknown> | undefined;

    const summary = await runOpenCodeBenchmark({
      env: {
        LLM_API_TOKEN: "token",
        LLM_API_BASE_URL: SAFE_LLM_API_BASE_URL,
        HOME: homePath,
        BENCHMARK_OPENCODE_EVENTS_PATH: eventsPath,
        BENCHMARK_OPENCODE_SESSION_PATH: join(homePath, "session.json"),
        BENCHMARK_OPENCODE_OUTPUT_PATH: join(homePath, "summary.json"),
      },
      args: ["hello"],
      spawnFn: (_command, _args, options) => {
        observedSpawnOptions = options;
        return fakeOpenCodeProcess({
          stdout: '{"type":"tool_call","name":"Read","sessionID":"session_123"}\n',
        });
      },
      exportSpawnFn: () => ({ status: SUCCESS_STATUS, stdout: "{}", stderr: "" }),
      liveEventSink: (line) => liveLines.push(line),
    });

    assert.equal(summary.sessionId, "session_123");
    assert.match(await readFile(eventsPath, "utf8"), /tool_call/);
    assert.deepEqual(liveLines, ["[opencode] tool_call: Read"]);
    assert.deepEqual(observedSpawnOptions?.stdio, ["ignore", "pipe", "pipe"]);
  });

  it("reads session ids from JSON events split across stdout chunks", async () => {
    const homePath = await mkdtemp(join(tmpdir(), "opencode-home-"));

    const summary = await runOpenCodeBenchmark({
      env: {
        LLM_API_TOKEN: "token",
        LLM_API_BASE_URL: SAFE_LLM_API_BASE_URL,
        HOME: homePath,
        BENCHMARK_OPENCODE_EVENTS_PATH: join(homePath, "events.jsonl"),
        BENCHMARK_OPENCODE_SESSION_PATH: join(homePath, "session.json"),
        BENCHMARK_OPENCODE_OUTPUT_PATH: join(homePath, "summary.json"),
      },
      args: ["hello"],
      spawnFn: () => fakeChunkedOpenCodeProcess(['{"session', 'ID":"session_123"}\n']),
      exportSpawnFn: () => ({ status: SUCCESS_STATUS, stdout: "{}", stderr: "" }),
    });

    assert.equal(summary.sessionId, "session_123");
  });

  it("streams workspace file changes while OpenCode runs", async () => {
    const homePath = await mkdtemp(join(tmpdir(), "opencode-home-"));
    const workspacePath = await mkdtemp(join(tmpdir(), "opencode-workspace-"));
    const routePath = join(workspacePath, "app/routes/cart.tsx");
    const liveLines: string[] = [];
    let observedRunArgs: string[] = [];

    await mkdir(join(workspacePath, "app/routes"), { recursive: true });
    await writeFile(routePath, "export default function Cart() { return null; }\n");

    await runOpenCodeBenchmark({
      env: {
        LLM_API_TOKEN: "token",
        LLM_API_BASE_URL: SAFE_LLM_API_BASE_URL,
        HOME: homePath,
        BENCHMARK_OPENCODE_EVENTS_PATH: join(workspacePath, "benchmark-opencode-events.jsonl"),
        BENCHMARK_OPENCODE_SESSION_PATH: join(homePath, "session.json"),
        BENCHMARK_OPENCODE_OUTPUT_PATH: join(homePath, "summary.json"),
      },
      args: ["hello"],
      spawnFn: (_command, args) => {
        observedRunArgs = args;
        return fakeDelayedOpenCodeProcess({
          stdout: '{"sessionID":"session_123"}\n',
          onStart: async () => {
            await writeFile(routePath, "export default function Cart() { return 'updated'; }\n");
          },
        });
      },
      exportSpawnFn: () => ({ status: SUCCESS_STATUS, stdout: "{}", stderr: "" }),
      liveEventSink: (line) => liveLines.push(line),
      workspacePath,
      workspaceWatchIntervalInMilliseconds: 1,
    });

    assert.ok(liveLines.includes("[workspace] changed: app/routes/cart.tsx"));
    assert.ok(!liveLines.some((line) => line.includes("benchmark-opencode-events.jsonl")));
    assert.ok(observedRunArgs.includes(workspacePath));
  });

  it("writes a summary when OpenCode cannot start", async () => {
    const homePath = await mkdtemp(join(tmpdir(), "opencode-home-"));
    const summaryOutputPath = join(homePath, "summary.json");

    await assert.rejects(
      runOpenCodeBenchmark({
        env: {
          LLM_API_TOKEN: "token",
          LLM_API_BASE_URL: SAFE_LLM_API_BASE_URL,
          HOME: homePath,
          BENCHMARK_OPENCODE_EVENTS_PATH: join(homePath, "events.jsonl"),
          BENCHMARK_OPENCODE_SESSION_PATH: join(homePath, "session.json"),
          BENCHMARK_OPENCODE_OUTPUT_PATH: summaryOutputPath,
        },
        args: ["hello"],
        spawnFn: () => fakeFailedOpenCodeProcess(new Error("spawn failed")),
      }),
      /spawn failed/,
    );

    const summary = JSON.parse(await readFile(summaryOutputPath, "utf8"));
    assert.equal(summary.ok, false);
    assert.equal(summary.exitCode, null);
    assert.match(summary.error, /spawn failed/);
  });
});
