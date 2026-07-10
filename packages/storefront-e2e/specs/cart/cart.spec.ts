import { expect, type Locator, type Page } from "@playwright/test";

import { createContractError } from "../../src/contract";
import { test, type CartTestProduct } from "./config";

const CART_SETTLE_TIMEOUT_MS = 15_000;
const ADD_TO_CART_NAME = /add to cart/i;
const CART_CONTROL_NAME = /^(?:open |view )?cart\b/i;
const REMOVE_CONTROL_NAME = /remove/i;
const INCREASE_CONTROL_NAME = /increase|^\+$/i;
const DECREASE_CONTROL_NAME = /decrease|^[-−]$/i;
const CART_ENDPOINT_PATTERN = "**/api/cart";

type CartExpectation = {
  readonly cartPath: string;
  readonly productTitle: string;
  readonly variantLabel: string;
};

test("cart accepts selected variant", async ({ data, page }) => {
  await addProductToCart(page, data.products, data.paths.cart);
});

test("cart page shows added product", async ({ data, page }) => {
  const expectation = await addProductToCart(page, data.products, data.paths.cart);

  await expectCartLine(page, expectation);
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

  const expectation = await tryAddProductToCart(page, product, data.paths.cart);
  if (!expectation) {
    throw createContractError({
      capability: "product-cart",
      routePath: product.path,
      expectation: "The discovered stock-limit product exposes an enabled Add to cart button.",
      likelyFix: "Keep the discovered in-stock variant available on its product page.",
      docsAnchor: "#cart-line-items",
    });
  }
  await setCartLineQuantity(page, expectation, product.maxQuantity);
  await page.goto(product.path);

  let releaseRequest!: () => void;
  const requestGate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  await page.route(CART_ENDPOINT_PATTERN, async (route) => {
    await requestGate;
    await route.continue();
  });

  const addToCart = page.getByRole("button", { name: ADD_TO_CART_NAME }).first();

  try {
    await addToCart.click();
    const line = await openCartOverlayFor(page, product.productTitle);
    await expect(line).toBeVisible({ timeout: CART_SETTLE_TIMEOUT_MS });
    const quantityInput = await quantityInputFor(line, product.path);
    await expect
      .poll(() => numericInputValue(quantityInput), {
        message: `Expected cart line quantity to optimistically increase from ${product.maxQuantity} to ${product.maxQuantity + 1}.`,
      })
      .toBe(product.maxQuantity + 1);

    releaseRequest();
    await expect
      .poll(() => numericInputValue(quantityInput), {
        message: `Expected cart line quantity to roll back to the stock limit of ${product.maxQuantity}.`,
      })
      .toBe(product.maxQuantity);
    await expectCartLineSettled(line);
  } finally {
    releaseRequest();
    await page.unroute(CART_ENDPOINT_PATTERN);
  }
});

