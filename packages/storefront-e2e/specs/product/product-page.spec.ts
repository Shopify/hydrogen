import { StorefrontContractError } from "../../src/contract";
import { expectProductTitle, requireProductAddToCart } from "../../src/product-targets";
import { expect, test } from "./config";

test("product page loads", async ({ data, page }) => {
  const firstProduct = data.products[0];
  if (firstProduct === undefined) throw new Error("No product found");

  const path = data.paths.product(firstProduct.handle);
  await page.goto(path);

  await expectProductTitle(page, firstProduct.title, path);
});

test.describe("product target helpers", () => {
  const routePath = "/products/shirt";
  const timeout = 200;

  test("expects one product title h1 that contains the product title", async ({ page }) => {
    await page.setContent(`
      <a href="/products/shirt">Shirt</a>
      <h1 data-testid="product-title">Shirt</h1>`);
    await expectProductTitle(page, "Shirt", routePath, { timeout });

    // Same as the previous heading role name match: case-insensitive substring.
    await page.setContent(`<h1 data-testid="product-title">SHIRT (sale)</h1>`);
    await expectProductTitle(page, "Shirt", routePath, { timeout });

    await page.setContent(`<h1 data-testid="product-title">Hat</h1>`);
    const error = await rejection(expectProductTitle(page, "Shirt", routePath, { timeout }));
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(StorefrontContractError);
  });

  test("fails clearly when the product title is not a native h1", async ({ page }) => {
    await page.setContent(`<div data-testid="product-title"><h1>Shirt</h1></div>`);
    await expectContractError(
      expectProductTitle(page, "Shirt", routePath, { timeout }),
      /native <h1> product heading\. Found <div>\./,
    );

    await page.setContent(
      `<div data-testid="product-title" role="heading" aria-level="1">Shirt</div>`,
    );
    await expectContractError(
      expectProductTitle(page, "Shirt", routePath, { timeout }),
      /native <h1> product heading\. Found <div>\./,
    );
  });

  test("fails clearly when the product title h1 is not a visible level-one heading", async ({
    page,
  }) => {
    const cases = [
      `<h1 data-testid="product-title" aria-hidden="true">Shirt</h1>`,
      `<h1 data-testid="product-title" role="presentation">Shirt</h1>`,
      `<h1 data-testid="product-title" hidden>Shirt</h1>`,
    ];

    for (const html of cases) {
      await test.step(html, async () => {
        await page.setContent(html);
        await expectContractError(
          expectProductTitle(page, "Shirt", routePath, { timeout }),
          /is a visible level-one heading\./,
        );
      });
    }
  });

  test("fails clearly for a missing or duplicate product title", async ({ page }) => {
    await page.setContent(`<h1>Shirt</h1>`);
    await expectContractError(
      expectProductTitle(page, "Shirt", routePath, { timeout }),
      /exactly one element with data-testid="product-title".*Found 0\./,
    );

    await page.setContent(`
      <h1 data-testid="product-title">Shirt</h1>
      <h2 data-testid="product-title">Shirt</h2>`);
    await expectContractError(
      expectProductTitle(page, "Shirt", routePath, { timeout }),
      /exactly one element with data-testid="product-title".*Found 2\./,
    );
  });

  test("returns the single add to cart button and ignores decoy buttons", async ({ page }) => {
    await page.setContent(`
      <button>Add to cart</button>
      <button data-testid="product-add-to-cart" disabled>Sold out</button>`);

    const addToCart = await requireProductAddToCart(page, routePath, { timeout });

    await expect(addToCart).toHaveText("Sold out");
    await expect(addToCart).toBeDisabled();
  });

  test("accepts a native button with any name and aria-disabled", async ({ page }) => {
    await page.setContent(
      `<button data-testid="product-add-to-cart" aria-disabled="true">In den Warenkorb</button>`,
    );

    const addToCart = await requireProductAddToCart(page, routePath, { timeout });

    await expect(addToCart).toHaveAccessibleName("In den Warenkorb");
    expect(await addToCart.isEnabled()).toBe(false);
  });

  test("fails clearly for a missing, duplicate, or non-button add to cart", async ({ page }) => {
    await page.setContent(`<button>Add to cart</button>`);
    await expectContractError(
      requireProductAddToCart(page, routePath, { timeout }),
      /data-testid="product-add-to-cart".*Found 0\./,
    );

    await page.setContent(`
      <button data-testid="product-add-to-cart">Add to cart</button>
      <button data-testid="product-add-to-cart">Add to cart</button>`);
    await expectContractError(
      requireProductAddToCart(page, routePath, { timeout }),
      /data-testid="product-add-to-cart".*Found 2\./,
    );

    await page.setContent(
      `<div data-testid="product-add-to-cart"><button>Add to cart</button></div>`,
    );
    await expectContractError(
      requireProductAddToCart(page, routePath, { timeout }),
      /native <button> add to cart button\. Found <div>\./,
    );

    await page.setContent(
      `<div data-testid="product-add-to-cart" role="button" tabindex="0">Add to cart</div>`,
    );
    await expectContractError(
      requireProductAddToCart(page, routePath, { timeout }),
      /native <button> add to cart button\. Found <div>\./,
    );
  });
});

async function expectContractError(promise: Promise<unknown>, message: RegExp): Promise<void> {
  const error = await rejection(promise);
  expect(error).toBeInstanceOf(StorefrontContractError);
  expect(String(error)).toMatch(message);
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
