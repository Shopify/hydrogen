import { z } from "zod";

import { publicStorefrontClient, readData, type StorefrontLocale } from "./storefront.ts";

export const PRODUCTS_PER_PAGE = 50;
export const PAGE_LIMIT = 5;
/** `pinNonDefaultVariant` examines at most this many variants of each product. */
export const VARIANTS_PER_PRODUCT = 10;

export type PinnedVariant = {
  productHandle: string;
  productTitle: string;
  variantId: string;
  selectedOptions: Array<{ name: string; value: string }>;
};

export type CatalogPin =
  | { status: "pinned"; pinned: PinnedVariant }
  | { status: "skipped"; reason: string };

// Not `$country` or `$language`: the client would fill those from its locale. The pin functions
// pass the discovered context explicitly. The same applies to `VARIANT_CHOICE_QUERY`.
const CATALOG_QUERY = `query AgenticE2ECatalog($first: Int!, $after: String, $storefrontCountry: CountryCode!, $storefrontLanguage: LanguageCode!) @inContext(country: $storefrontCountry, language: $storefrontLanguage) {
  products(first: $first, after: $after, sortKey: ID, query: "available_for_sale:true") {
    pageInfo { hasNextPage endCursor }
    nodes {
      title handle requiresSellingPlan
      selectedOrFirstAvailableVariant { id availableForSale selectedOptions { name value } }
    }
  }
}`;

const VARIANT_CHOICE_QUERY = `query AgenticE2EVariantChoice($first: Int!, $after: String, $variants: Int!, $storefrontCountry: CountryCode!, $storefrontLanguage: LanguageCode!) @inContext(country: $storefrontCountry, language: $storefrontLanguage) {
  products(first: $first, after: $after, sortKey: ID, query: "available_for_sale:true") {
    pageInfo { hasNextPage endCursor }
    nodes {
      title handle requiresSellingPlan
      selectedOrFirstAvailableVariant { id }
      variants(first: $variants) { nodes { id availableForSale selectedOptions { name value } } }
    }
  }
}`;

const selectedOptionsSchema = z.array(z.object({ name: z.string(), value: z.string() }));

/** A page of `products` with `pageInfo` and nodes that match `product`. */
function catalogPageSchema<Product extends z.ZodType>(product: Product) {
  return z.object({
    products: z.object({
      pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
      nodes: z.array(product),
    }),
  });
}

const defaultVariantPageSchema = catalogPageSchema(
  z.object({
    title: z.string(),
    handle: z.string(),
    requiresSellingPlan: z.boolean(),
    // Nullable in the schema: the field must be present, but it can be null.
    selectedOrFirstAvailableVariant: z
      .object({
        id: z.string(),
        availableForSale: z.boolean(),
        selectedOptions: selectedOptionsSchema,
      })
      .nullable(),
  }),
);
type CatalogProduct = z.infer<typeof defaultVariantPageSchema>["products"]["nodes"][number];

const variantChoicePageSchema = catalogPageSchema(
  z.object({
    title: z.string(),
    handle: z.string(),
    requiresSellingPlan: z.boolean(),
    selectedOrFirstAvailableVariant: z.object({ id: z.string() }).nullable(),
    variants: z.object({
      nodes: z.array(
        z.object({
          id: z.string(),
          availableForSale: z.boolean(),
          selectedOptions: selectedOptionsSchema,
        }),
      ),
    }),
  }),
);
type VariantChoiceProduct = z.infer<typeof variantChoicePageSchema>["products"]["nodes"][number];

type PageInfo = { hasNextPage: boolean; endCursor: string | null };

/**
 * Pins the `selectedOrFirstAvailableVariant` of the first product, in product ID order, that does
 * not require a selling plan and whose variant is available for sale in `context`. Reads at most
 * `PAGE_LIMIT` pages. API and response-shape errors throw.
 */
export async function pinVariant(
  storefrontUrl: URL,
  context: StorefrontLocale,
  signal: AbortSignal,
): Promise<CatalogPin> {
  const client = publicStorefrontClient(storefrontUrl);
  return searchCatalog("No eligible variant", async (after) => {
    const variables = {
      first: PRODUCTS_PER_PAGE,
      after,
      storefrontCountry: context.country,
      storefrontLanguage: context.language,
    };
    const result = await client.graphql(CATALOG_QUERY, { variables, signal });
    const { products } = readData(result, defaultVariantPageSchema);
    return { pageInfo: products.pageInfo, pinned: firstPin(products.nodes, defaultVariant) };
  });
}

