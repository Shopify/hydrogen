import type { SelectedOption } from "@shopify/hydrogen";
import { z } from "zod";

import { type StorefrontApi, type StorefrontContext } from "./storefront.ts";

const PRODUCTS_PER_PAGE = 50;

export type PinnedVariant = {
  variantId: string;
  variantTitle: string;
  productId: string;
  productTitle: string;
  productHandle: string;
  selectedOptions: SelectedOption[];
};

export type CatalogDiscovery =
  | { status: "found"; variant: PinnedVariant; pagesScanned: number }
  | { status: "skipped"; pagesScanned: number; reason: string };

const NOT_FOUND = "No eligible variant was found.";

const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  endCursor: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
});
const productPageSchema = z
  .object({
    products: z.object({
      pageInfo: pageInfoSchema,
      nodes: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          handle: z.string(),
          requiresSellingPlan: z.boolean(),
          // The field is nullable in the schema: it must be present, but it can be null.
          selectedOrFirstAvailableVariant: z
            .object({
              id: z.string(),
              title: z.string(),
              availableForSale: z.boolean(),
              selectedOptions: z.array(z.object({ name: z.string(), value: z.string() })),
            })
            .nullable(),
        }),
      ),
    }),
  })
  .transform(({ products }) => ({ ...products.pageInfo, products: products.nodes }));
type ProductPage = z.infer<typeof productPageSchema>;

/**
 * Finds the first product (in stable product ID order) that does not require a
 * selling plan and whose `selectedOrFirstAvailableVariant` is available for
 * sale, in the given context. Without selected options, the Storefront API
 * returns the product's first available variant, or its first variant when none
 * is available. Every page query declares `$country` and `$language` with an
 * explicit `@inContext`; the Storefront API client fills both from the context.
 * The search is bounded by product pages. When no match is found, the result is
 * `skipped`: the catalog was searched to the end, pagination returned no cursor,
 * or the page cap was reached with more pages remaining. Only the page cap
 * reason suggests a higher `--catalog-pages`. API and response-shape errors throw.
 */
export async function discoverPinnedVariant(
  api: StorefrontApi,
  options: { maxPages: number; context: StorefrontContext; signal: AbortSignal },
): Promise<CatalogDiscovery> {
  const document = `query AgenticE2ECatalog($first: Int!, $after: String, $country: CountryCode!, $language: LanguageCode!) @inContext(country: $country, language: $language) {
  products(first: $first, after: $after, sortKey: ID, query: "available_for_sale:true") {
    pageInfo { hasNextPage endCursor }
    nodes {
      id title handle requiresSellingPlan
      selectedOrFirstAvailableVariant { id title availableForSale selectedOptions { name value } }
    }
  }
}`;

  let after: string | undefined;
  for (let page = 1; page <= options.maxPages; page++) {
    const result = await api.query(
      document,
      { first: PRODUCTS_PER_PAGE, after: after ?? null },
      (data) => productPageSchema.parse(data),
      options.signal,
      options.context,
    );

    const match = findEligible(result);
    if (match !== undefined) {
      return { status: "found", variant: match, pagesScanned: page };
    }
    if (!result.hasNextPage) {
      return { status: "skipped", pagesScanned: page, reason: NOT_FOUND };
    }
    if (result.endCursor === undefined) {
      return {
        status: "skipped",
        pagesScanned: page,
        reason: `${NOT_FOUND} Catalog pagination returned no cursor.`,
      };
    }
    after = result.endCursor;
  }

  return {
    status: "skipped",
    pagesScanned: options.maxPages,
    reason: `${NOT_FOUND} Try increasing --catalog-pages.`,
  };
}

function findEligible(page: ProductPage): PinnedVariant | undefined {
  for (const product of page.products) {
    if (product.requiresSellingPlan) {
      continue;
    }
    const variant = product.selectedOrFirstAvailableVariant;
    if (variant?.availableForSale === true) {
      return {
        variantId: variant.id,
        variantTitle: variant.title,
        productId: product.id,
        productTitle: product.title,
        productHandle: product.handle,
        selectedOptions: variant.selectedOptions,
      };
    }
  }
  return undefined;
}
