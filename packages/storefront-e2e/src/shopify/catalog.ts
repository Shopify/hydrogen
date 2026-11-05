import {
  expectArray,
  expectBoolean,
  expectPageInfo,
  expectRecord,
  expectString,
  inContext,
  type StorefrontApi,
  type StorefrontContext,
} from "./storefront.ts";

const PRODUCTS_PER_PAGE = 50;
const VARIANTS_PER_PRODUCT = 50;

export type PinnedVariant = {
  variantId: string;
  variantTitle: string;
  productId: string;
  productTitle: string;
  productHandle: string;
  selectedOptions: Array<{ name: string; value: string }>;
};

export type CatalogDiscovery =
  | { status: "found"; variant: PinnedVariant; pagesScanned: number }
  | { status: "empty"; pagesScanned: number }
  | { status: "incomplete"; pagesScanned: number; reason: string };

type ProductPage = {
  hasNextPage: boolean;
  endCursor: string | undefined;
  products: Array<{
    id: string;
    title: string;
    handle: string;
    requiresSellingPlan: boolean;
    variantsTruncated: boolean;
    variants: Array<{
      id: string;
      title: string;
      availableForSale: boolean;
      selectedOptions: Array<{ name: string; value: string }>;
    }>;
  }>;
};

/**
 * Finds the first purchasable variant (in stable ID order) that does not
 * require a selling plan, in the given context. Every page query carries an
 * explicit `@inContext` and the response context is checked. The search is
 * bounded: when the page cap is reached, or a product's variants are
 * truncated, before a match is found, the result is `incomplete`, never `empty`.
 */
export async function discoverPinnedVariant(
  api: StorefrontApi,
  options: { maxPages: number; context: StorefrontContext; signal: AbortSignal },
): Promise<CatalogDiscovery> {
  const context = inContext(options.context);
  const document = `query StorefrontE2ECatalog($first: Int!, $after: String, $variantsFirst: Int!${context.definitions}) ${context.directive} {
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
        ...context.variables,
      },
      parseProductPage,
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

function parseProductPage(data: unknown): ProductPage {
  const products = expectRecord(expectRecord(data, "data").products, "products");
  const pageInfo = expectPageInfo(products.pageInfo, "products.pageInfo");
  return {
    ...pageInfo,
    products: expectArray(products.nodes, "products.nodes").map((node, index) => {
      const path = `products.nodes[${index}]`;
      const product = expectRecord(node, path);
      const variants = expectRecord(product.variants, `${path}.variants`);
      return {
        id: expectString(product.id, `${path}.id`),
        title: expectString(product.title, `${path}.title`),
        handle: expectString(product.handle, `${path}.handle`),
        requiresSellingPlan: expectBoolean(
          product.requiresSellingPlan,
          `${path}.requiresSellingPlan`,
        ),
        variantsTruncated: expectPageInfo(variants.pageInfo, `${path}.variants.pageInfo`)
          .hasNextPage,
        variants: expectArray(variants.nodes, `${path}.variants.nodes`).map(
          (variantNode, variantIndex) =>
            parseVariant(variantNode, `${path}.variants.nodes[${variantIndex}]`),
        ),
      };
    }),
  };
}

function parseVariant(
  node: unknown,
  path: string,
): ProductPage["products"][number]["variants"][number] {
  const variant = expectRecord(node, path);
  return {
    id: expectString(variant.id, `${path}.id`),
    title: expectString(variant.title, `${path}.title`),
    availableForSale: expectBoolean(variant.availableForSale, `${path}.availableForSale`),
    selectedOptions: expectArray(variant.selectedOptions, `${path}.selectedOptions`).map(
      (option, index) => {
        const record = expectRecord(option, `${path}.selectedOptions[${index}]`);
        return {
          name: expectString(record.name, `${path}.selectedOptions[${index}].name`),
          value: expectString(record.value, `${path}.selectedOptions[${index}].value`),
        };
      },
    ),
  };
}
