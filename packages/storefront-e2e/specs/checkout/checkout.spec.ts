import { expect, type Locator, type Page } from "@playwright/test";

import { createContractError } from "../../src/contract";
import { test, type CheckoutTestProduct } from "./config";

const CART_SETTLE_TIMEOUT_MS = 15_000;
// Any non-empty accessible name, so other and localized labels pass but an unlabeled icon button fails.
const ADD_TO_CART_CONTROL_NAME = /\S/;

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
      'Ensure the test store has an in-stock product variant, and that its enabled Add to cart button has data-testid="product-add-to-cart".',
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
  const addToCart = page
    .getByTestId("product-add-to-cart")
    .and(page.getByRole("button", { name: ADD_TO_CART_CONTROL_NAME }))
    .filter({ visible: true })
    .first();
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

  const checkout = page
    .getByTestId("cart-page")
    .filter({ visible: true })
    .first()
    .getByTestId("cart-checkout")
    .filter({ visible: true })
    .first();
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
    .getByTestId("cart-page")
    .filter({ visible: true })
    .first()
    .getByTestId("cart-line")
    .filter({ hasText: expectation.productTitle, visible: true })
    .first();
  await expect(line).toBeVisible({ timeout: CART_SETTLE_TIMEOUT_MS });

  if (shouldAssertVariant(expectation.variantLabel)) {
    await expect(line.getByText(expectation.variantLabel, { exact: false })).toBeVisible();
  }

  return line;
}

function cartOverlayLineFor(page: Page, productTitle: string): Locator {
  return page
    .getByTestId("cart-drawer")
    .filter({ visible: true })
    .first()
    .getByTestId("cart-line")
    .filter({ hasText: productTitle, visible: true })
    .first();
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
