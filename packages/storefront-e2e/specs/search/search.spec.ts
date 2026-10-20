import type { Locator, Page } from "@playwright/test";

import { EXPECT_TIMEOUT_MS } from "../../src/timeouts";
import { expect, test } from "./config";

const MAX_LINK_DISCOVERY_PROBES = 40;
const MAX_SEARCH_PRODUCT_PROBES = 8;

test("search returns matching products", async ({ data, page }) => {
  const products = data.products.slice(0, MAX_SEARCH_PRODUCT_PROBES);

  for (const product of products) {
    const result = await searchForMatchingProduct(
      page,
      data.paths.search,
      data.paths.product,
      product.title,
    );
    if (result) return;
  }

  throw new Error("No discovered product title returned matching search results");
});

async function searchForMatchingProduct(
  page: Page,
  searchPath: string,
  productPathSegment: string,
  productTitle: string,
): Promise<boolean> {
  await page.goto(searchPath);
  const searchbox = page.getByRole("searchbox").first();
  await searchbox.fill(productTitle);
  await submitSearch(searchbox);

  return hasMatchingProductResult(page, productPathSegment, productTitle);
}

async function submitSearch(searchbox: Locator): Promise<void> {
  const form = searchbox.locator("xpath=ancestor::form[1]");
  const searchButton = form.getByRole("button", { name: /search/i }).first();
  if (await searchButton.isVisible().catch(() => false)) {
    await searchButton.click();
    return;
  }

  await searchbox.press("Enter");
}

async function matchingProductLinkCount(
  page: Page,
  productPathSegment: string,
  productTitle: string,
): Promise<number> {
  const productTitleMatcher = new RegExp(escapeRegExp(productTitle), "i");
  const productLinks = page.getByRole("link", { name: productTitleMatcher });
  const count = Math.min(await productLinks.count(), MAX_LINK_DISCOVERY_PROBES);
  let matchingLinkCount = 0;

  for (let index = 0; index < count; index += 1) {
    const link = productLinks.nth(index);
    if (!(await link.isVisible())) continue;

    const href = await link.getAttribute("href");
    if (!isProductHref(href, page.url(), productPathSegment)) continue;

    matchingLinkCount += 1;
  }

  return matchingLinkCount;
}

async function hasMatchingProductResult(
  page: Page,
  productPathSegment: string,
  productTitle: string,
): Promise<boolean> {
  return expect
    .poll(() => matchingProductLinkCount(page, productPathSegment, productTitle), {
      timeout: EXPECT_TIMEOUT_MS,
    })
    .toBeGreaterThan(0)
    .then(
      () => true,
      () => false,
    );
}

function isProductHref(href: string | null, currentUrl: string, pathSegment: string): boolean {
  if (href === null) return false;

  return new URL(href, currentUrl).pathname.includes(pathSegment);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
