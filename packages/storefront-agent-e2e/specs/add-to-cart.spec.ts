import { runAgentTest } from "../src/agent-test";
import { captureCheckout } from "../src/checkout";
import { readRunConfig } from "../src/config";
import { test } from "../src/fixtures";
import { verifyCart } from "../src/verify";

// T1: from the product page (default variant selected), add a non-default variant and reach
// checkout. The verdict comes from the cart behind the checkout URL, read from the Storefront API.
test("add a variant to cart from the product page", async ({ page, addToCartTask }, testInfo) => {
  const checkout = await captureCheckout(page.context());
  const { productPathTemplate } = readRunConfig();
  await runAgentTest({
    page,
    testInfo,
    test: { kind: "add-to-cart", task: addToCartTask },
    startPath: productPathTemplate.replace(
      "{handle}",
      encodeURIComponent(addToCartTask.productHandle),
    ),
    // Healthy runs take 6–9 steps.
    defaultMaxSteps: 20,
    verify: () => verifyCart(addToCartTask, checkout.url()),
  });
});
