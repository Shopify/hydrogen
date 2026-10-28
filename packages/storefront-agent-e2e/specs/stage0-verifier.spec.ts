import type { Locator } from "@playwright/test";

import { captureCheckout, CHECKOUT_STUB_HEADING, redactCartKeys } from "../src/checkout";
import { classify, type Outcome } from "../src/classify";
import { expect, test } from "../src/fixtures";
import { verifyCart } from "../src/verify";

// Stage 0: prove the verifier before trusting any agent result. A script (not an agent)
// does the purchase steps; the verifier and classifier must give the expected verdict.
// SPIKE_FAULT must match the value the storefront dev server was started with.
const FAULT = process.env.SPIKE_FAULT ?? "";
const EXPECTED: Record<string, Outcome> = {
  "": "PASS",
  "wrong-variant": "FAIL",
  "quantity-ignored": "FAIL",
  "add-to-cart-broken": "FAIL",
};

// Both checkout entry points the template offers. Shop Pay goes through the storefront's own
// /checkout route and redirects into /cart/c/, which the checkout capture must still catch.
const HANDOFFS: Record<string, (drawer: Locator) => Promise<void>> = {
  "checkout link": async (drawer) => {
    await drawer.getByRole("link", { name: "Checkout" }).click();
  },
  "Shop Pay button": async (drawer) => {
    await drawer.getByRole("link", { name: /shop pay/i }).click();
  },
};

for (const [handoff, handOff] of Object.entries(HANDOFFS)) {
  test(`V0-V2 scripted add to cart, ${handoff}, verify (fault: ${FAULT || "none"})`, async ({
    page,
    task,
  }, testInfo) => {
    const expected = EXPECTED[FAULT];
    if (!expected) throw new Error(`Unknown SPIKE_FAULT "${FAULT}"`);
    await testInfo.attach("task.json", {
      body: JSON.stringify(task, null, 2),
      contentType: "application/json",
    });

    const checkout = await captureCheckout(page.context());
    const params = new URLSearchParams(task.selectedOptions.map((o) => [o.name, o.value]));
    await page.goto(`/products/${task.productHandle}?${params}`);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1, name: task.productTitle })).toBeVisible();
    const quantity = main.getByRole("spinbutton", { name: "Quantity" });
    for (let current = 1; current < task.quantity; current++) {
      await main.getByRole("button", { name: "Increase quantity", exact: true }).click();
      await expect(quantity).toHaveValue(String(current + 1));
    }
    await main.getByRole("button", { name: "Add to cart" }).click();

    const drawer = page.getByRole("dialog", { name: "Cart" });
    await expect(drawer.getByRole("listitem").filter({ hasText: task.productTitle })).toBeVisible();
    await handOff(drawer);
    await expect(page.getByRole("heading", { name: CHECKOUT_STUB_HEADING })).toBeVisible();

    const checkoutUrl = checkout.url();
    const state = await verifyCart(task, checkoutUrl);
    const outcome = classify("done", state);
    const verdict = redactCartKeys(JSON.stringify({ checkoutUrl, state, outcome }, null, 2));
    await testInfo.attach("verdict.json", { body: verdict, contentType: "application/json" });

    expect(outcome, verdict).toBe(expected);
  });
}
