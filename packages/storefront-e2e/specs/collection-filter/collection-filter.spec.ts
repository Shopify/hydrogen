import type { Locator, Page } from "@playwright/test";

import { productResults, uniqueProductCardPaths } from "../../src/product-results";
import { expect, test } from "./config";

const MAX_FILTER_CONTROL_PROBES = 20;

type FilterCandidate = {
  readonly control: Locator;
  readonly expectedResultCount: number | null;
  readonly label: string;
  /** The visible label of the filter value. The suite clicks it to select the filter. */
  readonly labelElement: Locator;
};

type FilterOptions = {
  /** How long to wait for each step. Defaults to the expect timeout. */
  readonly timeout?: number;
};

test("collection filter narrows products", async ({ data, page }) => {
  const firstCollection = data.collections[0];
  if (firstCollection === undefined) throw new Error("No filterable collection found");

  await page.goto(data.paths.collection(firstCollection.handle));

  const filter = await expectFilterNarrowsProducts(page, data.paths.product);
  test.skip(filter === null, "No visible collection filter narrows the initial product results");
});

/**
 * Selects a counted filter by its label, checks that the results narrow, then
 * goes back and checks that the same filter is unchecked. Returns null when no
 * visible filter label has a count that narrows the results.
 */
async function expectFilterNarrowsProducts(
  page: Page,
  productPathSegment: string,
  { timeout }: FilterOptions = {},
): Promise<FilterCandidate | null> {
  const initialResultCount = await waitForProductCardCount(page, productPathSegment, timeout);
  const filter = await findUsableFilter(page, initialResultCount, { timeout });
  if (filter === null) return null;

  const beforeUrl = page.url();
  await filter.labelElement.click({ timeout });
  await expect(filter.control).toBeChecked({ timeout });

  await applyFiltersIfNeeded(page);
  await expect(page).not.toHaveURL(beforeUrl, { timeout });
  await expect
    .poll(
      async () => {
        const resultCount = await productCardCount(page, productPathSegment);
        return resultCount > 0 && resultCount < initialResultCount;
      },
      { timeout },
    )
    .toBe(true);

  const resultCount = await productCardCount(page, productPathSegment);
  expect(resultCount).toBeGreaterThan(0);
  if (filter.expectedResultCount !== null) {
    expect(resultCount).toBeLessThanOrEqual(filter.expectedResultCount);
  }

  await page.goBack();
  await expect(page).toHaveURL(beforeUrl, { timeout });
  // Confirm the positional locator still points at the same filter before checking its state.
  await expect
    .poll(async () => normalizeLabel(await filter.labelElement.textContent({ timeout })), {
      timeout,
    })
    .toBe(filter.label);
  await expect(filter.control).not.toBeChecked({ timeout });

  return filter;
}

test.describe("collection filter helpers", () => {
  // Generous for the async journey; no step waits for a fixed time.
  const options: FilterOptions = { timeout: 5_000 };

  test("clicks the visible counted label, checks its native checkbox, and recovers on Back", async ({
    page,
  }) => {
    await openFilterJourneyFixture(page);

    const filter = await expectFilterNarrowsProducts(page, "/products/", options);

    // The closed drawer copy comes first. Selecting it would fail the label click.
    expect(filter?.label).toBe("Red (2)");
  });

  test("chooses the first visible label with a usable count", async ({ page }) => {
    // A closed drawer copy, a label without a count, a disabled value, and a
    // count that does not narrow come first.
    await openFixture(
      page,
      `<dialog>${filterLabelHtml("red", "Red (2)")}</dialog>
      ${filterLabelHtml("blue", "Blue")}
      <label data-testid="collection-filter-label"><input data-testid="collection-filter-value" type="checkbox" disabled> Green (1)</label>
      ${filterLabelHtml("black", "Black (9)")}
      ${filterLabelHtml("red", "Red (2) - Sold out")}`,
    );

    const filter = await findUsableFilter(page, 4, options);
    if (filter === null) throw new Error("Expected a usable filter");

    expect(filter.label).toBe("Red (2)");
    expect(filter.expectedResultCount).toBe(2);
    await filter.labelElement.click();
    await expect(filter.control).toBeChecked();
  });

  test("returns null when no visible label has a usable count", async ({ page }) => {
    await openFixture(
      page,
      `${filterLabelHtml("red", "Red")}${filterLabelHtml("blue", "Blue (4)")}${filterLabelHtml("black", "Black (0)")}`,
    );

    await expect(findUsableFilter(page, 4, options)).resolves.toBeNull();
  });

  test("fails instead of skipping when no visible filter label exists", async ({ page }) => {
    await openFixture(page, `<label><input type="checkbox" name="filter.v.color"> Red (2)</label>`);

    await expect(findUsableFilter(page, 4, { timeout: 200 })).rejects.toThrow();
  });
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

/**
 * Returns the first of up to 20 visible filter labels whose count is above zero
 * and below the initial result count. A missing label or checkbox fails as a
 * normal Playwright wait; it is not a skip.
 */
async function findUsableFilter(
  page: Page,
  initialResultCount: number,
  { timeout }: FilterOptions = {},
): Promise<FilterCandidate | null> {
  const labels = page.getByTestId("collection-filter-label").filter({ visible: true });
  await expect(labels.first()).toBeVisible({ timeout });
  const count = Math.min(await labels.count(), MAX_FILTER_CONTROL_PROBES);

  for (let index = 0; index < count; index += 1) {
    const labelElement = labels.nth(index);
    const control = labelElement.getByTestId("collection-filter-value").first();
    if (!(await control.isEnabled({ timeout }))) continue;

    // The count is read from the label text for now.
    const label = normalizeLabel(await labelElement.textContent());
    const expectedResultCount = parseFilterCount(label);

    if (expectedResultCount === null) continue;
    if (expectedResultCount > 0 && expectedResultCount < initialResultCount) {
      return { control, expectedResultCount, label, labelElement };
    }
  }

  return null;
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

/** A filter value label for helper fixtures. */
function filterLabelHtml(value: string, text: string, checked = false): string {
  return `<label data-testid="collection-filter-label"><input data-testid="collection-filter-value" type="checkbox" name="filter.v.color" value="${value}" autocomplete="off" onchange="this.form?.requestSubmit()" ${checked ? "checked" : ""}> ${text}</label>`;
}

/**
 * Serves a collection page whose GET filter form applies on change. Red narrows
 * the results from four products to two. A closed drawer has a copy of the filters.
 */
async function openFilterJourneyFixture(page: Page): Promise<void> {
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.route("**/*", (route) => route.abort());
  await page.route(
    (url) => url.origin === STOREFRONT_ORIGIN && url.pathname === "/collections/all",
    (route) => {
      const isRed = new URL(route.request().url()).searchParams.get("filter.v.color") === "red";
      const products = isRed ? ["shirt", "hat"] : ["shirt", "hat", "sock", "scarf"];
      const filters = `${filterLabelHtml("blue", "Blue (4) - Sold out")}${filterLabelHtml("red", "Red (2)", isRed)}`;
      const body = `<!doctype html>
        <dialog><form method="get" action="/collections/all">${filters}</form></dialog>
        <form method="get" action="/collections/all">${filters}</form>
        <div data-testid="product-results">${products.map((handle) => productCardHtml(`/products/${handle}`)).join("")}</div>`;
      return route.fulfill({ body, contentType: "text/html", status: 200 });
    },
  );
  await page.goto(`${STOREFRONT_ORIGIN}/collections/all`);
}
