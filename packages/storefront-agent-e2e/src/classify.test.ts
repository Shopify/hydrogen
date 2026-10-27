import { describe, expect, it } from "vitest";

import { classify, type AgentClaim, type Outcome } from "./classify";
import type { CartState } from "./verify";

const correct: CartState = { kind: "correct", lines: [], unexpectedLines: [] };
const wrong: CartState = { kind: "wrong", lines: [], reason: "quantity 1, expected 2" };
const noCheckout: CartState = { kind: "no-checkout" };
const unverifiable: CartState = { kind: "unverifiable", reason: "cart not found" };

// The claim x state table from the spike scope. A storefront is only blamed when the
// agent finished (FAIL) or reported being stopped (BLOCKED) and the cart is not right.
const table: [AgentClaim, CartState, Outcome][] = [
  ["done", correct, "PASS"],
  ["done", wrong, "FAIL"],
  ["done", noCheckout, "FAIL"],
  ["done", unverifiable, "INCONCLUSIVE"],
  ["blocked", correct, "PASS"],
  ["blocked", wrong, "BLOCKED"],
  ["blocked", noCheckout, "BLOCKED"],
  ["blocked", unverifiable, "INCONCLUSIVE"],
  ["gave-up", correct, "PASS"],
  ["gave-up", wrong, "INCONCLUSIVE"],
  ["gave-up", noCheckout, "INCONCLUSIVE"],
  ["gave-up", unverifiable, "INCONCLUSIVE"],
];

describe("classify", () => {
  it.each(table)("claim %s with %o is %s", (claim, state, outcome) => {
    expect(classify(claim, state)).toBe(outcome);
  });

  // A shortcut means the cart state was not produced through the storefront UI.
  it.each([correct, wrong, noCheckout])(
    "is INCONCLUSIVE for %o when a shortcut was used",
    (state) => {
      expect(classify("done", state, { usedShortcut: true })).toBe("INCONCLUSIVE");
    },
  );
});
