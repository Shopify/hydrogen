import { expect, type Locator, type Page } from "@playwright/test";

import { createContractError } from "../../src/contract";
import { locateSignifier, requireSignifier } from "../../src/signifiers";
import { EXPECT_TIMEOUT_MS } from "../../src/timeouts";
import { test, type CartTestProduct } from "./config";

const CART_SETTLE_TIMEOUT_MS = 15_000;
const CART_CONTROL_NAME = /^(?:open |view )?cart\b/i;
const CART_ENDPOINT_PATTERN = "**/api/cart";
const CART_TOTALS_UPDATING_TEXT = "Updating cart totals";
const CART_TOTALS_UPDATED_TEXT = "Cart totals updated";

type CartExpectation = {
  readonly cartPath: string;
  readonly variantId: string;
};

test("cart accepts selected variant", async ({ data, page }) => {
  await addProductToCart(page, data.products, data.paths.cart);
});

test("cart page shows added product", async ({ data, page }) => {
  const expectation = await addProductToCart(page, data.products, data.paths.cart);

  await expectCartLine(page, expectation);
});

test("cart accepts the product quantity", async ({ data, page }) => {
  const expectation = await addProductToCart(page, data.products, data.paths.cart, 2);

  const line = await expectCartLine(page, expectation);
  await expect(line).toHaveAttribute("data-shopify-quantity", "2");
  await expect(line).toHaveAttribute("data-shopify-pending", "false");
  await expect(await quantityInputFor(line, expectation.cartPath)).toHaveValue("2");
});

test("cart quantity increases and decreases", async ({ data, page }) => {
  const expectation = await addProductToCart(page, data.products, data.paths.cart);

  await increaseCartLineQuantity(page, expectation);
  await decreaseCartLineQuantity(page, expectation);
});

test("cart removes product", async ({ data, page }) => {
  const expectation = await addProductToCart(page, data.products, data.paths.cart);

  await removeCartLine(page, expectation);
});

test("cart rolls back an optimistic add beyond available stock", async ({ data, page }) => {
  const product = data.stockLimitProduct;
  if (!product) {
    test.skip(true, "No finite-stock product could be seeded to its maximum quantity");
    return;
  }

  const expectation = await addVariantToCart(page, product, data.paths.cart);
  await setCartLineQuantity(page, expectation, product.maxQuantity);
  await page.goto(product.path);

  const requestGate = createRequestGate();
  await page.route(CART_ENDPOINT_PATTERN, async (route) => {
    await requestGate.wait;
    await route.continue();
  });

  const addToCart = await requireSignifier(page, "product-add-to-cart", {
    variantId: product.variantId,
    available: true,
  });

  try {
    await addToCart.click();
    const line = await openCartOverlayFor(page, product.variantId);
    const quantityInput = await quantityInputFor(line, product.path);
    await expect
      .poll(() => numericInputValue(quantityInput), {
        message: `Expected cart line quantity to optimistically increase from ${product.maxQuantity} to ${product.maxQuantity + 1}.`,
      })
      .toBe(product.maxQuantity + 1);
    await expectCartTotalsStatus(page, CART_TOTALS_UPDATING_TEXT, data.paths.cart);
    await expect(line).toHaveAttribute("data-shopify-quantity", String(product.maxQuantity + 1));
    await expect(line).toHaveAttribute("data-shopify-pending", "true");

    requestGate.release();
    await expectCartTotalsStatus(page, CART_TOTALS_UPDATED_TEXT, data.paths.cart);
    await expect(line).toHaveAttribute("data-shopify-pending", "false");
    await expect
      .poll(() => numericInputValue(quantityInput), {
        message: `Expected cart line quantity to roll back to the stock limit of ${product.maxQuantity}.`,
      })
      .toBe(product.maxQuantity);
    await expect(line).toHaveAttribute("data-shopify-quantity", String(product.maxQuantity));
    await expect(quantityInput).toHaveValue(String(product.maxQuantity));
  } finally {
    requestGate.release();
    await page.unroute(CART_ENDPOINT_PATTERN);
  }
});

