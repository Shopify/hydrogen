import { describe, expect, it } from "vitest";

import type { AgentStep } from "./agent";
import { findShortcuts } from "./shortcuts";

const step = (action: string, args: Record<string, unknown>): AgentStep => ({
  action,
  args,
  reasoning: "",
  ok: true,
});

describe("findShortcuts", () => {
  it.each([
    ["type", { text: "https://shop.example/cart/123:2" }],
    ["type", { text: "/cart/c/abc?key=1" }],
    ["type", { text: "www.example.com" }],
    ["type", { text: "my-shop.myshopify.com" }],
    ["keypress", { keys: ["ctrl+l"] }],
    ["keypress", { keys: ["cmd+t"] }],
    ["keypress", { text: "ctrl+shift+i" }],
    ["keypress", { keys: ["F12"] }],
  ])("flags %s %o", (action, args) => {
    expect(findShortcuts([step(action, args)])).toHaveLength(1);
  });

  it.each([
    ["type", { text: "agentic spike hoodie" }],
    ["type", { text: "shopper@example.com" }],
    ["type", { text: "2" }],
    ["keypress", { keys: ["Enter"] }],
    ["keypress", { keys: ["Escape"] }],
    ["keypress", { keys: ["Tab"] }],
    ["keypress", { keys: ["ctrl+a"] }],
    ["click", { x: 10, y: 10 }],
  ])("allows %s %o", (action, args) => {
    expect(findShortcuts([step(action, args)])).toEqual([]);
  });
});
