import { expect } from "@playwright/test";
import { gql } from "@shopify/hydrogen";

import { AbortSuiteError, SkipTestGroupError, createTest } from "../../src/matcher-fixture";
import {
  abortOnGraphQLErrors,
  assertRouteAvailable,
  createGraphQLDiscoverySignal,
} from "../../src/spec-config-validation";

export { expect };

const SEARCH_PATHS = {
  product: "/products/",
  search: "/search",
};

const SEARCH_PRODUCTS_QUERY = gql(`
  query SearchProducts($count: Int!) {
    products(first: $count, query: "available_for_sale:true") {
      nodes {
        title
      }
    }
  }
`);

const PRODUCT_COUNT = 20;

export const test = createTest({
  discover: async ({ storefrontBaseUrl, storefrontClient }) => {
    const result = await storefrontClient.graphql(SEARCH_PRODUCTS_QUERY, {
      signal: createGraphQLDiscoverySignal(),
      variables: { count: PRODUCT_COUNT },
    });

    abortOnGraphQLErrors("Search products list", result.errors);

    if (result.data === null) throw new AbortSuiteError("Search products list returned no data");
    if (result.data.products.nodes.length === 0) {
      throw new SkipTestGroupError("Make sure at least one product is in stock for search");
    }

    await assertRouteAvailable({
      storefrontBaseUrl,
      path: SEARCH_PATHS.search,
      reason: `Make sure you have a route handler for ${SEARCH_PATHS.search}`,
      unavailableError: SkipTestGroupError,
    });

    return { data: { paths: SEARCH_PATHS, products: result.data.products.nodes } };
  },
});
