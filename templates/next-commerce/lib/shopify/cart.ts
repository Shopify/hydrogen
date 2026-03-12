/**
 * Cart operations powered by @shopify/hydrogen/cart factories.
 *
 * The hydrogen factories provide the GraphQL queries/mutations and
 * factory infrastructure. The real Hydrogen storefront client from
 * createStorefrontClient satisfies the cart factory interface directly,
 * eliminating the need for a manual adapter.
 *
 * We use custom cart fragments (instead of the defaults) to include
 * `featuredImage` and `productType` on the product, which the cart
 * modal UI needs for display.
 */

import {TAGS} from 'lib/constants';
import {
  unstable_cacheLife as cacheLife,
  unstable_cacheTag as cacheTag,
} from 'next/cache';
import {cookies} from 'next/headers';
import {
  cartGetDefault,
  cartCreateDefault,
  cartLinesAddDefault,
  cartLinesRemoveDefault,
  cartLinesUpdateDefault,
} from '@shopify/hydrogen/cart';
import {storefront} from './index';
import type {Cart, CartItem, Connection, ShopifyCart} from './types';

// Custom cart query fragment — adds featuredImage + productType to product.
// Fragment name must be `CartApiQuery` to match the cart GET query wrapper.
const CART_QUERY_FRAGMENT = `#graphql
  fragment CartApiQuery on Cart {
    id
    checkoutUrl
    totalQuantity
    lines(first: $numCartLines) {
      edges {
        node {
          id
          quantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              title
              selectedOptions {
                name
                value
              }
              product {
                id
                handle
                title
                vendor
                productType
                featuredImage {
                  url
                  altText
                  width
                  height
                }
              }
            }
          }
        }
      }
    }
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
    }
  }
`;

// Custom cart mutation fragment — adds featuredImage + productType to product.
// Fragment name must be `CartApiMutation` to match the cart mutation wrappers.
const CART_MUTATION_FRAGMENT = `#graphql
  fragment CartApiMutation on Cart {
    id
    checkoutUrl
    totalQuantity
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              title
              selectedOptions {
                name
                value
              }
              product {
                id
                handle
                title
                vendor
                productType
                featuredImage {
                  url
                  altText
                  width
                  height
                }
              }
            }
          }
        }
      }
    }
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
    }
  }
`;

// -- Reshape helpers --

const removeEdgesAndNodes = <T>(array: Connection<T>): T[] => {
  return array.edges.map((edge) => edge?.node);
};

function reshapeCart(cart: ShopifyCart): Cart {
  if (!cart.cost?.totalTaxAmount) {
    cart.cost.totalTaxAmount = {
      amount: '0.0',
      currencyCode: cart.cost.totalAmount.currencyCode,
    };
  }

  return {
    ...cart,
    lines: removeEdgesAndNodes(cart.lines) as CartItem[],
  };
}

// -- Public API --
// Hydrogen factories are curried: factory(config)(options) => cartMethod
// We call them inline, passing the storefront client + cartId from cookies.

export async function getCart(): Promise<Cart | undefined> {
  'use cache: private';
  cacheTag(TAGS.cart);
  cacheLife('seconds');

  const cartId = (await cookies()).get('cartId')?.value;
  if (!cartId) return undefined;

  const result = await cartGetDefault({query: CART_QUERY_FRAGMENT})({
    storefront,
    getCartId: () => cartId,
  } as any)();

  if (!result) return undefined;
  return reshapeCart(result as unknown as ShopifyCart);
}

export async function createCart(
  lineItems?: {merchandiseId: string; quantity: number}[],
): Promise<Cart> {
  const result = await cartCreateDefault({
    mutation: CART_MUTATION_FRAGMENT,
  })({storefront, getCartId: () => undefined} as any)({
    lines: lineItems,
  } as any);

  return reshapeCart(result.cart as unknown as ShopifyCart);
}

export async function addToCart(
  lines: {merchandiseId: string; quantity: number}[],
): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value!;

  const result = await cartLinesAddDefault({
    mutation: CART_MUTATION_FRAGMENT,
  })({storefront, getCartId: () => cartId} as any)(lines as any);

  return reshapeCart(result.cart as unknown as ShopifyCart);
}

export async function removeFromCart(lineIds: string[]): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value!;

  const result = await cartLinesRemoveDefault({
    mutation: CART_MUTATION_FRAGMENT,
  })({storefront, getCartId: () => cartId} as any)(lineIds);

  return reshapeCart(result.cart as unknown as ShopifyCart);
}

export async function updateCart(
  lines: {id: string; merchandiseId: string; quantity: number}[],
): Promise<Cart> {
  const cartId = (await cookies()).get('cartId')?.value!;

  const result = await cartLinesUpdateDefault({
    mutation: CART_MUTATION_FRAGMENT,
  })({storefront, getCartId: () => cartId} as any)(lines as any);

  return reshapeCart(result.cart as unknown as ShopifyCart);
}
