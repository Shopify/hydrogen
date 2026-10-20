import type { Locator, Page } from "@playwright/test";

import { productResults, uniqueProductCardPaths } from "../../src/product-results";
import { expect, test } from "./config";

const MAX_FILTER_CONTROL_PROBES = 20;

type FilterCandidate = {
  readonly control: Locator;
  readonly expectedResultCount: number | null;
  readonly label: string;
};

test("collection filter narrows products", async ({ data, page }) => {
  const firstCollection = data.collections[0];
  if (firstCollection === undefined) throw new Error("No filterable collection found");

  await page.goto(data.paths.collection(firstCollection.handle));

  const initialResultCount = await waitForProductCardCount(page, data.paths.product);
  const filter = await findUsableFilter(page, initialResultCount);
  test.skip(filter === null, "No visible collection filter narrows the initial product results");

  if (filter === null) throw new Error("No usable collection filter found");

  const beforeUrl = page.url();
  await selectFilter(filter);
  await expect(filter.control).toBeChecked();

  await applyFiltersIfNeeded(page);
  await expect(page).not.toHaveURL(beforeUrl);
  await expect
    .poll(async () => {
      const resultCount = await productCardCount(page, data.paths.product);
      return resultCount > 0 && resultCount < initialResultCount;
    })
    .toBe(true);

  const resultCount = await productCardCount(page, data.paths.product);
  if (filter.expectedResultCount !== null) {
    expect(resultCount).toBeLessThanOrEqual(filter.expectedResultCount);
  }

  await page.goBack();
  await expect(page).toHaveURL(beforeUrl);
  // Confirm the positional locator still points at the same filter before checking its state.
  await expect
    .poll(async () => normalizeLabel(await controlText(filter.control)))
    .toBe(filter.label);
  await expect(filter.control).not.toBeChecked();
});

test.describe("product result count helpers", () => {
  test("counts unique visible product card URLs inside the results only", async ({ page }) => {
    // Unmarked product links, recommendation cards outside the results, cards
    // for other pages, hidden copies, and repeated URLs do not add to the count.
    await openFixture(
      page,
      `<nav><a href="/products/nav">Nav</a></nav>
      <aside>${productCardHtml("/products/recommended")}</aside>
      <div data-testid="product-results"><ul>
        <li>${productCardHtml("/products/shirt")}<a href="/products/shirt-image">Image</a></li>
        <li>${productCardHtml("/products/shirt?variant=1")}</li>
        <li>${productCardHtml("/products/hat")}</li>
        <li>${productCardHtml("https://storefront.test/products/hat")}</li>
        <li>${productCardHtml("/collections/hats")}</li>
        <li>${productCardHtml("/products/hidden", "hidden")}</li>
        <li style="visibility:hidden">${productCardHtml("/products/responsive-copy")}</li>
        <li style="display:none">${productCardHtml("/products/collapsed")}</li>
      </ul></div>`,
    );

    await expect(productCardCount(page, "/products/")).resolves.toBe(2);
  });
});

/** Waits for at least one visible product card in the results, then returns the count. */
async function waitForProductCardCount(
  page: Page,
  productPathSegment: string,
  timeout?: number,
): Promise<number> {
  let count = 0;
  await expect
    .poll(async () => (count = await productCardCount(page, productPathSegment)), {
      message: "Expected visible product cards inside product-results.",
      timeout,
    })
    .toBeGreaterThan(0);
  return count;
}

/** Counts the unique product URL paths of the visible product cards in the results. */
async function productCardCount(page: Page, productPathSegment: string): Promise<number> {
  const paths = await uniqueProductCardPaths(productResults(page), productPathSegment);
  return paths.size;
}

async function applyFiltersIfNeeded(page: Page): Promise<void> {
  const applyFilters = page.getByRole("button", { name: /apply filters|show results/i }).first();
  if (await applyFilters.isVisible().catch(() => false)) await applyFilters.click();
}

async function selectFilter(filter: FilterCandidate): Promise<void> {
  const wrappingLabel = filter.control.locator("xpath=ancestor::label[1]");
  if (await wrappingLabel.isVisible().catch(() => false)) {
    await wrappingLabel.click();
    return;
  }

  await filter.control.check();
}

async function findUsableFilter(
  page: Page,
  initialResultCount: number,
): Promise<FilterCandidate | null> {
  const controls = page.getByRole("checkbox");
  const count = Math.min(await controls.count(), MAX_FILTER_CONTROL_PROBES);

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    const usable = (await control.isVisible()) && (await control.isEnabled());
    if (!usable) continue;

    const label = normalizeLabel(await controlText(control));
    const candidate = { control, expectedResultCount: parseFilterCount(label), label };

    if (candidate.expectedResultCount === null) continue;
    if (candidate.expectedResultCount > 0 && candidate.expectedResultCount < initialResultCount) {
      return candidate;
    }
  }

  return null;
}

async function controlText(control: Locator): Promise<string> {
  const ariaLabel = await control.getAttribute("aria-label");
  if (ariaLabel !== null && ariaLabel.trim() !== "") return ariaLabel;

  return control.evaluate((element) => {
    if (element instanceof HTMLInputElement)
      return element.labels?.[0]?.textContent ?? element.value;

    return element.textContent ?? "";
  });
}

function normalizeLabel(value: string | null): string {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/ - Sold out$/i, "")
    .trim();
}

function parseFilterCount(label: string): number | null {
  const match = label.match(/\((\d+)\)/);
  if (match === null) return null;

  const count = Number.parseInt(match[1], 10);
  return Number.isFinite(count) ? count : null;
}

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
function productCardHtml(href: string, attributes = ""): string {
  return `<a data-testid="product-card" href="${href}" ${attributes}>Product</a>`;
}
