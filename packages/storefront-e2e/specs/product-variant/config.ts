import { expect } from "@playwright/test";
import { gql } from "@shopify/hydrogen";

import { AbortSuiteError, SkipTestGroupError, createTest } from "../../src/matcher-fixture";
import {
  abortOnGraphQLErrors,
  assertRouteAvailable,
  createGraphQLDiscoverySignal,
} from "../../src/spec-config-validation";

export { expect };

const PRODUCT_VARIANT_PATHS = {
  product: (handle: string) => `/products/${handle}`,
};

const PRODUCT_VARIANTS_QUERY = gql(`
  query ProductVariants($productCount: Int!, $variantCount: Int!) {
    products(first: $productCount, query: "available_for_sale:true") {
      nodes {
        handle
        title
        variants(first: $variantCount) {
          nodes {
            availableForSale
            title
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`);

const PRODUCT_COUNT = 20;
const VARIANT_COUNT = 20;
const MINIMUM_VARIANT_COUNT = 2;

export type ProductVariantProduct = {
  readonly handle: string;
  readonly optionNames: readonly string[];
  readonly title: string;
};

export type ProductVariantTestData = {
  readonly paths: typeof PRODUCT_VARIANT_PATHS;
  readonly products: readonly ProductVariantProduct[];
};

export const test = createTest({
  discover: async ({ storefrontBaseUrl, storefrontClient }) => {
    const result = await storefrontClient.graphql(PRODUCT_VARIANTS_QUERY, {
      signal: createGraphQLDiscoverySignal(),
      variables: { productCount: PRODUCT_COUNT, variantCount: VARIANT_COUNT },
    });

    abortOnGraphQLErrors("Product variants list", result.errors);

    if (result.data === null) throw new AbortSuiteError("Product variants list returned no data");

    const products = result.data.products.nodes.flatMap((product): ProductVariantProduct[] => {
      const availableVariants = product.variants.nodes.filter(
        (variant) => variant.availableForSale,
      );
      if (availableVariants.length < MINIMUM_VARIANT_COUNT) return [];

      const optionNames = [
        ...new Set(
          availableVariants.flatMap((variant) =>
            variant.selectedOptions.map((option) => option.name),
          ),
        ),
      ];

      return [{ handle: product.handle, optionNames, title: product.title }];
    });
    const firstProduct = products[0];

    if (firstProduct === undefined) {
      throw new SkipTestGroupError("Make sure at least one product has multiple variants");
    }

    await assertRouteAvailable({
      storefrontBaseUrl,
      path: PRODUCT_VARIANT_PATHS.product(firstProduct.handle),
      reason: `Make sure you have a route handler for ${PRODUCT_VARIANT_PATHS.product(firstProduct.handle)}`,
      unavailableError: SkipTestGroupError,
    });

    const data = { paths: PRODUCT_VARIANT_PATHS, products } satisfies ProductVariantTestData;

    return { data };
  },
});
