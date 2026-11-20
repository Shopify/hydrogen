import type { AgentResult } from "@browserbasehq/stagehand";
import type { Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";

import type { ModelConfig } from "./model-config.ts";
import { attachStagehand, confirmsCompletion, STOPPED_AT_ADD } from "./stagehand-agent.ts";

type Step = { toolCalls: Array<{ toolName: string }> };
type ExecuteOptions = {
  signal: AbortSignal;
  maxSteps: number;
  callbacks: { onStepFinish: (step: Step) => void };
};

// A fake SDK: `agent().execute()` only records its options and never settles on its own.
const sdk = vi.hoisted(() => ({
  execute: vi.fn<(options: ExecuteOptions) => Promise<unknown>>(),
}));
vi.mock("@browserbasehq/stagehand", () => ({
  Stagehand: class {
    context = { close: async () => undefined };
    async init() {}
    async close() {}
    agent() {
      return { execute: sdk.execute };
    }
  },
}));

const MODEL: ModelConfig = {
  modelName: "anthropic/claude-haiku-5-5",
  apiKey: "sk-test",
  baseURL: "http://127.0.0.1:1/v1",
  headers: {},
};
const PAGE = {} as Page;

/** Starts a run whose SDK call never ends, and resolves once the SDK call started. */
async function startRun({
  interrupt,
  stop,
  stopReason = STOPPED_AT_ADD,
}: {
  interrupt: AbortSignal;
  stop: AbortSignal;
  stopReason?: string;
}) {
  const { promise: started, resolve } = Promise.withResolvers<AbortSignal>();
  sdk.execute.mockImplementation(async ({ signal }) => {
    resolve(signal);
    return new Promise(() => undefined);
  });
  const agent = await attachStagehand("ws://browser");
  const running = agent.run({
    page: PAGE,
    task: "Add it.",
    model: MODEL,
    interrupt,
    stop,
    stopReason,
  });
  return { running, sdkSignal: await started };
}

describe("StagehandAgent.run", () => {
  it("returns the stop reason of the run input at once when the stop signal aborts, and does not throw", async () => {
    const stop = new AbortController();
    // Neither stop constant: a hard-coded reason fails.
    const { running, sdkSignal } = await startRun({
      interrupt: new AbortController().signal,
      stop: stop.signal,
      stopReason: "Stopped by the test.",
    });

    stop.abort();

    // No `message`: Stagehand returned no result.
    await expect(running).resolves.toStrictEqual({
      completed: false,
      reason: "Stopped by the test.",
    });
    // The SDK receives the stop through its own signal.
    expect(sdkSignal.aborted).toBe(true);
  });

  it("still rejects with the interrupt reason when the interrupt aborts", async () => {
    const interrupt = new AbortController();
    const { running } = await startRun({
      interrupt: interrupt.signal,
      stop: new AbortController().signal,
    });

    interrupt.abort(new Error("Interrupted by SIGINT."));

    await expect(running).rejects.toThrow("Interrupted by SIGINT.");
  });

  it("reports the step limit with the final message when all 20 steps call a tool that is not done", async () => {
    sdk.execute.mockImplementation(async ({ callbacks }) => {
      for (let step = 0; step < 20; step += 1) {
        callbacks.onStepFinish({ toolCalls: [{ toolName: "act" }] });
      }
      return result({ message: "Still looking for the button." });
    });

    const outcome = await runToEnd();

    expect(sdk.execute.mock.lastCall?.[0].maxSteps).toBe(20);
    expect(outcome).toStrictEqual({
      completed: false,
      reason: "The agent reached the 20-step limit.",
      message: "Still looking for the button.",
    });
  });

  it("reports a result without a done action as not confirmed, with the redacted final message", async () => {
    sdk.execute.mockResolvedValue(
      result({ actions: [], message: `The button is disabled. Key: ${MODEL.apiKey}` }),
    );

    await expect(runToEnd()).resolves.toStrictEqual({
      completed: false,
      reason: "The agent did not confirm that it completed the task.",
      message: "The button is disabled. Key: [redacted]",
    });
  });

  it("reports a failure result with the redacted final message", async () => {
    sdk.execute.mockResolvedValue(
      result({ message: `Failed to execute task: invalid x-api-key: ${MODEL.apiKey}` }),
    );

    await expect(runToEnd()).resolves.toStrictEqual({
      completed: false,
      reason: "The agent failed: invalid x-api-key: [redacted]",
      message: "Failed to execute task: invalid x-api-key: [redacted]",
    });
  });

  it("reports a thrown error without a message", async () => {
    sdk.execute.mockRejectedValue(new Error(`model down for ${MODEL.apiKey}`));

    await expect(runToEnd()).resolves.toStrictEqual({
      completed: false,
      reason: "The agent failed: model down for [redacted]",
    });
  });

  it("returns the deadline outcome when the 180000 ms deadline aborts", async () => {
    const deadline = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
    try {
      const { running } = await startRun({
        interrupt: new AbortController().signal,
        stop: new AbortController().signal,
      });
      expect(timeout).toHaveBeenCalledWith(180_000);

      deadline.abort();

      await expect(running).resolves.toStrictEqual({
        completed: false,
        reason: "The agent did not finish in 180000 ms.",
      });
    } finally {
      timeout.mockRestore();
    }
  });
});

/** Runs the task once with signals that never abort. */
async function runToEnd() {
  const agent = await attachStagehand("ws://browser");
  return agent.run({
    page: PAGE,
    task: "Add it.",
    model: MODEL,
    interrupt: new AbortController().signal,
    stop: new AbortController().signal,
    stopReason: STOPPED_AT_ADD,
  });
}

function result(overrides: Partial<AgentResult>): AgentResult {
  return { success: true, completed: true, message: "Done.", actions: [], ...overrides };
}

describe("confirmsCompletion", () => {
  it("accepts a done action with taskCompleted: true", () => {
    const actions = [
      { type: "scroll", taskCompleted: false },
      { type: "done", taskCompleted: true },
    ];

    expect(confirmsCompletion(result({ actions }))).toBe(true);
  });

  it("rejects the SDK completed flag without a done action", () => {
    // Stagehand 3.7.3 sets `completed` when its final `done` call fails.
    expect(
      confirmsCompletion(result({ actions: [{ type: "scroll", taskCompleted: false }] })),
    ).toBe(false);
  });

  it("rejects a done action without taskCompleted: true", () => {
    expect(confirmsCompletion(result({ actions: [{ type: "done", taskCompleted: false }] }))).toBe(
      false,
    );
    expect(confirmsCompletion(result({ actions: [{ type: "done" }] }))).toBe(false);
  });

  it("rejects taskCompleted: true on an action that is not done", () => {
    expect(confirmsCompletion(result({ actions: [{ type: "scroll", taskCompleted: true }] }))).toBe(
      false,
    );
  });
});
