import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { isCheckoutHandoff } from "./checkout.ts";

describe("isCheckoutHandoff", () => {
  it("matches checkout records and top-level checkout navigation blocks only", () => {
    assert.equal(isCheckoutHandoff({ kind: "checkout", timestamp: 1, data: {} }), true);
    const blocked = (data: Record<string, unknown>) =>
      isCheckoutHandoff({ kind: "navigation-blocked", timestamp: 1, data });
    assert.equal(blocked({ reason: "checkout", frame: "top-level" }), true);
    // Fail closed: an unclassified or legacy record still stops the buyer.
    assert.equal(blocked({ reason: "checkout", frame: "unknown" }), true);
    assert.equal(blocked({ reason: "checkout" }), true);
    // An embedded checkout frame stays blocked but is not the buyer's handoff.
    assert.equal(blocked({ reason: "checkout", frame: "embedded" }), false);
    assert.equal(blocked({ reason: "customer-account", frame: "top-level" }), false);
    assert.equal(blocked({ reason: "scheme" }), false);
  });
});
