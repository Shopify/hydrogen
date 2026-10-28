import { afterEach, describe, expect, it } from "vitest";

import { estimateCostUsd } from "./cost";

afterEach(() => {
  delete process.env.STOREFRONT_AGENT_PRICE_INPUT;
  delete process.env.STOREFRONT_AGENT_PRICE_OUTPUT;
});

describe("estimateCostUsd", () => {
  it("prices provider-prefixed models from the list", () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 100_000, cachedInputTokens: 0 };
    expect(estimateCostUsd("anthropic/claude-sonnet-4-6", usage)).toEqual({
      usd: 4.5,
      priceSource: "list",
    });
  });

  it("bills cached input at the cache-read price, not twice", () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 100_000, cachedInputTokens: 500_000 };
    // 500k uncached at $3 + 500k cached at $0.30 + 100k output at $15
    expect(estimateCostUsd("anthropic/claude-sonnet-4-6", usage)?.usd).toBe(3.15);
  });

  it("returns null for unknown models and missing usage", () => {
    expect(
      estimateCostUsd("anthropic/unknown", {
        inputTokens: 1,
        outputTokens: 1,
        cachedInputTokens: 0,
      }),
    ).toBeNull();
    expect(estimateCostUsd("anthropic/claude-sonnet-4-6", null)).toBeNull();
  });

  it("uses an override price when configured", () => {
    process.env.STOREFRONT_AGENT_PRICE_INPUT = "1";
    process.env.STOREFRONT_AGENT_PRICE_OUTPUT = "2";
    const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000, cachedInputTokens: 0 };
    expect(estimateCostUsd("anthropic/unknown", usage)).toEqual({
      usd: 3,
      priceSource: "override",
    });
  });
});
