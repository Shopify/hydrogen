import { expect } from "@playwright/test";
import { gql } from "@shopify/hydrogen";

import { AbortSuiteError, createTest } from "../../src/matcher-fixture";
import {
  abortOnGraphQLErrors,
  assertRouteAvailable,
  createGraphQLDiscoverySignal,
} from "../../src/spec-config-validation";

export { expect };

const CART_PATH = "/cart";
const CART_ENABLED_PRODUCT_COUNT = 10;
const PRODUCT_VARIANT_COUNT = 10;

const CART_ENABLED_PRODUCTS_QUERY = gql(`
  query CartEnabledProducts($count: Int!, $variantCount: Int!) {
    products(first: $count, query: "availableForSale:true") {
      nodes {
        handle
        requiresSellingPlan
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

type SelectedOption = {
  readonly name: string;
  readonly value: string;
};

export type CartTestProduct = {
  readonly path: string;
  readonly productTitle: string;
  readonly variantLabel: string;
};

const CART_PATHS = {
  cart: CART_PATH,
};

export const test = createTest({
  discover: async ({ storefrontBaseUrl, storefrontClient }) => {
    const products = await storefrontClient.graphql(CART_ENABLED_PRODUCTS_QUERY, {
      signal: createGraphQLDiscoverySignal(),
      variables: { count: CART_ENABLED_PRODUCT_COUNT, variantCount: PRODUCT_VARIANT_COUNT },
    });

    abortOnGraphQLErrors("Cart enabled products list", products.errors);

    if (products.data === null)
      throw new AbortSuiteError("Cart enabled products list returned no data");

    const cartEnabledProducts = products.data.products.nodes.flatMap(
      (product): CartTestProduct[] => {
        if (product.requiresSellingPlan) return [];

        const variant = product.variants.nodes.find((candidate) => candidate.availableForSale);
        if (variant === undefined) return [];

        return [
          {
            path: productPath(product.handle, variant.selectedOptions),
            productTitle: product.title,
            variantLabel: variant.title,
          },
        ];
      },
    );

    if (cartEnabledProducts.length === 0) {
      throw new AbortSuiteError(
        "Make sure at least one in-stock product variant can be added to cart",
      );
    }

    await assertRouteAvailable({
      storefrontBaseUrl,
      path: cartEnabledProducts[0].path,
      reason: `Make sure you have a route handler for ${cartEnabledProducts[0].path}`,
    });
    await assertRouteAvailable({
      storefrontBaseUrl,
      path: CART_PATH,
      reason: `Make sure you have a route handler for ${CART_PATH}`,
    });

    return { data: { paths: CART_PATHS, products: cartEnabledProducts } };
  },
});

function productPath(handle: string, selectedOptions: readonly SelectedOption[]): string {
  const searchParams = new URLSearchParams();
  for (const option of selectedOptions) searchParams.set(option.name, option.value);

  const query = searchParams.toString();
  const path = `/products/${handle}`;
  return query === "" ? path : `${path}?${query}`;
}
