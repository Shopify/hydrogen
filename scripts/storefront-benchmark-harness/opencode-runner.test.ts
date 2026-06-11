import assert from "node:assert/strict";
import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  buildOpenCodeConfig,
  buildOpenCodeRunArgs,
  readOpenCodeRunnerConfig,
  runOpenCodeBenchmark,
} from "./opencode-runner.ts";

const SUCCESS_STATUS = 0;
const COMMAND_INDEX = 0;
const EXPORT_COMMAND = "export";
const SAFE_LLM_API_BASE_URL = "https://proxy.example/apis/anthropic/v1";

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
      "anthropic/claude-sonnet-4-6",
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
    const spawnFn = ((_command: string, _args: string[], options: { env?: unknown }) => {
      observedEnv = options.env as Record<string, string | undefined>;
      return { status: SUCCESS_STATUS, stdout: "", stderr: "" } as SpawnSyncReturns<string>;
    }) as typeof spawnSync;

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
    });

    assert.equal(observedEnv?.GITHUB_TOKEN, undefined);
    assert.equal(observedEnv?.LLM_API_TOKEN, undefined);
    assert.equal(observedEnv?.LLM_API_BASE_URL, undefined);
    assert.equal(observedEnv?.PATH, "/usr/local/bin:/usr/bin");
  });

  it("warns in the summary when OpenCode emits malformed JSON events", async () => {
    const homePath = await mkdtemp(join(tmpdir(), "opencode-home-"));
    const summaryOutputPath = join(homePath, "summary.json");
    const spawnFn = ((_command: string, args: string[]) => {
      if (args[COMMAND_INDEX] === EXPORT_COMMAND) {
        return { status: SUCCESS_STATUS, stdout: "{}", stderr: "" } as SpawnSyncReturns<string>;
      }

      return {
        status: SUCCESS_STATUS,
        stdout: 'not json\n{"sessionID":"session_123"}\n',
        stderr: "",
      } as SpawnSyncReturns<string>;
    }) as typeof spawnSync;

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
      spawnFn,
    });

    assert.deepEqual(summary.warnings, [
      "Ignored 1 malformed OpenCode JSON event while reading the session id.",
    ]);
    assert.deepEqual(
      JSON.parse(await readFile(summaryOutputPath, "utf8")).warnings,
      summary.warnings,
    );
  });
});
