import type { Page } from "@playwright/test";

import { setTestStore, test, expect } from "../../fixtures";
import { CartUtil } from "../../fixtures/cart-utils";
import { CURRENCY_FORMATS } from "../../fixtures/currency-formats";
import { KNOWN_PRODUCT } from "../../fixtures/known-products";

setTestStore("hydrogenPreviewStorefront");

// The example serves EN-US unprefixed, and EN-CA and FR-CA under a path prefix.
const LOCALE_PREFIX = "/fr-ca";

/**
 * Records cart and predictive search requests that left the locale path prefix. The request URL
 * is the contract here: the server resolves the market from it, so an unprefixed request reads
 * and writes the cart in the default market.
 */
function trackRequestsOutsideLocale(page: Page): string[] {
  const requests: string[] = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (/^\/api\/(cart|predictive-search)(\/|$)/.test(pathname)) requests.push(pathname);
  });
  return requests;
}

test.describe("Locale path prefix", () => {
  test("adds to a cart priced in the page's market", async ({ page }) => {
    const cart = new CartUtil(page);
    const requestsOutsideLocale = trackRequestsOutsideLocale(page);
    await page.goto(`${LOCALE_PREFIX}/products/${KNOWN_PRODUCT.handle}`);

    await cart.addItem(KNOWN_PRODUCT.name);

    await cart.assertSubtotalCurrencyFormat(CURRENCY_FORMATS.CAD);
    await page.goto(`${LOCALE_PREFIX}/cart`);
    await cart.assertSubtotalCurrencyFormat(CURRENCY_FORMATS.CAD);
    expect(requestsOutsideLocale).toEqual([]);
  });

  test("searches and links to results in the page's locale", async ({ page }) => {
    const requestsOutsideLocale = trackRequestsOutsideLocale(page);
    await page.goto(LOCALE_PREFIX);

    await page.getByRole("banner").getByRole("button", { name: "Search" }).click();
    const search = page.getByRole("dialog", { name: "SEARCH" });
    await search.getByRole("searchbox").fill(KNOWN_PRODUCT.name);

    const productResult = search.getByRole("link", { name: KNOWN_PRODUCT.name }).first();
    await expect(productResult).toHaveAttribute(
      "href",
      new RegExp(`^${LOCALE_PREFIX}/products/${KNOWN_PRODUCT.handle}`),
    );
    await expect(search.getByRole("search")).toHaveAttribute("action", `${LOCALE_PREFIX}/search`);
    expect(requestsOutsideLocale).toEqual([]);
  });

  test("points the product page's canonical link at the page's locale", async ({ page }) => {
    await page.goto(`${LOCALE_PREFIX}/products/${KNOWN_PRODUCT.handle}`);

    // Head metadata has no accessible role to select by.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${LOCALE_PREFIX}/products/${KNOWN_PRODUCT.handle}`,
    );
  });

  test("keeps a discount link in the page's locale", async ({ request }) => {
    const getRedirect = async (redirect: string) => {
      const response = await request.get(`${LOCALE_PREFIX}/discount/E2E-REDIRECT`, {
        params: { redirect },
        maxRedirects: 0,
      });
      return response.headers().location;
    };

    expect(await getRedirect("/collections")).toBe(`${LOCALE_PREFIX}/collections`);
    // A target that names a locale keeps it.
    expect(await getRedirect("/en-ca/collections")).toBe("/en-ca/collections");
  });

  test("keeps navigation in the page's locale", async ({ page }) => {
    await page.goto(LOCALE_PREFIX);

    // The store owns the menu, so check the shape of its links and not their names.
    const menuHrefs = await page
      .getByRole("banner")
      .getByRole("navigation")
      .first()
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
    for (const href of menuHrefs.filter((menuHref) => menuHref.startsWith("/"))) {
      expect(href).toMatch(new RegExp(`^${LOCALE_PREFIX}(/|$)`));
    }

    await page.getByRole("banner").getByRole("link", { name: /^Cart/ }).click();
    await page
      .getByRole("dialog", { name: "Cart" })
      .getByRole("link", { name: /Continue shopping/ })
      .click();

    await expect(page).toHaveURL(new RegExp(`${LOCALE_PREFIX}/collections$`));
    // The error page for an unknown route renders outside the main landmark.
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
  });
});
