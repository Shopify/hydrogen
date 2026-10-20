import { expect, type Locator, type Page } from "@playwright/test";

import { createContractError } from "../../src/contract";
import { test, type CartTestProduct } from "./config";

const CART_SETTLE_TIMEOUT_MS = 15_000;
const CART_ENDPOINT_PATTERN = "**/api/cart";
const CART_TOTALS_UPDATING_TEXT = "Updating cart totals";
const CART_TOTALS_UPDATED_TEXT = "Cart totals updated";

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

  const requestGate = createRequestGate();
  await page.route(CART_ENDPOINT_PATTERN, async (route) => {
    await requestGate.wait;
    await route.continue();
  });

  const addToCart = page.getByTestId("product-add-to-cart").filter({ visible: true }).first();

  try {
    await addToCart.click();
    const line = await openCartOverlayFor(page, product.productTitle);
    await expect(line).toBeVisible({ timeout: CART_SETTLE_TIMEOUT_MS });
    const quantityInput = quantityInputFor(line);
    await expect
      .poll(() => numericInputValue(quantityInput), {
        message: `Expected cart line quantity to optimistically increase from ${product.maxQuantity} to ${product.maxQuantity + 1}.`,
      })
      .toBe(product.maxQuantity + 1);
    await expectCartTotalsStatus(page, CART_TOTALS_UPDATING_TEXT);

    requestGate.release();
    await expect
      .poll(() => numericInputValue(quantityInput), {
        message: `Expected cart line quantity to roll back to the stock limit of ${product.maxQuantity}.`,
      })
      .toBe(product.maxQuantity);
    await expectCartTotalsStatus(page, CART_TOTALS_UPDATED_TEXT);
  } finally {
    requestGate.release();
    await page.unroute(CART_ENDPOINT_PATTERN);
  }
});

