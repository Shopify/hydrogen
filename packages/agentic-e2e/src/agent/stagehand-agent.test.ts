import type { AgentResult } from "@browserbasehq/stagehand";
import type { Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";

import type { ModelConfig } from "./model-config.ts";
import { attachStagehand, confirmsCompletion } from "./stagehand-agent.ts";

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
async function startRun({ interrupt }: { interrupt: AbortSignal }) {
  const { promise: started, resolve } = Promise.withResolvers<AbortSignal>();
  sdk.execute.mockImplementation(async ({ signal }) => {
    resolve(signal);
    return new Promise(() => undefined);
  });
  const agent = await attachStagehand("ws://browser");
  const running = agent.run({ page: PAGE, task: "Add it.", model: MODEL, interrupt });
  return { running, sdkSignal: await started };
}

describe("StagehandAgent.run", () => {
  it("rejects with the interrupt reason when the interrupt aborts", async () => {
    const interrupt = new AbortController();
    const { running, sdkSignal } = await startRun({ interrupt: interrupt.signal });

    interrupt.abort(new Error("Interrupted by SIGINT."));

    await expect(running).rejects.toThrow("Interrupted by SIGINT.");
    // The SDK receives the interrupt through its own signal.
    expect(sdkSignal.aborted).toBe(true);
  });

  it("reports the step limit when all 20 steps call a tool that is not done", async () => {
    sdk.execute.mockImplementation(async ({ callbacks }) => {
      for (let step = 0; step < 20; step += 1) {
        callbacks.onStepFinish({ toolCalls: [{ toolName: "act" }] });
      }
      return result({});
    });
    const agent = await attachStagehand("ws://browser");

    const outcome = await agent.run({
      page: PAGE,
      task: "Add it.",
      model: MODEL,
      interrupt: new AbortController().signal,
    });

    expect(sdk.execute.mock.lastCall?.[0].maxSteps).toBe(20);
    expect(outcome).toEqual({
      status: "indeterminate",
      reason: "The agent reached the 20-step limit.",
    });
  });

  it("reports a result without a done action as not confirmed", async () => {
    sdk.execute.mockResolvedValue(result({ actions: [] }));
    const agent = await attachStagehand("ws://browser");

    const outcome = await agent.run({
      page: PAGE,
      task: "Add it.",
      model: MODEL,
      interrupt: new AbortController().signal,
    });

    expect(outcome).toEqual({
      status: "indeterminate",
      reason: "The agent did not confirm that it completed the task.",
    });
  });

  it("returns the deadline outcome when the 180000 ms deadline aborts", async () => {
    const deadline = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
    try {
      const { running } = await startRun({ interrupt: new AbortController().signal });
      expect(timeout).toHaveBeenCalledWith(180_000);

      deadline.abort();

      await expect(running).resolves.toEqual({
        status: "indeterminate",
        reason: "The agent did not finish in 180000 ms.",
      });
    } finally {
      timeout.mockRestore();
    }
  });
});

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
