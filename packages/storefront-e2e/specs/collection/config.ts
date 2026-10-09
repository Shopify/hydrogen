import { expect } from "@playwright/test";
import { gql } from "@shopify/hydrogen";

import { AbortSuiteError, SkipTestGroupError, createTest } from "../../src/matcher-fixture";
import {
  abortOnGraphQLErrors,
  assertRouteAvailable,
  createGraphQLDiscoverySignal,
} from "../../src/spec-config-validation";

export { expect };

const COLLECTION_PATHS = {
  collection: (handle: string) => `/collections/${handle}`,
};

const COLLECTIONS_WITH_PRODUCTS_QUERY = gql(`
  query CollectionsWithProducts($collectionCount: Int!, $productCount: Int!) {
    collections(first: $collectionCount) {
      nodes {
        handle
        title
        products(first: $productCount) {
          nodes {
            handle
            title
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
    const result = await storefrontClient.graphql(COLLECTIONS_WITH_PRODUCTS_QUERY, {
      signal: createGraphQLDiscoverySignal(),
      variables: { collectionCount: COLLECTION_COUNT, productCount: PRODUCT_COUNT },
    });

    abortOnGraphQLErrors("Collections list", result.errors);

    if (result.data === null) throw new AbortSuiteError("Collections list returned no data");

    const collections = result.data.collections.nodes.filter(
      (collection) => collection.products.nodes.length > 0,
    );
    const firstCollection = collections[0];

    if (firstCollection === undefined) {
      throw new SkipTestGroupError("Make sure at least one collection has products");
    }

    await assertRouteAvailable({
      storefrontBaseUrl,
      path: COLLECTION_PATHS.collection(firstCollection.handle),
      reason: `Make sure you have a route handler for ${COLLECTION_PATHS.collection(firstCollection.handle)}`,
      unavailableError: SkipTestGroupError,
    });

    return { data: { collections, paths: COLLECTION_PATHS } };
  },
});