function createRequestGate(): { wait: Promise<void>; release: () => void } {
  let release: (() => void) | undefined;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { wait, release: () => release?.() };
}

async function addProductToCart(
  page: Page,
  products: readonly CartTestProduct[],
  cartPath: string,
  quantity?: number,
): Promise<CartExpectation> {
  const [product] = products;
  if (product !== undefined) return addVariantToCart(page, product, cartPath, quantity);

  throw createContractError({
    capability: "product-cart",
    routePath: cartPath,
    expectation: "At least one cart enabled product variant is discovered.",
    likelyFix: "Ensure the test store has an in-stock product variant.",
    docsAnchor: "#cart-line-items",
  });
}

async function addVariantToCart(
  page: Page,
  product: CartTestProduct,
  cartPath: string,
  quantity?: number,
): Promise<CartExpectation> {
  await page.goto(product.path);

  const expectation = {
    cartPath,
    variantId: product.variantId,
  };
  if (quantity !== undefined) await fillProductQuantity(page, quantity);
  const addToCart = await requireSignifier(page, "product-add-to-cart", {
    variantId: product.variantId,
    available: true,
  });
  await addToCart.click();
  await cartOverlayLineFor(page, expectation.variantId);
  await expectCartTotalsStatus(page, CART_TOTALS_UPDATED_TEXT, cartPath);
  await page.goto(cartPath);
  await expectCartLine(page, expectation);

  return expectation;
}

async function fillProductQuantity(page: Page, quantity: number): Promise<void> {
  const input = await requireSignifier(page, "product-quantity");
  await expect(input, "product-quantity must mark a visible input").toBeVisible();
  await expect(input, "product-quantity must mark a buyer-editable input").toBeEditable();
  await expect(async () => {
    // Hydration can restore the initial value. Filling the same value is safe to retry.
    await input.fill(String(quantity));
    expect(await input.inputValue()).toBe(String(quantity));
  }).toPass({ timeout: EXPECT_TIMEOUT_MS });
}

async function setCartLineQuantity(
  page: Page,
  expectation: CartExpectation,
  quantity: number,
): Promise<void> {
  const line = await expectCartLine(page, expectation);
  const quantityInput = await quantityInputFor(line, expectation.cartPath);
  const requestGate = createRequestGate();
  await page.route(CART_ENDPOINT_PATTERN, async (route) => {
    await requestGate.wait;
    await route.continue();
  });

  try {
    await quantityInput.fill(String(quantity));
    await quantityInput.press("Tab");
    await expectCartTotalsStatus(page, CART_TOTALS_UPDATING_TEXT, expectation.cartPath);
    requestGate.release();
    await expectCartTotalsStatus(page, CART_TOTALS_UPDATED_TEXT, expectation.cartPath);
    await expect(line).toHaveAttribute("data-shopify-pending", "false");
    await expect
      .poll(() => numericInputValue(quantityInput), {
        message: `Expected cart line quantity to settle at the discovered stock limit of ${quantity}.`,
      })
      .toBe(quantity);
    await expect(line).toHaveAttribute("data-shopify-quantity", String(quantity));
    await expect(quantityInput).toHaveValue(String(quantity));
  } finally {
    requestGate.release();
    await page.unroute(CART_ENDPOINT_PATTERN);
  }
}

async function expectCartLine(page: Page, expectation: CartExpectation): Promise<Locator> {
  const line = await requireCartLine(page, expectation.variantId);
  await expect(line).toHaveAttribute("data-shopify-pending", "false");
  const quantity = await quantityInputFor(line, expectation.cartPath);
  await expect(line).toHaveAttribute(
    "data-shopify-quantity",
    String(await numericInputValue(quantity)),
  );
  return line;
}

