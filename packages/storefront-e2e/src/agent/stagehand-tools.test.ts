import { createAgentTools } from "@browserbasehq/stagehand/lib/v3/agent/tools/index.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BUYER_AGENT_TOOLS, EXCLUDED_AGENT_TOOLS, FRICTION_TOOL } from "./stagehand-buyer.ts";

type V3 = Parameters<typeof createAgentTools>[0];

// The tool factories only keep this reference. No tool runs in these tests.
const fakeV3 = { logger: () => {} } as unknown as V3;

function toolNames(excludeTools?: readonly string[]): Set<string> {
  return new Set(
    Object.keys(
      createAgentTools(fakeV3, {
        mode: "dom",
        toolTimeout: 30_000,
        ...(excludeTools === undefined ? {} : { excludeTools: [...excludeTools] }),
      }),
    ),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("installed Stagehand DOM agent tools", () => {
  it("adds the external search tool when BRAVE_API_KEY is set", () => {
    vi.stubEnv("BRAVE_API_KEY", "brave-test-key");

    expect(toolNames()).toEqual(new Set([...BUYER_AGENT_TOOLS, ...EXCLUDED_AGENT_TOOLS]));
  });

  it("leaves exactly the browser-only allowlist after the buyer exclusions", () => {
    vi.stubEnv("BRAVE_API_KEY", "brave-test-key");

    expect(toolNames(EXCLUDED_AGENT_TOOLS)).toEqual(new Set(BUYER_AGENT_TOOLS));
  });

  it("has no built-in tool with the adapter's custom tool name", () => {
    vi.stubEnv("BRAVE_API_KEY", "brave-test-key");

    expect(toolNames().has(FRICTION_TOOL)).toBe(false);
    expect(BUYER_AGENT_TOOLS).not.toContain(FRICTION_TOOL);
  });

  it("has no search tool without BRAVE_API_KEY", () => {
    vi.stubEnv("BRAVE_API_KEY", undefined);

    expect(toolNames().has("search")).toBe(false);
  });
});