async function addProductToCart(
  page: Page,
  products: readonly CartTestProduct[],
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
  product: CartTestProduct,
  cartPath: string,
): Promise<CartExpectation | null> {
  await page.goto(product.path);

  const expectation = {
    cartPath,
    productTitle: product.productTitle,
    variantLabel: product.variantLabel,
  };
  const addToCart = page.getByRole("button", { name: ADD_TO_CART_NAME }).first();
  const isCartVisible = await addToCart
    .waitFor({ state: "visible", timeout: CART_SETTLE_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);
  const isCartEnabled = isCartVisible && (await addToCart.isEnabled().catch(() => false));
  if (!isCartEnabled) return null;

  await addToCart.click();
  const line = cartOverlayLineFor(page, expectation.productTitle);
  await expect(line).toBeVisible({
    timeout: CART_SETTLE_TIMEOUT_MS,
  });
  await expectCartLineSettled(line);
  await page.goto(cartPath);
  await expectCartLine(page, expectation);

  return expectation;
}

async function setCartLineQuantity(
  page: Page,
  expectation: CartExpectation,
  quantity: number,
): Promise<void> {
  const line = await expectCartLine(page, expectation);
  const quantityInput = await quantityInputFor(line, expectation.cartPath);

  await quantityInput.fill(String(quantity));
  await quantityInput.press("Tab");
  await expect
    .poll(() => numericInputValue(quantityInput), {
      message: `Expected cart line quantity to settle at the discovered stock limit of ${quantity}.`,
    })
    .toBe(quantity);
  await expectCartLineSettled(line);
}

async function expectCartLine(page: Page, expectation: CartExpectation): Promise<Locator> {
  const line = cartLineFor(page, expectation.productTitle);
  await expect(line).toBeVisible({ timeout: CART_SETTLE_TIMEOUT_MS });

  if (shouldAssertVariant(expectation.variantLabel)) {
    await expect(line.getByText(expectation.variantLabel, { exact: false })).toBeVisible();
  }

  return line;
}

async function increaseCartLineQuantity(page: Page, expectation: CartExpectation): Promise<void> {
  const line = await expectCartLine(page, expectation);
  const quantityInput = await quantityInputFor(line, expectation.cartPath);
  const initialQuantity = await numericInputValue(quantityInput);
  const increase = await lineButton(
    line,
    INCREASE_CONTROL_NAME,
    "increase quantity",
    expectation.cartPath,
  );

  await increase.click();
  await expect
    .poll(() => numericInputValue(quantityInput), {
      message: `Expected cart line quantity to increase from ${initialQuantity} to ${initialQuantity + 1}.`,
    })
    .toBe(initialQuantity + 1);
}

async function decreaseCartLineQuantity(page: Page, expectation: CartExpectation): Promise<void> {
  const line = await expectCartLine(page, expectation);
  const quantityInput = await quantityInputFor(line, expectation.cartPath);
  const initialQuantity = await numericInputValue(quantityInput);
  const decrease = await lineButton(
    line,
    DECREASE_CONTROL_NAME,
    "decrease quantity",
    expectation.cartPath,
  );

  await decrease.click();
  await expect
    .poll(() => numericInputValue(quantityInput), {
      message: `Expected cart line quantity to decrease from ${initialQuantity} to ${initialQuantity - 1} after quantity increase succeeded.`,
    })
    .toBe(initialQuantity - 1);
}

async function removeCartLine(page: Page, expectation: CartExpectation): Promise<void> {
  const line = await expectCartLine(page, expectation);
  const remove = await lineButton(
    line,
    REMOVE_CONTROL_NAME,
    "remove line item",
    expectation.cartPath,
  );

  await remove.click();
  await expect(line).not.toBeVisible({ timeout: CART_SETTLE_TIMEOUT_MS });
}

function cartOverlayLineFor(page: Page, productTitle: string): Locator {
  return page.getByRole("dialog").getByRole("listitem").filter({ hasText: productTitle }).first();
}

async function openCartOverlayFor(page: Page, productTitle: string): Promise<Locator> {
  const line = cartOverlayLineFor(page, productTitle);
  if (await line.isVisible().catch(() => false)) return line;

  await page.getByRole("button", { name: CART_CONTROL_NAME }).first().click();
  return line;
}

async function expectCartLineSettled(line: Locator): Promise<void> {
  await expect(line.locator('[aria-busy="true"]')).toHaveCount(0, {
    timeout: CART_SETTLE_TIMEOUT_MS,
  });
}

function cartLineFor(page: Page, productTitle: string): Locator {
  return page.getByRole("main").getByRole("listitem").filter({ hasText: productTitle }).first();
}

async function quantityInputFor(line: Locator, cartPath: string): Promise<Locator> {
  const textbox = line.getByRole("textbox").first();
  if (await textbox.isVisible().catch(() => false)) return textbox;

  const spinbutton = line.getByRole("spinbutton").first();
  if (await spinbutton.isVisible().catch(() => false)) return spinbutton;

  throw createContractError({
    capability: "cart-line",
    routePath: cartPath,
    expectation: "Cart line item exposes a visible quantity input.",
    likelyFix: "Label the cart line quantity control and keep it inside the line item.",
    docsAnchor: "#cart-line-items",
  });
}

async function numericInputValue(input: Locator): Promise<number> {
  const value = await input.inputValue();
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shouldAssertVariant(variantLabel: string): boolean {
  return variantLabel !== "" && variantLabel.toLowerCase() !== "default title";
}

async function lineButton(
  line: Locator,
  name: RegExp,
  purpose: string,
  cartPath: string,
): Promise<Locator> {
  const button = line.getByRole("button", { name }).first();
  if (await button.isVisible().catch(() => false)) return button;

  throw createContractError({
    capability: "cart-line",
    routePath: cartPath,
    expectation: "Cart line item exposes a visible button for " + purpose + ".",
    likelyFix: "Add accessible names to cart line quantity and remove controls.",
    docsAnchor: "#cart-line-items",
  });
}
