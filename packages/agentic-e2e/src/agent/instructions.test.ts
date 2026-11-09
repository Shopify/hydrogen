import { describe, expect, it } from "vitest";

import { BUYER_SYSTEM_PROMPT } from "./instructions.ts";

// Contract checks on the guardrails, not a copy of the prompt text.
describe("BUYER_SYSTEM_PROMPT", () => {
  it("ends the run as soon as the objective is achieved, with no checkout journey of its own", () => {
    expect(BUYER_SYSTEM_PROMPT).toMatch(
      /As soon as the task's objective is achieved, stop and finish/,
    );
    expect(BUYER_SYSTEM_PROMPT).toMatch(
      /Do not take extra steps, such as opening the cart or going to checkout/,
    );
    // The checkout journey instructions are gone.
    expect(BUYER_SYSTEM_PROMPT).not.toMatch(/continue through the storefront's own pages/);
    expect(BUYER_SYSTEM_PROMPT).not.toMatch(/reopen the cart/);
  });

  it("bounds recovery: no duplicate items, no repeated failed action, finite steps", () => {
    expect(BUYER_SYSTEM_PROMPT).toMatch(/Do not add an item again after it was added/);
    expect(BUYER_SYSTEM_PROMPT).toMatch(/Do not repeat an action that already failed/);
    expect(BUYER_SYSTEM_PROMPT).toMatch(/limited number of steps/);
  });

  it("finishes on a loaded checkout page, but continues an unfinished objective after a blocked checkout", () => {
    expect(BUYER_SYSTEM_PROMPT).toMatch(
      /If a checkout page actually loads, .*do not interact with it: report it with report_friction and finish\./,
    );
    const blocked = BUYER_SYSTEM_PROMPT.split("\n").find((line) =>
      line.startsWith("If the browser blocks the navigation to checkout"),
    );
    expect(blocked).toMatch(/do not try checkout again/);
    expect(blocked).toMatch(/If the task's objective is already achieved, finish\./);
    expect(blocked).toMatch(/If it is not, return to the storefront .*and continue the objective/);
    expect(blocked).toMatch(/Do not add an item again after it was added/);
    // A blocked checkout no longer ends the run by itself.
    expect(blocked).not.toMatch(/expected: finish/);
  });

  it("keeps the guest, no-purchase, UI-only, and no-bypass boundaries", () => {
    for (const rule of [
      /Do not log in or create an account/,
      /Do not enter personal, contact, address, or payment details/,
      /Never click a control that places, pays for, or confirms an order/,
      /Do not navigate by typing URLs/,
      /do not try to get around the block/,
      /report_friction/,
    ]) {
      expect(BUYER_SYSTEM_PROMPT).toMatch(rule);
    }
  });

  it("holds no store-specific routes or hosts", () => {
    expect(BUYER_SYSTEM_PROMPT).not.toMatch(/https?:|\/(cart|checkouts?|products)\b/i);
  });
});
