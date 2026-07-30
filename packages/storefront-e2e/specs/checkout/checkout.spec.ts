import { expect, type Locator, type Page } from "@playwright/test";

import { createContractError } from "../../src/contract";
import { test, type CheckoutTestProduct } from "./config";

const CART_SETTLE_TIMEOUT_MS = 15_000;
const CHECKOUT_LOAD_TIMEOUT_MS = 30_000;

const ADD_TO_CART_NAME = /add to cart/i;
const CHECKOUT_CONTROL_NAME = /check\s*out|checkout|continue to checkout/i;

type CartExpectation = {
  readonly cartPath: string;
  readonly productTitle: string;
  readonly variantLabel: string;
};

test("checkout contains cart product", async ({ data, page }) => {
  const expectation = await addProductToCart(page, data.products, data.paths.cart);

  await openCheckoutAndExpectItem(page, expectation);
});

async function addProductToCart(
  page: Page,
  products: readonly CheckoutTestProduct[],
  cartPath: string,
): Promise<CartExpectation> {
  for (const product of products) {
    const expectation = await tryAddProductToCart(page, product, cartPath);
    if (expectation !== null) return expectation;
  }

  throw createContractError({
    capability: "product-cart",
    routePath: cartPath,
    expectation: "At least one cart enabled product page exposes an enabled Add to cart button.",
    likelyFix:
      "Ensure the test store has an in-stock product variant with an enabled Add to cart button.",
    docsAnchor: "#cart-line-items",
  });
}

async function tryAddProductToCart(
  page: Page,
  product: CheckoutTestProduct,
  cartPath: string,
): Promise<CartExpectation | null> {
  await page.goto(product.path);

  const expectation = {
    cartPath,
    productTitle: product.productTitle,
    variantLabel: product.variantLabel,
  };
  const addToCart = page.getByRole("button", { name: ADD_TO_CART_NAME }).first();
  const isCartEnabled =
    (await addToCart.isVisible().catch(() => false)) &&
    (await addToCart.isEnabled().catch(() => false));
  if (!isCartEnabled) return null;

  const [cartResponse] = await Promise.all([
    page
      .waitForResponse((r) => r.url().includes("/api/cart") && r.request().method() === "POST", {
        timeout: CART_SETTLE_TIMEOUT_MS,
      })
      .catch(() => null),
    addToCart.click(),
  ]);
  await cartResponse?.finished().catch(() => null);

  await expect(cartOverlayLineFor(page, expectation.productTitle)).toBeVisible({
    timeout: CART_SETTLE_TIMEOUT_MS,
  });
  await page.goto(cartPath);
  await expectCartLine(page, expectation);

  return expectation;
}

async function openCheckoutAndExpectItem(page: Page, expectation: CartExpectation): Promise<void> {
  await expectCartLine(page, expectation);

  const checkout = page.getByRole("link", { name: CHECKOUT_CONTROL_NAME }).first();
  await expect(checkout).toBeVisible();
  await checkout.click();

  await page.waitForLoadState("domcontentloaded", { timeout: CHECKOUT_LOAD_TIMEOUT_MS });
  expect(isCheckoutUrl(page.url(), expectation.cartPath)).toBe(true);
  await expect(page.getByText(expectation.productTitle, { exact: false })).toBeVisible();
  if (shouldAssertVariant(expectation.variantLabel)) {
    await expect(page.getByText(expectation.variantLabel, { exact: false })).toBeVisible();
  }
}

async function expectCartLine(page: Page, expectation: CartExpectation): Promise<Locator> {
  const line = page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ hasText: expectation.productTitle })
    .first();
  await expect(line).toBeVisible({ timeout: CART_SETTLE_TIMEOUT_MS });

  if (shouldAssertVariant(expectation.variantLabel)) {
    await expect(line.getByText(expectation.variantLabel, { exact: false })).toBeVisible();
  }

  return line;
}

function cartOverlayLineFor(page: Page, productTitle: string): Locator {
  return page.getByRole("dialog").getByRole("listitem").filter({ hasText: productTitle }).first();
}

function shouldAssertVariant(variantLabel: string): boolean {
  return variantLabel !== "" && variantLabel.toLowerCase() !== "default title";
}

function isCheckoutUrl(rawUrl: string, cartPath: string): boolean {
  const url = new URL(rawUrl);
  return /checkout|checkouts/i.test(rawUrl) || url.pathname.startsWith(`${cartPath}/c/`);
}
