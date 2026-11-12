import { z } from "zod";

import { publicStorefrontClient, readData, type StorefrontLocale } from "./storefront.ts";

export const PRODUCTS_PER_PAGE = 50;
export const PAGE_LIMIT = 5;
/** `findVariantChoice` examines at most this many variants of each product. */
export const VARIANTS_PER_PRODUCT = 10;

export type PinnedVariant = {
  productHandle: string;
  productTitle: string;
  variantId: string;
  selectedOptions: Array<{ name: string; value: string }>;
};

type Skipped = { status: "skipped"; reason: string };

export type CatalogPin = { status: "pinned"; pinned: PinnedVariant } | Skipped;

export type VariantCandidate = { id: string; selectedOptions: PinnedVariant["selectedOptions"] };

/**
 * A product for `choose-a-variant`. The variant is pinned only after the product page shows which
 * variant it selects first (see `pinOtherVariant`).
 */
export type VariantChoice = {
  productHandle: string;
  productTitle: string;
  /** The IDs of the examined variants, available for sale or not. */
  variantIds: string[];
  /** The examined variants that are available for sale, in API order. */
  candidates: [VariantCandidate, VariantCandidate, ...VariantCandidate[]];
};

export type VariantChoiceSearch = { status: "found"; product: VariantChoice } | Skipped;

// Not `$country` or `$language`: the client would fill those from its locale. The catalog
// functions pass the discovered context explicitly. The same applies to `VARIANT_CHOICE_QUERY`.
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
  const search = await searchCatalog("No eligible variant", async (after) => {
    const variables = {
      first: PRODUCTS_PER_PAGE,
      after,
      storefrontCountry: context.country,
      storefrontLanguage: context.language,
    };
    const result = await client.graphql(CATALOG_QUERY, { variables, signal });
    const { products } = readData(result, defaultVariantPageSchema);
    return { pageInfo: products.pageInfo, found: firstMatch(products.nodes, defaultVariant) };
  });
  return search.status === "found" ? { status: "pinned", pinned: search.found } : search;
}

/**
 * Finds the first product, in product ID order, that does not require a selling plan and has at
 * least 2 variants available for sale in `context` among its first `VARIANTS_PER_PRODUCT`
 * variants. It pins no variant: the caller pins one with `pinOtherVariant` after it sees which
 * variant the product page selects first. Reads at most `PAGE_LIMIT` pages. API and
 * response-shape errors throw.
 */
export async function findVariantChoice(
  storefrontUrl: URL,
  context: StorefrontLocale,
  signal: AbortSignal,
): Promise<VariantChoiceSearch> {
  const client = publicStorefrontClient(storefrontUrl);
  const notFound = "No product with at least 2 variants available for sale";
  const search = await searchCatalog(notFound, async (after) => {
    const variables = {
      first: PRODUCTS_PER_PAGE,
      after,
      variants: VARIANTS_PER_PRODUCT,
      storefrontCountry: context.country,
      storefrontLanguage: context.language,
    };
    const result = await client.graphql(VARIANT_CHOICE_QUERY, { variables, signal });
    const { products } = readData(result, variantChoicePageSchema);
    return { pageInfo: products.pageInfo, found: firstMatch(products.nodes, variantChoice) };
  });
  return search.status === "found" ? { status: "found", product: search.found } : search;
}

/**
 * Pins the first candidate, in API order, that is not `selectedId`: the variant that the product
 * page selects first. There are at least 2 candidates, so there is always one.
 */
export function pinOtherVariant(product: VariantChoice, selectedId: string): PinnedVariant {
  const [first, second] = product.candidates;
  const variant = first.id === selectedId ? second : first;
  return {
    productHandle: product.productHandle,
    productTitle: product.productTitle,
    variantId: variant.id,
    selectedOptions: variant.selectedOptions,
  };
}

/**
 * Reads catalog pages with `readPage`, from the first page on, until a page has a match, the
 * catalog ends, or `PAGE_LIMIT` pages were read. `notFound` starts the skip reason.
 */
async function searchCatalog<T>(
  notFound: string,
  readPage: (after: string | null) => Promise<{ pageInfo: PageInfo; found: T | undefined }>,
): Promise<{ status: "found"; found: T } | Skipped> {
  let after: string | null = null;
  for (let page = 1; page <= PAGE_LIMIT; page++) {
    const { pageInfo, found } = await readPage(after);
    if (found !== undefined) return { status: "found", found };
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

function firstMatch<Product, T>(products: Product[], pick: (product: Product) => T | undefined) {
  return products.map(pick).find((match) => match !== undefined);
}

function defaultVariant(product: CatalogProduct): PinnedVariant | undefined {
  const variant = product.selectedOrFirstAvailableVariant;
  if (product.requiresSellingPlan || variant?.availableForSale !== true) return undefined;
  return {
    productHandle: product.handle,
    productTitle: product.title,
    variantId: variant.id,
    selectedOptions: variant.selectedOptions,
  };
}

function variantChoice(product: VariantChoiceProduct): VariantChoice | undefined {
  if (product.requiresSellingPlan) return undefined;
  const variants = product.variants.nodes;
  const [first, second, ...rest] = variants
    .filter((variant) => variant.availableForSale)
    .map(({ id, selectedOptions }) => ({ id, selectedOptions }));
  if (first === undefined || second === undefined) return undefined;
  return {
    productHandle: product.handle,
    productTitle: product.title,
    variantIds: variants.map((variant) => variant.id),
    candidates: [first, second, ...rest],
  };
}

/** `/products/<handle>` on the URL's origin. */
export function productUrl(storefrontUrl: URL, handle: string): URL {
  return new URL(`/products/${encodeURIComponent(handle)}`, storefrontUrl.origin);
}
