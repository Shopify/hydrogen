import { z } from "zod";

import { publicStorefrontClient, readData, type StorefrontContext } from "./storefront.ts";

export const PRODUCTS_PER_PAGE = 50;
export const PAGE_LIMIT = 5;

export type PinnedVariant = {
  productHandle: string;
  productTitle: string;
  variantId: string;
  selectedOptions: Array<{ name: string; value: string }>;
};

export type CatalogPin =
  | { status: "found"; pinned: PinnedVariant }
  | { status: "skipped"; reason: string };

// The client fills `$country` and `$language` from the discovered context.
const CATALOG_QUERY = `query AgenticE2ECatalog($first: Int!, $after: String, $country: CountryCode!, $language: LanguageCode!) @inContext(country: $country, language: $language) {
  products(first: $first, after: $after, sortKey: ID, query: "available_for_sale:true") {
    pageInfo { hasNextPage endCursor }
    nodes {
      title handle requiresSellingPlan
      selectedOrFirstAvailableVariant { id availableForSale selectedOptions { name value } }
    }
  }
}`;

const catalogPageSchema = z.object({
  products: z.object({
    pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
    nodes: z.array(
      z.object({
        title: z.string(),
        handle: z.string(),
        requiresSellingPlan: z.boolean(),
        // Nullable in the schema: the field must be present, but it can be null.
        selectedOrFirstAvailableVariant: z
          .object({
            id: z.string(),
            availableForSale: z.boolean(),
            selectedOptions: z.array(z.object({ name: z.string(), value: z.string() })),
          })
          .nullable(),
      }),
    ),
  }),
});
type CatalogProduct = z.infer<typeof catalogPageSchema>["products"]["nodes"][number];

/**
 * Pins the `selectedOrFirstAvailableVariant` of the first product, in product ID order, that does
 * not require a selling plan and whose variant is available for sale in `context`. Reads at most
 * `PAGE_LIMIT` pages. API and response-shape errors throw.
 */
export async function pinVariant(
  storefrontUrl: URL,
  context: StorefrontContext,
  signal: AbortSignal,
): Promise<CatalogPin> {
  const client = publicStorefrontClient(storefrontUrl, context);
  let after: string | null = null;
  for (let page = 1; page <= PAGE_LIMIT; page++) {
    // Annotated: `after` is reassigned below, which makes inference circular.
    const variables: { first: number; after: string | null } = { first: PRODUCTS_PER_PAGE, after };
    const result = await client.graphql(CATALOG_QUERY, { variables, signal });
    const { products } = readData(result, catalogPageSchema);
    const pinned = products.nodes.map(eligibleVariant).find((variant) => variant !== undefined);
    if (pinned !== undefined) return { status: "found", pinned };
    if (!products.pageInfo.hasNextPage) {
      return {
        status: "skipped",
        reason: "No eligible variant: the catalog was searched to the end.",
      };
    }
    if (products.pageInfo.endCursor === null) {
      throw new Error(`Catalog pagination returned no cursor after page ${page}.`);
    }
    after = products.pageInfo.endCursor;
  }
  return {
    status: "skipped",
    reason: `No eligible variant: the ${PAGE_LIMIT}-page limit was reached (${PRODUCTS_PER_PAGE} products per page).`,
  };
}

function eligibleVariant(product: CatalogProduct): PinnedVariant | undefined {
  const variant = product.selectedOrFirstAvailableVariant;
  if (product.requiresSellingPlan || variant?.availableForSale !== true) return undefined;
  return {
    productHandle: product.handle,
    productTitle: product.title,
    variantId: variant.id,
    selectedOptions: variant.selectedOptions,
  };
}

/** `<URL path>/products/<handle>` on the URL's origin. The URL path is a base path such as `/en-ca`. */
export function productUrl(storefrontUrl: URL, handle: string): URL {
  const base = new URL(storefrontUrl.href);
  base.search = "";
  base.hash = "";
  if (!base.pathname.endsWith("/")) base.pathname = `${base.pathname}/`;
  return new URL(`products/${encodeURIComponent(handle)}`, base);
}