test.describe("cart locator helpers", () => {
  const triggerHtml = `<button type="button" data-testid="cart-trigger" onclick="window.triggerClicked = true; document.getElementById('drawer').showModal()">Cart</button>`;

  test("reads cart page lines and drawer lines from their own view", async ({ page }) => {
    // A line outside both views comes first, so an unscoped match would find it.
    await page.setContent(`
      <main><ul>${cartLineHtml("Shirt outside")}</ul></main>
      <dialog open data-testid="cart-drawer"><ul>${cartLineHtml("Shirt drawer line")}</ul></dialog>
      <div data-testid="cart-page"><ul>${cartLineHtml("Shirt page line")}</ul></div>`);

    await expect(cartLineFor(page, "Shirt")).toHaveText("Shirt page line");
    await expect(cartOverlayLineFor(page, "Shirt")).toHaveText("Shirt drawer line");
  });

  test("uses a drawer that opened by itself without clicking the cart trigger", async ({
    page,
  }) => {
    await page.setContent(`
      ${triggerHtml}
      <dialog open id="drawer" data-testid="cart-drawer"><ul>${cartLineHtml("Shirt")}</ul></dialog>`);

    await expect(await openCartOverlayFor(page, "Shirt")).toBeVisible();
    expect(await wasTriggerClicked(page)).toBe(false);
  });

  test("opens a closed drawer with the cart trigger, also when its lines render later", async ({
    page,
  }) => {
    // The drawer is empty until the trigger opens it, then adds the line later.
    await page.setContent(`
      <button type="button" data-testid="cart-trigger" onclick="
        window.triggerClicked = true;
        const drawer = document.getElementById('drawer');
        drawer.showModal();
        setTimeout(() => { drawer.innerHTML = '<ul>${cartLineHtml("Shirt").replaceAll('"', "&quot;")}</ul>'; }, 50);
      ">Cart</button>
      <dialog id="drawer" data-testid="cart-drawer"></dialog>`);

    await expect(await openCartOverlayFor(page, "Shirt")).toBeVisible();
    expect(await wasTriggerClicked(page)).toBe(true);
  });

  test("changes quantity with the controls of the chosen line only", async ({ page }) => {
    // The other line comes first, so a page-level match would change its quantity.
    await page.setContent(`<div data-testid="cart-page"><ul>
      ${quantityLineHtml("Hat", 5)}
      ${quantityLineHtml("Shirt", 1)}
    </ul></div>`);
    const line = cartLineFor(page, "Shirt");

    await stepCartLineQuantity(line, "increase");
    await expect(quantityInputFor(line)).toHaveValue("2");
    await stepCartLineQuantity(line, "decrease");
    await expect(quantityInputFor(line)).toHaveValue("1");
    await expect(quantityInputFor(cartLineFor(page, "Hat"))).toHaveValue("5");
  });

  test("removes only the chosen line", async ({ page }) => {
    // The other page line and the drawer line have remove controls too.
    await page.setContent(`
      <div data-testid="cart-page"><ul>${removableLineHtml("Hat")}${removableLineHtml("Shirt")}</ul></div>
      <dialog open data-testid="cart-drawer"><ul>${removableLineHtml("Shirt")}</ul></dialog>`);

    await removeLine(cartLineFor(page, "Shirt"));

    const pageLines = page.getByTestId("cart-page").getByTestId("cart-line");
    await expect(pageLines).toHaveCount(1);
    await expect(pageLines).toContainText("Hat");
    await expect(page.getByTestId("cart-drawer").getByTestId("cart-line")).toContainText("Shirt");
  });

  test("waits for the cart totals status message to change", async ({ page }) => {
    await page.setContent(
      `<span role="status" data-testid="cart-status">${CART_TOTALS_UPDATING_TEXT}</span>`,
    );

    const updated = expectCartTotalsStatus(page, CART_TOTALS_UPDATED_TEXT);
    await expect(page.getByTestId("cart-status")).toHaveText(CART_TOTALS_UPDATING_TEXT);
    await page.getByTestId("cart-status").evaluate((status, message) => {
      status.textContent = message;
    }, CART_TOTALS_UPDATED_TEXT);
    await updated;
  });
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
  const addToCart = page.getByTestId("product-add-to-cart").filter({ visible: true }).first();
  const isCartVisible = await addToCart
    .waitFor({ state: "visible", timeout: CART_SETTLE_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);
  const isCartEnabled = isCartVisible && (await addToCart.isEnabled().catch(() => false));
  if (!isCartEnabled) return null;

  await addToCart.click();
  // Ordinary Add to cart needs the drawer to open by itself.
  const line = cartOverlayLineFor(page, expectation.productTitle);
  await expect(line).toBeVisible({
    timeout: CART_SETTLE_TIMEOUT_MS,
  });
  await expectCartTotalsStatus(page, CART_TOTALS_UPDATED_TEXT);
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
  const quantityInput = quantityInputFor(line);
  const requestGate = createRequestGate();
  await page.route(CART_ENDPOINT_PATTERN, async (route) => {
    await requestGate.wait;
    await route.continue();
  });

  try {
    await quantityInput.fill(String(quantity));
    await quantityInput.press("Tab");
    await expectCartTotalsStatus(page, CART_TOTALS_UPDATING_TEXT);
    requestGate.release();
    await expect
      .poll(() => numericInputValue(quantityInput), {
        message: `Expected cart line quantity to settle at the discovered stock limit of ${quantity}.`,
      })
      .toBe(quantity);
    await expectCartTotalsStatus(page, CART_TOTALS_UPDATED_TEXT);
  } finally {
    requestGate.release();
    await page.unroute(CART_ENDPOINT_PATTERN);
  }
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
  await stepCartLineQuantity(line, "increase");
}

async function decreaseCartLineQuantity(page: Page, expectation: CartExpectation): Promise<void> {
  const line = await expectCartLine(page, expectation);
  await stepCartLineQuantity(line, "decrease");
}

/** Clicks the line's increase or decrease control and waits for the native input value. */
async function stepCartLineQuantity(
  line: Locator,
  control: "increase" | "decrease",
): Promise<void> {
  const quantityInput = quantityInputFor(line);
  const initialQuantity = await numericInputValue(quantityInput);
  const expectedQuantity = control === "increase" ? initialQuantity + 1 : initialQuantity - 1;
  const message =
    control === "increase"
      ? `Expected cart line quantity to increase from ${initialQuantity} to ${expectedQuantity}.`
      : `Expected cart line quantity to decrease from ${initialQuantity} to ${expectedQuantity} after quantity increase succeeded.`;

  await lineControl(line, `cart-line-${control}`).click();
  await expect.poll(() => numericInputValue(quantityInput), { message }).toBe(expectedQuantity);
}

async function removeCartLine(page: Page, expectation: CartExpectation): Promise<void> {
  const line = await expectCartLine(page, expectation);
  await removeLine(line);
}

/** Clicks the line's remove control and waits for the line to go away. */
async function removeLine(line: Locator): Promise<void> {
  await lineControl(line, "cart-line-remove").click();
  await expect(line).not.toBeVisible({ timeout: CART_SETTLE_TIMEOUT_MS });
}

/** The visible line with the product title inside the visible cart page. */
function cartLineFor(page: Page, productTitle: string): Locator {
  return lineIn(page.getByTestId("cart-page"), productTitle);
}

/** The visible line with the product title inside the open cart drawer. */
function cartOverlayLineFor(page: Page, productTitle: string): Locator {
  return lineIn(page.getByTestId("cart-drawer"), productTitle);
}

function lineIn(view: Locator, productTitle: string): Locator {
  return view
    .filter({ visible: true })
    .first()
    .getByTestId("cart-line")
    .filter({ hasText: productTitle, visible: true })
    .first();
}

/**
 * Returns the drawer line. Clicks the cart trigger only when no cart drawer is
 * open, so a drawer that opened by itself after Add to cart is not toggled.
 */
async function openCartOverlayFor(page: Page, productTitle: string): Promise<Locator> {
  const isOpen = (await page.getByTestId("cart-drawer").filter({ visible: true }).count()) > 0;
  if (!isOpen) await page.getByTestId("cart-trigger").filter({ visible: true }).first().click();
  return cartOverlayLineFor(page, productTitle);
}

/** Waits for an accessible cart-status region that says `message`. */
async function expectCartTotalsStatus(page: Page, message: string): Promise<void> {
  const status = page
    .getByTestId("cart-status")
    .and(page.getByRole("status"))
    .filter({ hasText: message })
    .first();
  await expect(
    status,
    `Expected a cart-status region with role="status" that says "${message}".`,
  ).toBeAttached({
    timeout: CART_SETTLE_TIMEOUT_MS,
  });
}

function quantityInputFor(line: Locator): Locator {
  return lineControl(line, "cart-line-quantity");
}

function lineControl(line: Locator, testId: string): Locator {
  return line.getByTestId(testId).filter({ visible: true }).first();
}

async function numericInputValue(input: Locator): Promise<number> {
  const value = await input.inputValue();
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shouldAssertVariant(variantLabel: string): boolean {
  return variantLabel !== "" && variantLabel.toLowerCase() !== "default title";
}

/** A cart line for helper fixtures. */
function cartLineHtml(text: string): string {
  return `<li data-testid="cart-line">${text}</li>`;
}

/** A helper fixture line with working quantity controls. */
function quantityLineHtml(title: string, quantity: number): string {
  return `<li data-testid="cart-line">
    <span>${title}</span>
    <input type="number" data-testid="cart-line-quantity" aria-label="Menge" value="${quantity}">
    <button type="button" data-testid="cart-line-increase" aria-label="Mehr" onclick="${quantityStepScript(1)}">↑</button>
    <button type="button" data-testid="cart-line-decrease" aria-label="Weniger" onclick="${quantityStepScript(-1)}">↓</button>
  </li>`;
}

/** Inline click handler that changes the line's quantity input by `delta`. */
function quantityStepScript(delta: number): string {
  return `const input = this.closest('[data-testid=cart-line]').querySelector('[data-testid=cart-line-quantity]'); input.value = String(Number(input.value) + ${delta});`;
}

/** A helper fixture line with a working remove control. */
function removableLineHtml(title: string): string {
  return `<li data-testid="cart-line">${title} <button type="button" data-testid="cart-line-remove" aria-label="Entfernen" onclick="this.closest('[data-testid=cart-line]').remove()">×</button></li>`;
}

async function wasTriggerClicked(page: Page): Promise<boolean> {
  return page.evaluate(() => "triggerClicked" in window);
}