async function increaseCartLineQuantity(page: Page, expectation: CartExpectation): Promise<void> {
  const line = await expectCartLine(page, expectation);
  const quantityInput = await quantityInputFor(line, expectation.cartPath);
  const initialQuantity = await numericInputValue(quantityInput);
  const increase = await requireSignifier(line, "cart-line-increase");

  await increase.click();
  await expect
    .poll(() => numericInputValue(quantityInput), {
      message: `Expected cart line quantity to increase from ${initialQuantity} to ${initialQuantity + 1}.`,
    })
    .toBe(initialQuantity + 1);
  await expectCartTotalsStatus(page, CART_TOTALS_UPDATED_TEXT, expectation.cartPath);
  await expect(line).toHaveAttribute("data-shopify-pending", "false");
  await expect(line).toHaveAttribute("data-shopify-quantity", String(initialQuantity + 1));
  await expect(quantityInput).toHaveValue(String(initialQuantity + 1));
}

async function decreaseCartLineQuantity(page: Page, expectation: CartExpectation): Promise<void> {
  const line = await expectCartLine(page, expectation);
  const quantityInput = await quantityInputFor(line, expectation.cartPath);
  const initialQuantity = await numericInputValue(quantityInput);
  const decrease = await requireSignifier(line, "cart-line-decrease");

  await decrease.click();
  await expect
    .poll(() => numericInputValue(quantityInput), {
      message: `Expected cart line quantity to decrease from ${initialQuantity} to ${initialQuantity - 1} after quantity increase succeeded.`,
    })
    .toBe(initialQuantity - 1);
  await expectCartTotalsStatus(page, CART_TOTALS_UPDATED_TEXT, expectation.cartPath);
  await expect(line).toHaveAttribute("data-shopify-pending", "false");
  await expect(line).toHaveAttribute("data-shopify-quantity", String(initialQuantity - 1));
  await expect(quantityInput).toHaveValue(String(initialQuantity - 1));
}

async function removeCartLine(page: Page, expectation: CartExpectation): Promise<void> {
  const line = await expectCartLine(page, expectation);
  const remove = await requireSignifier(line, "cart-line-remove");

  await remove.click();
  await expect(line).not.toBeVisible({ timeout: CART_SETTLE_TIMEOUT_MS });
  await expectCartTotalsStatus(page, CART_TOTALS_UPDATED_TEXT, expectation.cartPath);
  await expect(
    locateSignifier(page, "cart-line", { merchandiseId: expectation.variantId }),
  ).toHaveCount(0);
}

function cartOverlayFor(page: Page): Locator {
  return page.getByRole("dialog");
}

async function cartOverlayLineFor(page: Page, variantId: string): Promise<Locator> {
  return requireCartLine(cartOverlayFor(page), variantId);
}

async function requireCartLine(scope: Page | Locator, variantId: string): Promise<Locator> {
  return requireSignifier(
    scope,
    "cart-line",
    { merchandiseId: variantId },
    { timeout: CART_SETTLE_TIMEOUT_MS, visible: true },
  );
}

async function openCartOverlayFor(page: Page, variantId: string): Promise<Locator> {
  const line = locateSignifier(cartOverlayFor(page), "cart-line", { merchandiseId: variantId });
  if ((await line.filter({ visible: true }).count()) > 0)
    return cartOverlayLineFor(page, variantId);

  await page.getByRole("button", { name: CART_CONTROL_NAME }).first().click();
  return cartOverlayLineFor(page, variantId);
}

async function expectCartTotalsStatus(
  page: Page,
  message: string,
  cartPath: string,
): Promise<void> {
  try {
    await expect(page.getByRole("status").filter({ hasText: message }).first()).toBeAttached({
      timeout: CART_SETTLE_TIMEOUT_MS,
    });
  } catch {
    throw createContractError({
      capability: "cart-status",
      routePath: cartPath,
      expectation: `Cart exposes a status region containing "${message}" while totals settle.`,
      likelyFix:
        'Render a role="status" region that changes from updating to updated around cart mutations.',
      docsAnchor: "#cart-line-items",
    });
  }
}

async function quantityInputFor(line: Locator, cartPath: string): Promise<Locator> {
  const input = await requireSignifier(line, "cart-line-quantity");
  await expect(input, `Cart line quantity input on ${cartPath} is visible.`).toBeVisible();
  return input;
}

async function numericInputValue(input: Locator): Promise<number> {
  const value = await input.inputValue();
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
