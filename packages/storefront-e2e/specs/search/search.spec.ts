import type { Locator, Page } from "@playwright/test";

import {
  findProductCardLink,
  productResults,
  type ExpectedProduct,
} from "../../src/product-results";
import { expect, test } from "./config";

const MAX_SEARCH_PRODUCT_PROBES = 8;
/** Fake storefront origin for helper fixtures. No request leaves the browser. */
const STOREFRONT_ORIGIN = "https://storefront.test";

type SearchPaths = {
  readonly product: string;
  readonly search: string;
};

type SearchOptions = {
  /** How long to wait for the URL change and the product card. */
  readonly timeout?: number;
};

test("search returns matching products", async ({ data, page }) => {
  const match = await findSearchMatch(page, data.paths, data.products);
  if (match === null) {
    throw new Error("No discovered product title returned matching search results");
  }
});

/**
 * Searches for up to eight discovered products by title, and returns the first
 * one whose own product card shows in the results. A search with no or other
 * results tries the next product.
 */
async function findSearchMatch(
  page: Page,
  paths: SearchPaths,
  products: readonly ExpectedProduct[],
  options: SearchOptions = {},
): Promise<ExpectedProduct | null> {
  for (const product of products.slice(0, MAX_SEARCH_PRODUCT_PROBES)) {
    if (await searchForMatchingProduct(page, paths, product, options)) return product;
  }

  return null;
}

async function searchForMatchingProduct(
  page: Page,
  paths: SearchPaths,
  product: ExpectedProduct,
  options: SearchOptions,
): Promise<boolean> {
  await page.goto(paths.search);
  const beforeUrl = page.url();
  const searchInput = page.getByTestId("search-input").filter({ visible: true }).first();
  await searchInput.fill(product.title);
  await submitSearch(page, searchInput);

  // A search that does not navigate cannot prove that the query rendered the results.
  await expect(page, "Expected the search submit to change the URL.").not.toHaveURL(beforeUrl, {
    timeout: options.timeout,
  });
  const card = await findProductCardLink(productResults(page), paths.product, product, options);
  return card !== null;
}

/** Clicks the first visible search submit control, or presses Enter when there is none. */
async function submitSearch(page: Page, searchInput: Locator): Promise<void> {
  const submit = page.getByTestId("search-submit").filter({ visible: true }).first();
  if ((await submit.count()) > 0) {
    await submit.click();
    return;
  }

  await searchInput.press("Enter");
}

test.describe("search result helpers", () => {
  const paths: SearchPaths = { product: "/products/", search: `${STOREFRONT_ORIGIN}/search` };
  const options: SearchOptions = { timeout: 200 };
  const shirt: ExpectedProduct = { handle: "shirt", title: "Shirt" };

  test("matches the product handle inside the results, not a similar title or a recommendation", async ({
    page,
  }) => {
    const { queries } = await openSearchFixture(page, (query) =>
      query === "Shirt"
        ? `<aside><h2>Recommended</h2>${productCardHtml("/products/shirt", "Shirt")}</aside>
          <div data-testid="product-results">
            <a href="/products/shirt">Shirt</a>
            ${productCardHtml("/products/t-shirt", "T-Shirt")}
            ${productCardHtml("/products/shirt-2", "Shirt")}
          </div>`
        : `<div data-testid="product-results">${productCardHtml("/products/shirt", "Shirt")}</div>`,
    );

    await expect(findSearchMatch(page, paths, [shirt], options)).resolves.toBeNull();
    expect(queries).toEqual(["Shirt"]);

    // The real card matches by handle, and its name contains the title in any case.
    const upperCaseShirt: ExpectedProduct = { handle: "shirt", title: "SHIRT" };
    await expect(findSearchMatch(page, paths, [upperCaseShirt], options)).resolves.toBe(
      upperCaseShirt,
    );
  });

  test("tries the next product after empty or other results, up to eight products", async ({
    page,
  }) => {
    const products = Array.from({ length: 9 }, (_, index) => ({
      handle: `product-${index}`,
      title: `Product ${index}`,
    }));
    const hits = new Set(["Product 2"]);
    const { queries } = await openSearchFixture(page, (query) =>
      hits.has(query)
        ? `<div data-testid="product-results">${productCardHtml(`/products/product-2`, "Product 2")}</div>`
        : query === "Product 0"
          ? `<div data-testid="product-results"><p>No results</p></div>`
          : `<div data-testid="product-results">${productCardHtml("/products/other", "Other")}</div>`,
    );

    await expect(findSearchMatch(page, paths, products, options)).resolves.toBe(products[2]);
    expect(queries).toEqual(["Product 0", "Product 1", "Product 2"]);

    // Only the ninth product matches, so the bounded search finds nothing.
    hits.clear();
    hits.add("Product 8");
    queries.length = 0;
    await expect(findSearchMatch(page, paths, products, options)).resolves.toBeNull();
    expect(queries).toHaveLength(8);
  });

  test("fails instead of trying the next product when the matched card lacks the title", async ({
    page,
  }) => {
    const { queries } = await openSearchFixture(
      page,
      () =>
        `<div data-testid="product-results"><a data-testid="product-card" href="/products/shirt" aria-label="View">Shirt</a></div>`,
    );

    await expect(findSearchMatch(page, paths, [shirt, shirt], options)).rejects.toThrow();
    expect(queries).toHaveLength(1);
  });

  test("fails when the submit does not change the URL, even with the card on the page", async ({
    page,
  }) => {
    // The page already shows the expected card, and the submit does nothing.
    const shirtResults = `<div data-testid="product-results">${productCardHtml("/products/shirt", "Shirt")}</div>`;
    const { queries } = await openSearchFixture(
      page,
      () => shirtResults,
      NO_OP_SEARCH_FORM,
      shirtResults,
    );

    await expect(findSearchMatch(page, paths, [shirt], options)).rejects.toThrow(
      /Expected the search submit to change the URL/,
    );
    expect(queries).toEqual([]);
  });
});

