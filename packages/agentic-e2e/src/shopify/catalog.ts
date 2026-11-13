import { z } from "zod";

import { publicStorefrontClient, readData, type StorefrontLocale } from "./storefront.ts";

export const PRODUCTS_PER_PAGE = 50;
export const PAGE_LIMIT = 5;
/** `pinNonDefaultVariant` examines at most this many variants of each product. */
export const VARIANTS_PER_PRODUCT = 10;
/**
 * `pinVariantWithTwoUnits` checks at most this many variants in one run. Each check creates one
 * cart on the shop that nothing uses.
 */
export const STOCK_CHECK_LIMIT = 5;
/** The quantity that the stock check puts in its cart. */
const STOCK_CHECK_QUANTITY = 2;

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

// A tokenless `cartCreate` with one line. It reads only the line quantities, the variant of each
// line (to find the checked line), and `userErrors`: not the cart ID or the checkout URL.
const STOCK_CHECK_MUTATION = `mutation AgenticE2EStockCheck($lines: [CartLineInput!]!, $storefrontCountry: CountryCode!, $storefrontLanguage: LanguageCode!) @inContext(country: $storefrontCountry, language: $storefrontLanguage) {
  cartCreate(input: { lines: $lines }) {
    cart { lines(first: 10) { nodes { quantity merchandise { ... on ProductVariant { id } } } } }
    userErrors { code message }
  }
}`;

const stockCheckSchema = z.object({
  cartCreate: z.object({
    cart: z
      .object({
        lines: z.object({
          nodes: z.array(
            z.object({
              quantity: z.number(),
              merchandise: z.object({ id: z.string().optional() }),
            }),
          ),
        }),
      })
      .nullable(),
    userErrors: z.array(z.object({ code: z.string().nullable(), message: z.string() })),
  }),
});

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
  return searchCatalog(
    () => "No eligible variant",
    async (after) => {
      const products = await readDefaultVariantPage(client, after, context, signal);
      return {
        pageInfo: products.pageInfo,
        found: found(firstPin(products.nodes, defaultVariant)),
      };
    },
  );
}

/**
 * Pins the first of the variants that `pinVariant` examines, in the same order, of which the shop
 * accepts {@link STOCK_CHECK_QUANTITY} units. For each variant, one tokenless `cartCreate` in
 * `context` asks for that quantity. The variant is accepted when the cart has a line of that
 * variant with exactly that quantity and there are no `userErrors`. Each check creates one cart
 * that nothing uses, so at most {@link STOCK_CHECK_LIMIT} variants are checked. Reads at most
 * `PAGE_LIMIT` pages. API and response-shape errors throw.
 */
export async function pinVariantWithTwoUnits(
  storefrontUrl: URL,
  context: StorefrontLocale,
  signal: AbortSignal,
): Promise<CatalogPin> {
  const client = publicStorefrontClient(storefrontUrl);
  let checked = 0;
  const notFound = (): string =>
    checked === 0
      ? "No eligible variant"
      : `No variant could be added to a cart with ${STOCK_CHECK_QUANTITY} units (${checked} eligible ${checked === 1 ? "variant" : "variants"} checked)`;
  return searchCatalog(notFound, async (after) => {
    const products = await readDefaultVariantPage(client, after, context, signal);
    for (const candidate of products.nodes.map(defaultVariant)) {
      if (candidate === undefined) continue;
      checked += 1;
      if (await acceptsStockCheck(client, candidate.variantId, context, signal)) {
        return { pageInfo: products.pageInfo, found: found(candidate) };
      }
      if (checked === STOCK_CHECK_LIMIT) {
        const reason = `${notFound()}: the ${STOCK_CHECK_LIMIT}-variant check limit was reached.`;
        return { pageInfo: products.pageInfo, found: { status: "skipped", reason } };
      }
    }
    return { pageInfo: products.pageInfo, found: undefined };
  });
}

type StorefrontClient = ReturnType<typeof publicStorefrontClient>;

async function readDefaultVariantPage(
  client: StorefrontClient,
  after: string | null,
  context: StorefrontLocale,
  signal: AbortSignal,
) {
  const variables = {
    first: PRODUCTS_PER_PAGE,
    after,
    storefrontCountry: context.country,
    storefrontLanguage: context.language,
  };
  const result = await client.graphql(CATALOG_QUERY, { variables, signal });
  return readData(result, defaultVariantPageSchema).products;
}

/** One `cartCreate` with {@link STOCK_CHECK_QUANTITY} units of the variant. */
async function acceptsStockCheck(
  client: StorefrontClient,
  variantId: string,
  context: StorefrontLocale,
  signal: AbortSignal,
): Promise<boolean> {
  const variables = {
    lines: [{ merchandiseId: variantId, quantity: STOCK_CHECK_QUANTITY }],
    storefrontCountry: context.country,
    storefrontLanguage: context.language,
  };
  const result = await client.graphql(STOCK_CHECK_MUTATION, { variables, signal });
  const { cart, userErrors } = readData(result, stockCheckSchema).cartCreate;
  if (userErrors.length > 0 || cart === null) return false;
  return cart.lines.nodes.some(
    (line) => line.merchandise.id === variantId && line.quantity === STOCK_CHECK_QUANTITY,
  );
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
  return searchCatalog(
    () => "No product with at least 2 variants available for sale",
    async (after) => {
      const variables = {
        first: PRODUCTS_PER_PAGE,
        after,
        variants: VARIANTS_PER_PRODUCT,
        storefrontCountry: context.country,
        storefrontLanguage: context.language,
      };
      const result = await client.graphql(VARIANT_CHOICE_QUERY, { variables, signal });
      const { products } = readData(result, variantChoicePageSchema);
      return {
        pageInfo: products.pageInfo,
        found: found(firstPin(products.nodes, nonDefaultVariant)),
      };
    },
  );
}

/**
 * Reads catalog pages with `readPage`, from the first page on, until a page has a result (a pin,
 * or a skip that ends the search), the catalog ends, or `PAGE_LIMIT` pages were read. `notFound`
 * starts the skip reason. It is read when the search ends.
 */
async function searchCatalog(
  notFound: () => string,
  readPage: (
    after: string | null,
  ) => Promise<{ pageInfo: PageInfo; found: CatalogPin | undefined }>,
): Promise<CatalogPin> {
  let after: string | null = null;
  for (let page = 1; page <= PAGE_LIMIT; page++) {
    const { pageInfo, found: result } = await readPage(after);
    if (result !== undefined) return result;
    if (!pageInfo.hasNextPage) {
      return { status: "skipped", reason: `${notFound()}: the catalog was searched to the end.` };
    }
    if (pageInfo.endCursor === null) {
      throw new Error(`Catalog pagination returned no cursor after page ${page}.`);
    }
    after = pageInfo.endCursor;
  }
  return {
    status: "skipped",
    reason: `${notFound()}: the ${PAGE_LIMIT}-page limit was reached (${PRODUCTS_PER_PAGE} products per page).`,
  };
}

function found(pinned: PinnedVariant | undefined): CatalogPin | undefined {
  return pinned === undefined ? undefined : { status: "pinned", pinned };
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
