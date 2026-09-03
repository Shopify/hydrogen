import { expect, type Locator, type Page } from "@playwright/test";

import { createContractError } from "../../src/contract";
import { test, type CheckoutTestProduct } from "./config";

const CART_SETTLE_TIMEOUT_MS = 15_000;
const ADD_TO_CART_NAME = /add to cart/i;
const CHECKOUT_CONTROL_NAME = /check\s*out|checkout|continue to checkout/i;

type CartExpectation = {
  readonly cartPath: string;
  readonly productTitle: string;
  readonly variantLabel: string;
};

test("checkout handoff starts from populated cart", async ({ data, page }) => {
  const expectation = await addProductToCart(page, data.products, data.paths.cart);

  await startCheckoutFromPopulatedCart(page, expectation);
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

  await addToCart.click();
  await expect(cartOverlayLineFor(page, expectation.productTitle)).toBeVisible({
    timeout: CART_SETTLE_TIMEOUT_MS,
  });
  await page.goto(cartPath);
  await expectCartLine(page, expectation);

  return expectation;
}

async function startCheckoutFromPopulatedCart(
  page: Page,
  expectation: CartExpectation,
): Promise<void> {
  await expectCartLine(page, expectation);

  const checkout = page.getByRole("link", { name: CHECKOUT_CONTROL_NAME }).first();
  await expect(checkout).toBeVisible();
  const checkoutUrl = await requireCheckoutUrl(page, checkout, expectation.cartPath);
  const isCheckoutNavigation = (url: URL) => url.href === checkoutUrl.href;

  await page.route(isCheckoutNavigation, async (route) => {
    await route.fulfill({
      body: "<!doctype html><title>Checkout</title>",
      contentType: "text/html",
      status: 200,
    });
  });

  try {
    await checkout.click();
    await expect(page).toHaveURL(checkoutUrl.href);
  } finally {
    await page.unroute(isCheckoutNavigation);
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

async function requireCheckoutUrl(page: Page, checkout: Locator, cartPath: string): Promise<URL> {
  const href = await checkout.getAttribute("href");
  if (href === null || href === "") {
    throw checkoutHandoffError(cartPath);
  }

  let url: URL;
  try {
    url = new URL(href, page.url());
  } catch {
    throw checkoutHandoffError(cartPath);
  }

  if (isCheckoutUrl(url, cartPath)) return url;

  throw checkoutHandoffError(cartPath);
}

function checkoutHandoffError(cartPath: string): Error {
  return createContractError({
    capability: "checkout-handoff",
    routePath: cartPath,
    expectation: "The visible checkout link targets a checkout URL.",
    likelyFix: "Set the checkout link href to the cart checkout URL.",
    docsAnchor: "#checkout-handoff",
  });
}

function isCheckoutUrl(url: URL, cartPath: string): boolean {
  return /checkout|checkouts/i.test(url.href) || url.pathname.startsWith(`${cartPath}/c/`);
}