test.describe("search input and submit helpers", () => {
  const paths: SearchPaths = { product: "/products/", search: `${STOREFRONT_ORIGIN}/search` };
  const options: SearchOptions = { timeout: 200 };
  const shirt: ExpectedProduct = { handle: "shirt", title: "Shirt" };
  const shirtResults = () =>
    `<div data-testid="product-results">${productCardHtml("/products/shirt", "Shirt")}</div>`;

  test("clicks the marked localized submit control, not the default unmarked button", async ({
    page,
  }) => {
    // Enter would use the first submit button, which sends via=enter.
    const fixture = await openSearchFixture(
      page,
      shirtResults,
      `<form action="/search" method="get">
        <input data-testid="search-input" type="search" name="q" aria-label="Suche">
        <button type="submit" name="via" value="enter">Search</button>
        <button data-testid="search-submit" type="submit" name="via" value="button">Suchen</button>
      </form>`,
    );

    await expect(findSearchMatch(page, paths, [shirt], options)).resolves.toBe(shirt);
    expect(fixture.queries).toEqual(["Shirt"]);
    expect(fixture.submitters).toEqual(["button"]);
  });

  test("presses Enter in the marked input when there is no marked submit control", async ({
    page,
  }) => {
    // An unmarked English button outside the form would search for "decoy".
    const fixture = await openSearchFixture(
      page,
      shirtResults,
      `<button type="button" onclick="location.href = '/search?q=decoy'">Search</button>
      <form action="/search" method="get">
        <input data-testid="search-input" type="search" name="q" aria-label="Suche">
      </form>`,
    );

    await expect(findSearchMatch(page, paths, [shirt], options)).resolves.toBe(shirt);
    expect(fixture.queries).toEqual(["Shirt"]);
    expect(fixture.submitters).toEqual([null]);
  });
});

/** An unmarked header search form. Clicking or using it fails the fixture journey. */
const HEADER_SEARCH_DECOY = `<header><form action="/decoy" method="get" role="search">
  <input type="search" name="q" aria-label="Search"><button type="submit">Search</button>
</form></header>`;

/** The search page form: a marked query input and a marked localized submit control. */
const SEARCH_FORM = `<form action="/search" method="get" role="search">
  <input data-testid="search-input" type="search" name="q" aria-label="Suche">
  <button data-testid="search-submit" type="submit" name="via" value="button">Suchen</button>
</form>`;

/** A search form whose submit does nothing. */
const NO_OP_SEARCH_FORM = `<form action="/search" method="get" onsubmit="event.preventDefault()">
  <input data-testid="search-input" type="search" name="q" aria-label="Suche">
</form>`;

type SearchFixture = {
  /** The `q` value of each search request, in order. */
  readonly queries: string[];
  /** The `via` value of each search request: the name of the submitter, if any. */
  readonly submitters: (string | null)[];
};

/**
 * Serves a search page with `searchForm`. Before a query, the page renders
 * `beforeQuery`. After a query, `results` renders the results for it.
 */
async function openSearchFixture(
  page: Page,
  results: (query: string) => string,
  searchForm = SEARCH_FORM,
  beforeQuery = "",
): Promise<SearchFixture> {
  const fixture: SearchFixture = { queries: [], submitters: [] };
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.route("**/*", (route) => route.abort());
  await page.route(
    (url) => url.origin === STOREFRONT_ORIGIN && url.pathname === "/search",
    (route) => {
      const params = new URL(route.request().url()).searchParams;
      const query = params.get("q");
      if (query !== null) {
        fixture.queries.push(query);
        fixture.submitters.push(params.get("via"));
      }
      const body = `<!doctype html>${HEADER_SEARCH_DECOY}${searchForm}
        ${query === null ? beforeQuery : results(query)}`;
      return route.fulfill({ body, contentType: "text/html", status: 200 });
    },
  );
  await page.goto(`${STOREFRONT_ORIGIN}/search`);
  return fixture;
}

/** A product card link for helper fixtures. Decoy links have no test ID. */
function productCardHtml(href: string, name: string): string {
  return `<a data-testid="product-card" href="${href}">${name}</a>`;
}
