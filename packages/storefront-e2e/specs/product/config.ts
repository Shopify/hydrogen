import { expect } from "@playwright/test";
import { gql } from "@shopify/hydrogen";

import { AbortSuiteError, createTest } from "../../src/matcher-fixture";
import {
  abortOnGraphQLErrors,
  assertRouteAvailable,
  createGraphQLDiscoverySignal,
} from "../../src/spec-config-validation";

export { expect };

const PRODUCT_PATHS = {
  product: (handle: string) => `/products/${handle}`,
};

const PRODUCTS_IN_STOCK_QUERY = gql(`
  query ProductsInStock($count: Int!, $variantCount: Int!) {
    products(first: $count, query: "available_for_sale:true") {
      nodes {
        handle
        title
        variants(first: $variantCount) {
          nodes {
            id
            title
            availableForSale
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

const PRODUCT_COUNT = 10;
const VARIANT_COUNT = 10;

export const test = createTest({
  discover: async ({ storefrontBaseUrl, storefrontClient }) => {
    const productsInStock = await storefrontClient.graphql(PRODUCTS_IN_STOCK_QUERY, {
      signal: createGraphQLDiscoverySignal(),
      variables: { count: PRODUCT_COUNT, variantCount: VARIANT_COUNT },
    });

    abortOnGraphQLErrors("Products list", productsInStock.errors);

    if (!productsInStock.data) {
      throw new AbortSuiteError("Products list returned no data");
    }

    if (productsInStock.data.products.nodes.length === 0) {
      throw new AbortSuiteError("Make sure at least one product is in stock");
    }

    const firstProductHandle = productsInStock.data.products.nodes[0]?.handle;
    if (firstProductHandle === undefined) {
      throw new AbortSuiteError("Make sure at least one product is in stock");
    }

    await assertRouteAvailable({
      storefrontBaseUrl,
      path: PRODUCT_PATHS.product(firstProductHandle),
      reason: `Make sure you have a route handler for ${PRODUCT_PATHS.product(firstProductHandle)}`,
    });

    return {
      data: { products: productsInStock.data.products.nodes, paths: PRODUCT_PATHS },
    };
  },
});
