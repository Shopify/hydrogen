import { expect } from "@playwright/test";
import { gql, type StorefrontClient } from "@shopify/hydrogen";

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
const STOCK_LIMIT_CANDIDATE_COUNT = 10;
const STOCK_LIMIT_CART_QUANTITY = 9_999;

const CART_ENABLED_PRODUCTS_QUERY = gql(`
  query CartEnabledProducts($count: Int!, $variantCount: Int!) {
    products(first: $count, query: "available_for_sale:true") {
      nodes {
        handle
        requiresSellingPlan
        title
        variants(first: $variantCount) {
          nodes {
            id
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

const CREATE_STOCK_LIMIT_CART_MUTATION = gql(`
  mutation CreateStockLimitCart($merchandiseId: ID!, $quantity: Int!) {
    cartCreate(
      input: { lines: [{ merchandiseId: $merchandiseId, quantity: $quantity }] }
    ) {
      cart {
        lines(first: 1) {
          nodes {
            quantity
            merchandise {
              ... on ProductVariant {
                id
              }
            }
          }
        }
      }
      userErrors {
        message
      }
    }
  }
`);

type SelectedOption = {
  readonly name: string;
  readonly value: string;
};

type CartDiscoveryProduct = {
  readonly handle: string;
  readonly requiresSellingPlan: boolean;
  readonly title: string;
  readonly variants: {
    readonly nodes: readonly {
      readonly availableForSale: boolean;
      readonly id: string;
      readonly selectedOptions: readonly SelectedOption[];
      readonly title: string;
    }[];
  };
};

export type CartTestProduct = {
  readonly path: string;
  readonly productTitle: string;
  readonly variantLabel: string;
};

export type StockLimitCartTestProduct = CartTestProduct & {
  readonly maxQuantity: number;
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

    const stockLimitProduct = await discoverStockLimitProduct(
      storefrontClient,
      products.data.products.nodes,
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

    if (stockLimitProduct) {
      await assertRouteAvailable({
        storefrontBaseUrl,
        path: stockLimitProduct.path,
        reason: `Make sure you have a route handler for ${stockLimitProduct.path}`,
      });
    }

    return {
      data: { paths: CART_PATHS, products: cartEnabledProducts, stockLimitProduct },
    };
  },
});

function productPath(handle: string, selectedOptions: readonly SelectedOption[]): string {
  const searchParams = new URLSearchParams();
  for (const option of selectedOptions) searchParams.set(option.name, option.value);

  const query = searchParams.toString();
  const path = `/products/${handle}`;
  return query === "" ? path : `${path}?${query}`;
}

async function discoverStockLimitProduct(
  storefrontClient: StorefrontClient,
  products: readonly CartDiscoveryProduct[],
): Promise<StockLimitCartTestProduct | null> {
  const candidates = products
    .flatMap((product) => {
      if (product.requiresSellingPlan) return [];
      return product.variants.nodes
        .filter((variant) => variant.availableForSale)
        .map((variant) => ({ product, variant }));
    })
    .slice(0, STOCK_LIMIT_CANDIDATE_COUNT);

  for (const { product, variant } of candidates) {
    const cart = await storefrontClient.graphql(CREATE_STOCK_LIMIT_CART_MUTATION, {
      signal: createGraphQLDiscoverySignal(),
      variables: { merchandiseId: variant.id, quantity: STOCK_LIMIT_CART_QUANTITY },
    });
    abortOnGraphQLErrors("Stock limit cart creation", cart.errors);

    const createdCart = cart.data?.cartCreate?.cart;
    const seededLine = createdCart?.lines.nodes.find((line) => line.merchandise.id === variant.id);
    if (!createdCart || !seededLine || seededLine.quantity >= STOCK_LIMIT_CART_QUANTITY) continue;

    return {
      maxQuantity: seededLine.quantity,
      path: productPath(product.handle, variant.selectedOptions),
      productTitle: product.title,
      variantLabel: variant.title,
    };
  }

  return null;
}
