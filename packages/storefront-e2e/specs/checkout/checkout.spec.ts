import { expect, type Locator, type Page } from "@playwright/test";

import { createContractError, StorefrontContractError } from "../../src/contract";
import { test, type CheckoutTestProduct } from "./config";

const CART_SETTLE_TIMEOUT_MS = 15_000;

type CartExpectation = {
  readonly cartPath: string;
  readonly productTitle: string;
  readonly variantLabel: string;
};

test("checkout handoff starts from populated cart", async ({ data, page }) => {
  const expectation = await addProductToCart(page, data.products, data.paths.cart);

  await startCheckoutFromPopulatedCart(page, expectation);
});

test.describe("checkout cart setup helpers", () => {
  const expectation: CartExpectation = {
    cartPath: "/cart",
    productTitle: "Shirt",
    variantLabel: "Small",
  };

  test("reads the cart page line and the drawer line from their own view", async ({ page }) => {
    // Lines outside both views come first, so an unscoped match would find them.
    await page.setContent(`
      <main><ul>${cartLineHtml("Shirt Small outside")}</ul></main>
      <dialog open data-testid="cart-drawer"><ul>${cartLineHtml("Shirt Small drawer line")}</ul></dialog>
      <div data-testid="cart-page"><ul>${cartLineHtml("Shirt Small page line")}</ul></div>`);

    await expect(await expectCartLine(page, expectation)).toHaveText("Shirt Small page line");
    await expect(cartOverlayLineFor(page, "Shirt")).toHaveText("Shirt Small drawer line");
  });

  test("fails when the cart page line does not show the variant", async ({ page }) => {
    await page.setContent(
      `<div data-testid="cart-page"><ul>${cartLineHtml("Shirt Large")}</ul></div>`,
    );

    const error = await rejection(expectCartLine(page, expectation, 200));

    expect(String(error)).toContain("Small");
  });
});

test.describe("checkout link helpers", () => {
  const expectation: CartExpectation = {
    cartPath: "/cart",
    productTitle: "Shirt",
    variantLabel: "Small",
  };
  const cartLine = `<ul><li data-testid="cart-line">Shirt Small</li></ul>`;
  const checkoutHref = "https://shop.example/checkouts/cn/abc";

  test("clicks the cart page checkout link, not the closed drawer's link", async ({ page }) => {
    // The closed drawer and its checkout link come first. The real link has a localized name.
    await openCartFixture(
      page,
      `<dialog data-testid="cart-drawer">
        ${cartLine}
        <a data-testid="cart-checkout" href="https://decoy.example/checkouts/drawer">Checkout</a>
      </dialog>
      <main data-testid="cart-page">
        ${cartLine}
        <a data-testid="cart-checkout" href="${checkoutHref}">Zur Kasse</a>
      </main>`,
    );

    await startCheckoutFromPopulatedCart(page, expectation);

    await expect(page).toHaveURL(checkoutHref);
  });

  test("hands off to a relative checkout URL on the storefront", async ({ page }) => {
    await openCartFixture(
      page,
      `<main data-testid="cart-page">
        ${cartLine}
        <a data-testid="cart-checkout" href="/cart/c/abc?key=1">Checkout</a>
      </main>`,
    );

    await startCheckoutFromPopulatedCart(page, expectation);

    await expect(page).toHaveURL(`${STOREFRONT_ORIGIN}/cart/c/abc?key=1`);
  });

  test("does not navigate for a missing, empty, or non-checkout href", async ({ page }) => {
    const links = [
      `<a data-testid="cart-checkout">Checkout</a>`,
      `<a data-testid="cart-checkout" href="">Checkout</a>`,
      `<a data-testid="cart-checkout" href="http://[">Checkout</a>`,
      `<a data-testid="cart-checkout" href="/collections/all">Checkout</a>`,
    ];

    for (const link of links) {
      await test.step(link, async () => {
        await openCartFixture(page, `<main data-testid="cart-page">${cartLine}${link}</main>`);
        await expectContractError(
          startCheckoutFromPopulatedCart(page, expectation),
          /The visible checkout link targets a checkout URL\./,
        );
        await expect(page).toHaveURL(`${STOREFRONT_ORIGIN}/cart`);
      });
    }
  });
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
  const addToCart = page.getByTestId("product-add-to-cart").filter({ visible: true }).first();
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

  const checkout = cartPage(page).getByTestId("cart-checkout").filter({ visible: true }).first();
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

/** Expects the cart page line, with its variant text. Returns the line. */
async function expectCartLine(
  page: Page,
  expectation: CartExpectation,
  variantTimeout?: number,
): Promise<Locator> {
  const line = lineIn(cartPage(page), expectation.productTitle);
  await expect(line).toBeVisible({ timeout: CART_SETTLE_TIMEOUT_MS });

  if (shouldAssertVariant(expectation.variantLabel)) {
    await expect(line.getByText(expectation.variantLabel, { exact: false })).toBeVisible({
      timeout: variantTimeout,
    });
  }

  return line;
}

function cartOverlayLineFor(page: Page, productTitle: string): Locator {
  return lineIn(page.getByTestId("cart-drawer").filter({ visible: true }).first(), productTitle);
}

function cartPage(page: Page): Locator {
  return page.getByTestId("cart-page").filter({ visible: true }).first();
}

function lineIn(view: Locator, productTitle: string): Locator {
  return view.getByTestId("cart-line").filter({ hasText: productTitle, visible: true }).first();
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

/** A cart line for helper fixtures. */
function cartLineHtml(text: string): string {
  return `<li data-testid="cart-line">${text}</li>`;
}

/** Returns the rejection reason, or null when the promise resolves. */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error;
  }
}

async function expectContractError(promise: Promise<unknown>, message: RegExp): Promise<void> {
  const error = await rejection(promise);
  expect(error).toBeInstanceOf(StorefrontContractError);
  expect(String(error)).toMatch(message);
}

/** Fake storefront origin for checkout link fixtures. No request leaves the browser. */
const STOREFRONT_ORIGIN = "https://storefront.test";

/**
 * Serves `body` as the storefront cart page, so relative checkout links have an
 * HTTP base. Every other request is aborted, except routes the test adds later.
 */
async function openCartFixture(page: Page, body: string): Promise<void> {
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.route("**/*", (route) => route.abort());
  await page.route(`${STOREFRONT_ORIGIN}/cart`, (route) =>
    route.fulfill({ body: `<!doctype html>${body}`, contentType: "text/html", status: 200 }),
  );
  await page.goto(`${STOREFRONT_ORIGIN}/cart`);
}
