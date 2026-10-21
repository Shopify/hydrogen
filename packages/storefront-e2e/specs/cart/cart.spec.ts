import { expect, type Locator, type Page } from "@playwright/test";

import { createContractError } from "../../src/contract";
import { test, type CartTestProduct } from "./config";

const CART_SETTLE_TIMEOUT_MS = 15_000;
const CART_ENDPOINT_PATTERN = "**/api/cart";
/** Fake storefront origin for cart outcome fixtures. No request leaves the browser. */
const STOREFRONT_ORIGIN = "https://storefront.test";

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

test("cart removal persists after reload while another line stays", async ({ data, page }) => {
  const removed = await addProductToCart(page, data.products, data.paths.cart);
  const secondProducts = data.products.filter((product) =>
    hasDistinctCartLineTitle(product.productTitle, removed.productTitle),
  );
  if (secondProducts.length === 0) {
    test.skip(
      true,
      "No second cart enabled product has a title that is distinct from the first one, so the cart lines cannot be told apart",
    );
    return;
  }

  const witness = await addProductToCart(page, secondProducts, data.paths.cart);
  await expectCartLineQuantity(page, removed, 1);
  await expectCartLineQuantity(page, witness, 1);

  await removeCartLineAndExpectPersisted(page, removed, witness);
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
    await waitForCartState(page, "updating");

    requestGate.release();
    await expect
      .poll(() => numericInputValue(quantityInput), {
        message: `Expected cart line quantity to roll back to the stock limit of ${product.maxQuantity}.`,
      })
      .toBe(product.maxQuantity);
    await waitForCartState(page, "updated");
    // The state is only a wait. The native quantity is the result.
    expect(
      await numericInputValue(quantityInput),
      `Expected cart line quantity to stay at the stock limit of ${product.maxQuantity} after the cart settled.`,
    ).toBe(product.maxQuantity);
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

  test("waits for the cart state to change, with any message text", async ({ page }) => {
    await page.setContent(cartStatusHtml("updating", "Wird aktualisiert"));
    await waitForCartState(page, "updating");

    const updated = waitForCartState(page, "updated", { timeout: 2_000 });
    await expect(page.getByTestId("cart-status")).toHaveAttribute("data-cart-state", "updating");
    await page.getByTestId("cart-status").evaluate((status) => {
      status.setAttribute("data-cart-state", "updated");
    });
    await updated;
  });

  test("an idle region in another view does not block updated", async ({ page }) => {
    await page.setContent(`
      <div data-testid="cart-page">${cartStatusHtml("updated", "")}</div>
      <dialog open data-testid="cart-drawer">${cartStatusHtml("idle", "")}</dialog>`);

    await waitForCartState(page, "updated");
  });

  test("does not settle on updated while another region is updating or has an error", async ({
    page,
  }) => {
    for (const other of ["updating", "error"]) {
      await test.step(other, async () => {
        await page.setContent(`${cartStatusHtml("updated", "Done")}${cartStatusHtml(other, "")}`);
        await expect(waitForCartState(page, "updated", { timeout: 200 })).rejects.toThrow(
          /data-cart-state="updated"/,
        );
      });
    }
  });

  test("does not settle on updated for an idle, error, missing, or unknown state", async ({
    page,
  }) => {
    const cases = [
      cartStatusHtml("idle", "Cart totals updated"),
      cartStatusHtml("error", "Cart totals updated"),
      `<span role="status" data-testid="cart-status">Cart totals updated</span>`,
      cartStatusHtml("done", "Cart totals updated"),
      `${cartStatusHtml("updated", "")}${cartStatusHtml("done", "")}`,
    ];

    for (const html of cases) {
      await test.step(html, async () => {
        await page.setContent(html);
        await expect(waitForCartState(page, "updated", { timeout: 200 })).rejects.toThrow(
          /data-cart-state="updated"/,
        );
      });
    }
  });

  test("ignores hidden cart-status regions", async ({ page }) => {
    // A hidden region that says updated must not end the wait while the visible one is idle.
    for (const hidden of ['aria-hidden="true"', "hidden"]) {
      await test.step(hidden, async () => {
        await page.setContent(
          `${cartStatusHtml("idle", "")}${cartStatusHtml("updated", "", hidden)}`,
        );
        await expect(waitForCartState(page, "updated", { timeout: 200 })).rejects.toThrow(
          /data-cart-state="updated"/,
        );
      });
    }
  });

  test("waits for an error state when asked, but not while a region is updating", async ({
    page,
  }) => {
    await page.setContent(`${cartStatusHtml("error", "")}${cartStatusHtml("idle", "")}`);
    await waitForCartState(page, "error");

    await page.setContent(`${cartStatusHtml("error", "")}${cartStatusHtml("updating", "")}`);
    await expect(waitForCartState(page, "error", { timeout: 200 })).rejects.toThrow(
      /data-cart-state="error"/,
    );
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
  await waitForCartState(page, "updated");
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
    await waitForCartState(page, "updating");
    requestGate.release();
    await expect
      .poll(() => numericInputValue(quantityInput), {
        message: `Expected cart line quantity to settle at the discovered stock limit of ${quantity}.`,
      })
      .toBe(quantity);
    await waitForCartState(page, "updated");
  } finally {
    requestGate.release();
    await page.unroute(CART_ENDPOINT_PATTERN);
  }
}

async function expectCartLine(
  page: Page,
  expectation: CartExpectation,
  { timeout }: CartWaitOptions = {},
): Promise<Locator> {
  const line = cartLineFor(page, expectation.productTitle);
  await expect(line).toBeVisible({ timeout: timeout ?? CART_SETTLE_TIMEOUT_MS });

  if (shouldAssertVariant(expectation.variantLabel)) {
    await expect(line.getByText(expectation.variantLabel, { exact: false })).toBeVisible({
      timeout,
    });
  }

  return line;
}

/** Expects the cart page line, with its variant, to show `expected` as its native quantity. */
async function expectCartLineQuantity(
  page: Page,
  expectation: CartExpectation,
  expected: number,
  options: CartWaitOptions = {},
): Promise<void> {
  const quantityInput = quantityInputFor(await expectCartLine(page, expectation, options));
  await expect
    .poll(() => numericInputValue(quantityInput), {
      message: `Expected the ${expectation.productTitle} cart line quantity to be ${expected}.`,
      timeout: options.timeout,
    })
    .toBe(expected);
}

/**
 * Waits for the cart change to settle, then reads the native quantity once.
 * The state is only a wait: a settled cart with another quantity fails.
 */
async function expectSettledCartLineQuantity(
  page: Page,
  expectation: CartExpectation,
  expected: number,
  options: CartWaitOptions = {},
): Promise<void> {
  await waitForCartState(page, "updated", options);
  const quantityInput = quantityInputFor(await expectCartLine(page, expectation, options));
  expect(
    await numericInputValue(quantityInput),
    `Expected the ${expectation.productTitle} cart line quantity to be ${expected} after the cart settled.`,
  ).toBe(expected);
}

/**
 * Reloads the cart page, then expects the same line and variant with the
 * native quantity. This checks what the storefront shows after a reload, not
 * the stored cart itself.
 */
async function expectPersistedCartLineQuantity(
  page: Page,
  expectation: CartExpectation,
  expected: number,
  options: CartWaitOptions = {},
): Promise<void> {
  await page.reload();
  await expectCartLineQuantity(page, expectation, expected, options);
}

/** Expects no visible cart page line for the product. Read once, after the caller proved the page loaded. */
async function expectNoCartLine(page: Page, expectation: CartExpectation): Promise<void> {
  const lines = page
    .getByTestId("cart-page")
    .filter({ visible: true })
    .first()
    .getByTestId("cart-line")
    .filter({ hasText: expectation.productTitle, visible: true });
  expect(
    await lines.count(),
    `Expected no ${expectation.productTitle} cart line on the cart page.`,
  ).toBe(0);
}

async function increaseCartLineQuantity(page: Page, expectation: CartExpectation): Promise<void> {
  await changeCartLineQuantityAndExpectPersisted(page, expectation, "increase");
}

async function decreaseCartLineQuantity(page: Page, expectation: CartExpectation): Promise<void> {
  await changeCartLineQuantityAndExpectPersisted(page, expectation, "decrease");
}

/**
 * Steps the quantity, waits for the cart to settle after the optimistic change
 * shows, reads the native quantity again, then reloads and reads it a third time.
 */
async function changeCartLineQuantityAndExpectPersisted(
  page: Page,
  expectation: CartExpectation,
  control: "increase" | "decrease",
): Promise<void> {
  const line = await expectCartLine(page, expectation);
  const expected = await stepCartLineQuantity(line, control);
  await expectSettledCartLineQuantity(page, expectation, expected);
  await expectPersistedCartLineQuantity(page, expectation, expected);
}

/**
 * Clicks the line's increase or decrease control and waits for the optimistic
 * native input value. Returns that value.
 */
async function stepCartLineQuantity(
  line: Locator,
  control: "increase" | "decrease",
): Promise<number> {
  const quantityInput = quantityInputFor(line);
  const initialQuantity = await numericInputValue(quantityInput);
  const expectedQuantity = control === "increase" ? initialQuantity + 1 : initialQuantity - 1;
  const message =
    control === "increase"
      ? `Expected cart line quantity to increase from ${initialQuantity} to ${expectedQuantity}.`
      : `Expected cart line quantity to decrease from ${initialQuantity} to ${expectedQuantity} after quantity increase succeeded.`;

  await lineControl(line, `cart-line-${control}`).click();
  await expect.poll(() => numericInputValue(quantityInput), { message }).toBe(expectedQuantity);
  return expectedQuantity;
}

async function removeCartLine(page: Page, expectation: CartExpectation): Promise<void> {
  const line = await expectCartLine(page, expectation);
  await removeLine(line);
  await waitForCartState(page, "updated");
  await expectNoCartLine(page, expectation);
}

/**
 * Removes one line, then checks after the cart settles and after a reload that
 * the line is gone. The witness line must show first after the reload, with
 * its variant and quantity, so an empty or loading cart page cannot pass.
 */
async function removeCartLineAndExpectPersisted(
  page: Page,
  removed: CartExpectation,
  witness: CartExpectation,
  options: CartWaitOptions = {},
): Promise<void> {
  await removeLine(await expectCartLine(page, removed, options));
  await waitForCartState(page, "updated", options);
  await expectNoCartLine(page, removed);
  await expectCartLineQuantity(page, witness, 1, options);

  await page.reload();
  await expectCartLineQuantity(page, witness, 1, options);
  await expectNoCartLine(page, removed);
}

/**
 * Cart lines are found by title text, which matches substrings without case.
 * A second product is usable only when neither title contains the other.
 */
function hasDistinctCartLineTitle(title: string, otherTitle: string): boolean {
  const normalized = title.toLowerCase();
  const otherNormalized = otherTitle.toLowerCase();
  return !normalized.includes(otherNormalized) && !otherNormalized.includes(normalized);
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

const CART_STATES = ["idle", "updating", "updated", "error"];

type CartWaitOptions = {
  /** How long to wait. Defaults to the cart settle timeout. */
  readonly timeout?: number;
};

/**
 * Waits until the accessible cart-status regions reach `state`. This is a
 * readiness wait, not a verdict: callers still assert the real result.
 * `updating` needs one updating region. `updated` needs one updated region and
 * no region that is updating or has an error. `error` needs one region with an
 * error and no updating region. A missing or unknown state never completes
 * `updated` or `error`.
 */
async function waitForCartState(
  page: Page,
  state: "updating" | "updated" | "error",
  { timeout = CART_SETTLE_TIMEOUT_MS }: CartWaitOptions = {},
): Promise<void> {
  const statuses = page.getByTestId("cart-status").and(page.getByRole("status"));
  await expect
    .poll(
      async () => {
        const states = await statuses.evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-cart-state")),
        );
        return isCartStateReached(states, state);
      },
      { message: `Expected the cart-status regions to reach data-cart-state="${state}".`, timeout },
    )
    .toBe(true);
}

function isCartStateReached(states: readonly (string | null)[], target: string): boolean {
  if (!states.includes(target)) return false;
  if (target === "updating") return true;
  if (states.includes("updating")) return false;
  if (target === "updated" && states.includes("error")) return false;
  return states.every((value) => value !== null && CART_STATES.includes(value));
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

test.describe("cart outcome helpers", () => {
  const options: CartWaitOptions = { timeout: 500 };
  const shirt: CartExpectation = {
    cartPath: `${STOREFRONT_ORIGIN}/cart`,
    productTitle: "Shirt",
    variantLabel: "Small",
  };
  const hat: CartExpectation = { ...shirt, productTitle: "Hat", variantLabel: "Blue" };

  test("fails the settled quantity check when the cart settles with another quantity", async ({
    page,
  }) => {
    for (const [finalQuantity, passes] of [
      [2, true],
      [1, false],
    ] as const) {
      await test.step(`settles at ${finalQuantity}`, async () => {
        // The increase shows 2 at once, then the cart settles at finalQuantity.
        await openCartFixture(page, [
          `${cartStatusHtml("idle", "", 'id="status"')}
          <div data-testid="cart-page"><ul>
            ${outcomeLineHtml("Shirt", "Small", 1, settlingIncreaseScript(finalQuantity))}
          </ul></div>`,
        ]);
        const optimistic = await stepCartLineQuantity(cartLineFor(page, "Shirt"), "increase");
        expect(optimistic).toBe(2);

        const settledCheck = expectSettledCartLineQuantity(page, shirt, optimistic, options);
        if (passes) {
          await settledCheck;
        } else {
          await expect(settledCheck).rejects.toThrow(
            "Expected the Shirt cart line quantity to be 2 after the cart settled.",
          );
        }
      });
    }
  });

  test("fails the reload check for another quantity, another variant, or a missing line", async ({
    page,
  }) => {
    const cases: [string, string | null][] = [
      [outcomeLineHtml("Shirt", "Small", 2), null],
      [outcomeLineHtml("Shirt", "Small", 1), "Expected the Shirt cart line quantity to be 2."],
      [outcomeLineHtml("Shirt", "Large", 2), "Small"],
      [outcomeLineHtml("Hat", "Blue", 2), "Shirt"],
    ];

    for (const [reloaded, message] of cases) {
      await test.step(reloaded, async () => {
        await openCartFixture(page, [
          `<div data-testid="cart-page"><ul>${outcomeLineHtml("Shirt", "Small", 2)}</ul></div>`,
          `<div data-testid="cart-page"><ul>${reloaded}</ul></div>`,
        ]);
        const check = expectPersistedCartLineQuantity(page, shirt, 2, options);
        if (message === null) {
          await check;
        } else {
          await expect(check).rejects.toThrow(message);
        }
      });
    }
  });

  test("fails the removal reload check unless the witness line shows and the removed line does not", async ({
    page,
  }) => {
    const before = `<div data-testid="cart-page"><ul>
      ${outcomeLineHtml("Shirt", "Small", 1, "", "this.closest('[data-testid=cart-line]').remove()")}
      ${outcomeLineHtml("Hat", "Blue", 1)}
    </ul></div>`;
    const cases: [string, string | null][] = [
      [`<div data-testid="cart-page"><ul>${outcomeLineHtml("Hat", "Blue", 1)}</ul></div>`, null],
      // An empty or still loading cart page has no Shirt line either. It must not pass.
      [`<div data-testid="cart-page"><ul></ul></div>`, "Hat"],
      [
        `<div data-testid="cart-page"><ul>${outcomeLineHtml("Hat", "Blue", 2)}</ul></div>`,
        "Expected the Hat cart line quantity to be 1.",
      ],
      [
        `<div data-testid="cart-page"><ul>${outcomeLineHtml("Shirt", "Small", 1)}${outcomeLineHtml("Hat", "Blue", 1)}</ul></div>`,
        "Expected no Shirt cart line on the cart page.",
      ],
    ];

    for (const [reloaded, message] of cases) {
      await test.step(reloaded, async () => {
        await openCartFixture(page, [
          `${cartStatusHtml("updated", "")}${before}`,
          `${cartStatusHtml("idle", "")}${reloaded}`,
        ]);
        const check = removeCartLineAndExpectPersisted(page, shirt, hat, options);
        if (message === null) {
          await check;
        } else {
          await expect(check).rejects.toThrow(message);
        }
      });
    }
  });
});

/**
 * Serves `bodies` as the cart page, one per request in order, so a reload can
 * show another cart. The last body repeats. Every other request is aborted.
 */
async function openCartFixture(page: Page, bodies: readonly string[]): Promise<void> {
  let requestCount = 0;
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.route("**/*", (route) => route.abort());
  await page.route(`${STOREFRONT_ORIGIN}/cart`, (route) => {
    const body = bodies[Math.min(requestCount, bodies.length - 1)];
    requestCount += 1;
    return route.fulfill({ body: `<!doctype html>${body}`, contentType: "text/html", status: 200 });
  });
  await page.goto(`${STOREFRONT_ORIGIN}/cart`);
}

/** A helper fixture line with a variant, a quantity input, and optional controls. */
function outcomeLineHtml(
  title: string,
  variant: string,
  quantity: number,
  increaseScript = "",
  removeScript = "",
): string {
  const increase =
    increaseScript === ""
      ? ""
      : `<button type="button" data-testid="cart-line-increase" aria-label="Mehr" onclick="${increaseScript}">+</button>`;
  const remove =
    removeScript === ""
      ? ""
      : `<button type="button" data-testid="cart-line-remove" aria-label="Entfernen" onclick="${removeScript}">×</button>`;
  return `<li data-testid="cart-line">
    <span>${title}</span> <span>${variant}</span>
    <input type="number" data-testid="cart-line-quantity" aria-label="Menge" value="${quantity}">
    ${increase}${remove}
  </li>`;
}

/**
 * Inline click handler that shows quantity 2 at once while the status is
 * updating, then settles the status as updated with `finalQuantity`.
 */
function settlingIncreaseScript(finalQuantity: number): string {
  return `const input = this.closest('[data-testid=cart-line]').querySelector('[data-testid=cart-line-quantity]'); const status = document.getElementById('status'); input.value = '2'; status.dataset.cartState = 'updating'; setTimeout(() => { input.value = '${finalQuantity}'; status.dataset.cartState = 'updated'; }, 100);`;
}

/** A cart status region for helper fixtures. The text is arbitrary on purpose. */
function cartStatusHtml(state: string, text: string, attributes = ""): string {
  return `<span role="status" data-testid="cart-status" data-cart-state="${state}" ${attributes}>${text}</span>`;
}

async function wasTriggerClicked(page: Page): Promise<boolean> {
  return page.evaluate(() => "triggerClicked" in window);
}
