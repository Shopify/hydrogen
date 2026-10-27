import type { CartState } from "./verify";

/** What the agent said happened. "gave-up" covers step limits and model errors. */
export type AgentClaim = "done" | "blocked" | "gave-up";

/**
 * - PASS: the cart is right.
 * - FAIL: the agent finished but the storefront produced the wrong cart or no checkout.
 * - BLOCKED: the agent says the storefront stopped it.
 * - INCONCLUSIVE: the run tells us nothing about the storefront.
 */
export type Outcome = "PASS" | "FAIL" | "BLOCKED" | "INCONCLUSIVE";

export function classify(claim: AgentClaim, state: CartState): Outcome {
  if (state.kind === "unverifiable") return "INCONCLUSIVE";
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
