import type { CartState } from "./verify";

/** What the agent said happened. "gave-up" covers step limits and model errors. */
export type AgentClaim = "done" | "blocked" | "gave-up";

/**
 * - PASS: the cart is right and the agent only used the page's own UI.
 * - FAIL: the agent finished but the storefront produced the wrong cart or no checkout.
 * - BLOCKED: the agent says the storefront stopped it.
 * - INCONCLUSIVE: the run tells us nothing about the storefront.
 */
export type Outcome = "PASS" | "FAIL" | "BLOCKED" | "INCONCLUSIVE";

export function classify(
  claim: AgentClaim,
  state: CartState,
  options: { usedShortcut?: boolean } = {},
): Outcome {
  // Typing an address or using browser shortcuts bypasses the storefront UI under test.
  if (options.usedShortcut || state.kind === "unverifiable") return "INCONCLUSIVE";
  if (state.kind === "correct") return "PASS";
  switch (claim) {
    case "done":
      return "FAIL";
    case "blocked":
      return "BLOCKED";
    case "gave-up":
      return "INCONCLUSIVE";
  }
}
