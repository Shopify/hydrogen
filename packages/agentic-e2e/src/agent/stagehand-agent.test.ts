import type { AgentResult } from "@browserbasehq/stagehand";
import { describe, expect, it } from "vitest";

import { confirmsCompletion } from "./stagehand-agent.ts";

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
