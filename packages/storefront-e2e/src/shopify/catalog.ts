import type { SelectedOption } from "@shopify/hydrogen";
import { z } from "zod";

import { type StorefrontApi, type StorefrontContext } from "./storefront.ts";

const PRODUCTS_PER_PAGE = 50;
const VARIANTS_PER_PRODUCT = 50;

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
  | { status: "empty"; pagesScanned: number }
  | { status: "incomplete"; pagesScanned: number; reason: string };

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
          variants: z.object({
            pageInfo: pageInfoSchema,
            nodes: z.array(
              z.object({
                id: z.string(),
                title: z.string(),
                availableForSale: z.boolean(),
                selectedOptions: z.array(z.object({ name: z.string(), value: z.string() })),
              }),
            ),
          }),
        }),
      ),
    }),
  })
  .transform(({ products }) => ({
    ...products.pageInfo,
    products: products.nodes.map(({ variants, ...product }) => ({
      ...product,
      variantsTruncated: variants.pageInfo.hasNextPage,
      variants: variants.nodes,
    })),
  }));
type ProductPage = z.infer<typeof productPageSchema>;

/**
 * Finds the first purchasable variant (in stable ID order) that does not
 * require a selling plan, in the given context. Every page query declares
 * `$country` and `$language` with an explicit `@inContext`; the Storefront API
 * client fills both from the context. The search is
 * bounded: when the page cap is reached, or a product's variants are
 * truncated, before a match is found, the result is `incomplete`, never `empty`.
 */
export async function discoverPinnedVariant(
  api: StorefrontApi,
  options: { maxPages: number; context: StorefrontContext; signal: AbortSignal },
): Promise<CatalogDiscovery> {
  const document = `query StorefrontE2ECatalog($first: Int!, $after: String, $variantsFirst: Int!, $country: CountryCode!, $language: LanguageCode!) @inContext(country: $country, language: $language) {
  products(first: $first, after: $after, sortKey: ID, query: "available_for_sale:true") {
    pageInfo { hasNextPage endCursor }
    nodes {
      id title handle requiresSellingPlan
      variants(first: $variantsFirst) {
        pageInfo { hasNextPage }
        nodes { id title availableForSale selectedOptions { name value } }
      }
    }
  }
}`;

  let after: string | undefined;
  let truncated = false;
  for (let page = 1; page <= options.maxPages; page++) {
    const result = await api.query(
      document,
      {
        first: PRODUCTS_PER_PAGE,
        after: after ?? null,
        variantsFirst: VARIANTS_PER_PRODUCT,
      },
      (data) => productPageSchema.parse(data),
      options.signal,
      options.context,
    );

    const match = findEligible(result);
    if (match !== undefined) {
      return { status: "found", variant: match, pagesScanned: page };
    }
    truncated ||= result.products.some(
      (product) => product.variantsTruncated && !product.requiresSellingPlan,
    );

    if (!result.hasNextPage) {
      return truncated
        ? {
            status: "incomplete",
            pagesScanned: page,
            reason: "Some products have more variants than were searched.",
          }
        : { status: "empty", pagesScanned: page };
    }
    if (result.endCursor === undefined) {
      return {
        status: "incomplete",
        pagesScanned: page,
        reason: "Catalog pagination returned no cursor.",
      };
    }
    after = result.endCursor;
  }

  return {
    status: "incomplete",
    pagesScanned: options.maxPages,
    reason: `Catalog search cap reached (${options.maxPages} pages) before an eligible variant was found.`,
  };
}

function findEligible(page: ProductPage): PinnedVariant | undefined {
  for (const product of page.products) {
    if (product.requiresSellingPlan) {
      continue;
    }
    const variant = product.variants.find((candidate) => candidate.availableForSale);
    if (variant !== undefined) {
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
