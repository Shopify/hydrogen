import type { TokenUsage } from "./agent";

type Price = {
  /** USD per million uncached input tokens. */
  readonly input: number;
  /** USD per million output tokens. */
  readonly output: number;
  /** USD per million cache-read input tokens. */
  readonly cachedInput: number;
};

// List prices from https://platform.claude.com/docs/en/about-claude/pricing (checked 2026-10-28).
// Override with STOREFRONT_AGENT_PRICE_INPUT / _OUTPUT / _CACHED_INPUT (USD per million tokens)
// when the endpoint bills differently.
const LIST_PRICES: Record<string, Price> = {
  "claude-sonnet-4-6": { input: 3, output: 15, cachedInput: 0.3 },
  "claude-opus-4-8": { input: 5, output: 25, cachedInput: 0.5 },
  "claude-fable-5": { input: 10, output: 50, cachedInput: 1 },
  "claude-haiku-4-5": { input: 1, output: 5, cachedInput: 0.1 },
};

export type CostEstimate = { readonly usd: number; readonly priceSource: "list" | "override" };

export function estimateCostUsd(model: string, usage: TokenUsage | null): CostEstimate | null {
  if (!usage) return null;
  const override = priceOverride();
  const price = override ?? LIST_PRICES[model.replace(/^[a-z]+\//, "")];
  if (!price) return null;
  const uncached = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  const usd =
    (uncached * price.input +
      usage.cachedInputTokens * price.cachedInput +
      usage.outputTokens * price.output) /
    1_000_000;
  return { usd: Math.round(usd * 10_000) / 10_000, priceSource: override ? "override" : "list" };
}

function priceOverride(): Price | null {
  const input = Number(process.env.STOREFRONT_AGENT_PRICE_INPUT);
  const output = Number(process.env.STOREFRONT_AGENT_PRICE_OUTPUT);
  if (!Number.isFinite(input) || !Number.isFinite(output) || input <= 0 || output <= 0) return null;
  const cached = Number(process.env.STOREFRONT_AGENT_PRICE_CACHED_INPUT);
  return {
    input,
    output,
    cachedInput: Number.isFinite(cached) && cached >= 0 ? cached : input / 10,
  };
}