/**
 * Pins a variant that is not the default one. It takes the first product, in product ID order,
 * that does not require a selling plan, has a `selectedOrFirstAvailableVariant` (the default), and
 * has at least 2 variants available for sale in `context` among its first `VARIANTS_PER_PRODUCT`
 * variants. It pins the first of those, in API order, that is not the default. Reads at most
 * `PAGE_LIMIT` pages. API and response-shape errors throw.
 */
export async function pinNonDefaultVariant(
  storefrontUrl: URL,
  context: StorefrontLocale,
  signal: AbortSignal,
): Promise<CatalogPin> {
  const client = publicStorefrontClient(storefrontUrl);
  return searchCatalog("No product with at least 2 variants available for sale", async (after) => {
    const variables = {
      first: PRODUCTS_PER_PAGE,
      after,
      variants: VARIANTS_PER_PRODUCT,
      storefrontCountry: context.country,
      storefrontLanguage: context.language,
    };
    const result = await client.graphql(VARIANT_CHOICE_QUERY, { variables, signal });
    const { products } = readData(result, variantChoicePageSchema);
    return { pageInfo: products.pageInfo, pinned: firstPin(products.nodes, nonDefaultVariant) };
  });
}

/**
 * Reads catalog pages with `readPage`, from the first page on, until a page has a pin, the catalog
 * ends, or `PAGE_LIMIT` pages were read. `notFound` starts the skip reason.
 */
async function searchCatalog(
  notFound: string,
  readPage: (
    after: string | null,
  ) => Promise<{ pageInfo: PageInfo; pinned: PinnedVariant | undefined }>,
): Promise<CatalogPin> {
  let after: string | null = null;
  for (let page = 1; page <= PAGE_LIMIT; page++) {
    const { pageInfo, pinned } = await readPage(after);
    if (pinned !== undefined) return { status: "pinned", pinned };
    if (!pageInfo.hasNextPage) {
      return { status: "skipped", reason: `${notFound}: the catalog was searched to the end.` };
    }
    if (pageInfo.endCursor === null) {
      throw new Error(`Catalog pagination returned no cursor after page ${page}.`);
    }
    after = pageInfo.endCursor;
  }
  return {
    status: "skipped",
    reason: `${notFound}: the ${PAGE_LIMIT}-page limit was reached (${PRODUCTS_PER_PAGE} products per page).`,
  };
}

function firstPin<Product>(
  products: Product[],
  pick: (product: Product) => PinnedVariant | undefined,
): PinnedVariant | undefined {
  return products.map(pick).find((variant) => variant !== undefined);
}

function defaultVariant(product: CatalogProduct): PinnedVariant | undefined {
  const variant = product.selectedOrFirstAvailableVariant;
  if (product.requiresSellingPlan || variant?.availableForSale !== true) return undefined;
  return pinnedVariant(product, variant);
}

function nonDefaultVariant(product: VariantChoiceProduct): PinnedVariant | undefined {
  const defaultId = product.selectedOrFirstAvailableVariant?.id;
  if (product.requiresSellingPlan || defaultId === undefined) return undefined;
  const available = product.variants.nodes.filter((variant) => variant.availableForSale);
  if (available.length < 2) return undefined;
  const variant = available.find((candidate) => candidate.id !== defaultId);
  return variant === undefined ? undefined : pinnedVariant(product, variant);
}

function pinnedVariant(
  product: { handle: string; title: string },
  variant: { id: string; selectedOptions: PinnedVariant["selectedOptions"] },
): PinnedVariant {
  return {
    productHandle: product.handle,
    productTitle: product.title,
    variantId: variant.id,
    selectedOptions: variant.selectedOptions,
  };
}

/** `/products/<handle>` on the URL's origin. */
export function productUrl(storefrontUrl: URL, handle: string): URL {
  return new URL(`/products/${encodeURIComponent(handle)}`, storefrontUrl.origin);
}
