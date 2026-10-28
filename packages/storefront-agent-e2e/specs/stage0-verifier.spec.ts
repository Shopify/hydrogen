import type { Locator } from "@playwright/test";

import { captureCheckout, CHECKOUT_STUB_HEADING, redactCartKeys } from "../src/checkout";
import { classify, type Outcome } from "../src/classify";
import { readRunConfig } from "../src/config";
import { expect, test } from "../src/fixtures";
import { verifyProductPage } from "../src/product-page";
import { verifyCart } from "../src/verify";

// Stage 0: prove the verifier before trusting any agent result. A script (not an agent)
// does the purchase steps; the verifier and classifier must give the expected verdict.
// SPIKE_FAULT must match the value the storefront dev server was started with.
//
// Template-only: the locators below are the React Router template's English labels and markup,
// and the URL is its product route. This checks the verifier, not other storefronts; the agent
// tests themselves use no locators.
const FAULT = process.env.SPIKE_FAULT ?? "";
const CART_FAULTS = ["wrong-variant", "quantity-ignored", "add-to-cart-broken"];
const PRODUCT_FAULTS = ["product-links-wrong", "product-page-error"];
if (FAULT && ![...CART_FAULTS, ...PRODUCT_FAULTS].includes(FAULT)) {
  throw new Error(`Unknown SPIKE_FAULT "${FAULT}"`);
}
const expectedFor = (faults: readonly string[]): Outcome =>
  faults.includes(FAULT) ? "FAIL" : "PASS";

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
    addToCartTask: task,
  }, testInfo) => {
    test.skip(
      PRODUCT_FAULTS.includes(FAULT),
      "Product-page faults stop the scripted flow before the cart; covered by the product page check.",
    );
    const expected = expectedFor(CART_FAULTS);
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

// The find-product verifier: open the target product page directly (no agent), and the page
// check must say PASS on a healthy store and FAIL when product pages are wrong or broken.
test(`V3 scripted product page, verify (fault: ${FAULT || "none"})`, async ({
  page,
  findProductTask: task,
}, testInfo) => {
  const { productPathTemplate } = readRunConfig();
  await page.goto(productPathTemplate.replace("{handle}", encodeURIComponent(task.productHandle)));
  const state = await verifyProductPage(page, task);
  const outcome = classify("done", state);
  const verdict = JSON.stringify({ task, state, outcome }, null, 2);
  await testInfo.attach("verdict.json", { body: verdict, contentType: "application/json" });
  expect(outcome, verdict).toBe(expectedFor(PRODUCT_FAULTS));
});
