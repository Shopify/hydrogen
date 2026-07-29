import { expect } from "@playwright/test";
import { gql } from "@shopify/hydrogen";

import { AbortSuiteError, SkipTestGroupError, createTest } from "../../src/matcher-fixture";
import {
  abortOnGraphQLErrors,
  assertRouteAvailable,
  createGraphQLDiscoverySignal,
} from "../../src/spec-config-validation";

export { expect };

const COLLECTION_FILTER_PATHS = {
  collection: (handle: string) => `/collections/${handle}`,
  product: "/products/",
};

const COLLECTIONS_WITH_FILTERS_QUERY = gql(`
  query CollectionsWithFilters($collectionCount: Int!, $productCount: Int!) {
    collections(first: $collectionCount) {
      nodes {
        handle
        title
        products(first: $productCount) {
          filters {
            label
            values {
              count
              label
            }
          }
          nodes {
            handle
          }
        }
      }
    }
  }
`);

const COLLECTION_COUNT = 10;
const PRODUCT_COUNT = 10;

export const test = createTest({
  discover: async ({ storefrontBaseUrl, storefrontClient }) => {
    const result = await storefrontClient.graphql(COLLECTIONS_WITH_FILTERS_QUERY, {
      signal: createGraphQLDiscoverySignal(),
      variables: { collectionCount: COLLECTION_COUNT, productCount: PRODUCT_COUNT },
    });

    abortOnGraphQLErrors("Collection filters list", result.errors);

    if (result.data === null) throw new AbortSuiteError("Collection filters list returned no data");

    const collections = result.data.collections.nodes.filter((collection) => {
      if (collection.products.nodes.length === 0) return false;

      return collection.products.filters.some((filter) =>
        filter.values.some(
          (value) => value.count > 0 && value.count < collection.products.nodes.length,
        ),
      );
    });
    const firstCollection = collections[0];

    if (firstCollection === undefined) {
      throw new SkipTestGroupError(
        "Make sure at least one collection has products and Storefront API filters",
      );
    }

    await assertRouteAvailable({
      storefrontBaseUrl,
      path: COLLECTION_FILTER_PATHS.collection(firstCollection.handle),
      reason: `Make sure you have a route handler for ${COLLECTION_FILTER_PATHS.collection(firstCollection.handle)}`,
      unavailableError: SkipTestGroupError,
    });

    return { data: { collections, paths: COLLECTION_FILTER_PATHS } };
  },
});
