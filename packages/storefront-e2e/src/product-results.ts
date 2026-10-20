import { expect, type Locator, type Page } from "@playwright/test";

export type ExpectedProduct = {
  readonly handle: string;
  readonly title: string;
};

/** The first visible product results root of a collection or search page. */
export function productResults(page: Page): Locator {
  return page.getByTestId("product-results").filter({ visible: true }).first();
}

/** Unique URL paths of the visible product cards in `results` that link to a product page. */
export async function uniqueProductCardPaths(
  results: Locator,
  productPathSegment: string,
): Promise<Set<string>> {
  const pathnames = await cardPathnames(results);
  return new Set(pathnames.filter((pathname) => pathname.includes(productPathSegment)));
}

/**
 * Returns the visible product card for `product` in `results`, or null when no
 * card links to it within `timeout`. The card path must end with
 * `<productPathSegment><handle>` (a prefix, such as a locale, is allowed), so a
 * card for another product does not match even when its title contains the
 * product title. The card's accessible name must contain the product title.
 */
export async function findProductCardLink(
  results: Locator,
  productPathSegment: string,
  product: ExpectedProduct,
  { timeout }: { readonly timeout?: number } = {},
): Promise<Locator | null> {
  const productPath = `${productPathSegment}${product.handle}`;
  let pathnames: string[] = [];
  const isFound = await expect
    .poll(
      async () => {
        pathnames = await cardPathnames(results);
        return pathnames.some((pathname) => pathname.endsWith(productPath));
      },
      { timeout },
    )
    .toBe(true)
    .then(
      () => true,
      () => false,
    );
  if (!isFound) return null;

  const index = pathnames.findIndex((pathname) => pathname.endsWith(productPath));
  const card = productCards(results).nth(index);
  // The results can render again after the read. The same card must still link to the product.
  await expect(card).toHaveJSProperty("pathname", pathnames[index], { timeout });
  await expect(card).toHaveAccessibleName(new RegExp(escapeRegExp(product.title), "i"), {
    timeout,
  });
  return card;
}

/**
 * The visible product cards inside `results`. Cards outside the results, such
 * as recommendations, and hidden responsive copies do not count.
 */
function productCards(results: Locator): Locator {
  return results.getByTestId("product-card").filter({ visible: true });
}

async function cardPathnames(results: Locator): Promise<string[]> {
  return productCards(results).evaluateAll((cards) =>
    cards.map((card) => (card instanceof HTMLAnchorElement ? card.pathname : "")),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
