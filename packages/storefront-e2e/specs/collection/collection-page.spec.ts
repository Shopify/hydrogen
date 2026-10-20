import type { Page } from "@playwright/test";

import {
  findProductCardLink,
  productResults,
  type ExpectedProduct,
} from "../../src/product-results";
import { expect, test } from "./config";

const PRODUCT_PATH_SEGMENT = "/products/";

test("collection page shows products", async ({ data, page }) => {
  const firstCollection = data.collections[0];
  if (firstCollection === undefined) throw new Error("No collection with products found");

  const firstProduct = firstCollection.products.nodes[0];
  if (firstProduct === undefined) throw new Error("No collection product found");

  await page.goto(data.paths.collection(firstCollection.handle));

  const card = await findProductCardLink(productResults(page), PRODUCT_PATH_SEGMENT, firstProduct);
  expect(
    card,
    `Expected a visible product card for ${firstProduct.handle} in product-results.`,
  ).not.toBeNull();
});

test.describe("product results helpers", () => {
  const product: ExpectedProduct = { handle: "shirt", title: "Shirt" };
  const options = { timeout: 200 };

  test("finds the card for the product handle inside the results", async ({ page }) => {
    // Decoys come first: an unmarked link, a recommendation card outside the
    // results, and a card for another product whose title contains "Shirt".
    // The real link has a localized prefix.
    await openFixture(
      page,
      `<a href="/products/shirt">Shirt</a>
      <aside>${productCardHtml("/products/shirt", "Shirt recommendation")}</aside>
      <div data-testid="product-results"><ul>
        <li>${productCardHtml("/products/t-shirt", "T-Shirt")}</li>
        <li>${productCardHtml("/fr/products/shirt", "SHIRT (sale)")}</li>
      </ul></div>`,
    );

    const card = await findProductCardLink(
      productResults(page),
      PRODUCT_PATH_SEGMENT,
      product,
      options,
    );

    if (card === null) throw new Error("Expected a product card for the shirt handle");
    await expect(card).toHaveText("SHIRT (sale)");
  });

  test("skips hidden copies, including a hidden match before the visible match", async ({
    page,
  }) => {
    await openFixture(
      page,
      `<div data-testid="product-results"><ul>
        <li><a data-testid="product-card" href="/products/shirt" style="visibility:hidden">Shirt hidden by CSS</a></li>
        <li><a data-testid="product-card" href="/products/shirt" hidden>Shirt hidden</a></li>
        <li style="display:none">${productCardHtml("/products/shirt", "Shirt collapsed")}</li>
        <li>${productCardHtml("/products/shirt", "Shirt visible")}</li>
      </ul></div>`,
    );

    const card = await findProductCardLink(
      productResults(page),
      PRODUCT_PATH_SEGMENT,
      product,
      options,
    );

    if (card === null) throw new Error("Expected a product card for the shirt handle");
    await expect(card).toHaveText("Shirt visible");
  });

  test("returns null for another product, even when its title contains the title", async ({
    page,
  }) => {
    await openFixture(
      page,
      `<div data-testid="product-results">
        ${productCardHtml("/products/t-shirt", "T-Shirt")}
        ${productCardHtml("/products/shirt-2", "Shirt")}
      </div>`,
    );

    await expect(
      findProductCardLink(productResults(page), PRODUCT_PATH_SEGMENT, product, options),
    ).resolves.toBeNull();
  });

  test("requires the product title in the matched card's accessible name", async ({ page }) => {
    await openFixture(
      page,
      `<div data-testid="product-results">
        <a data-testid="product-card" href="/products/shirt" aria-label="View product">Shirt</a>
      </div>`,
    );

    await expect(
      findProductCardLink(productResults(page), PRODUCT_PATH_SEGMENT, product, options),
    ).rejects.toThrow();
  });

  test("fails when the matched card renders again with another product", async ({ page }) => {
    // After the suite reads the paths, the results render again in a new order.
    // The card at the read index then links to "T-Shirt", whose name still contains "Shirt".
    await openFixture(
      page,
      `<div data-testid="product-results"><ul>
        <li>${productCardHtml("/products/shirt", "Shirt")}</li>
        <li>${productCardHtml("/products/t-shirt", "T-Shirt")}</li>
      </ul></div>
      <script>
        const pathname = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, "pathname");
        let reordered = false;
        Object.defineProperty(HTMLAnchorElement.prototype, "pathname", {
          configurable: true,
          get() {
            const value = pathname.get.call(this);
            if (!reordered && value === "/products/shirt") {
              reordered = true;
              setTimeout(() => {
                const list = document.querySelector("ul");
                list.prepend(list.lastElementChild);
              });
            }
            return value;
          },
        });
      </script>`,
    );

    await expect(
      findProductCardLink(productResults(page), PRODUCT_PATH_SEGMENT, product, options),
    ).rejects.toThrow();
  });
});

/** Fake storefront origin for helper fixtures. No request leaves the browser. */
const STOREFRONT_ORIGIN = "https://storefront.test";

/** Serves `body` as a collection page so relative product links have an HTTP base. */
async function openFixture(page: Page, body: string): Promise<void> {
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.route("**/*", (route) => route.abort());
  await page.route(`${STOREFRONT_ORIGIN}/collections/all`, (route) =>
    route.fulfill({ body: `<!doctype html>${body}`, contentType: "text/html", status: 200 }),
  );
  await page.goto(`${STOREFRONT_ORIGIN}/collections/all`);
}

/** A product card link for helper fixtures. Decoy links have no test ID. */
function productCardHtml(href: string, name = "Shirt"): string {
  return `<a data-testid="product-card" href="${href}">${name}</a>`;
}
