import {CachingStrategy} from '../cache/strategies';
import type {ExecutionArgs} from 'graphql';
import {Storefront} from '../storefront';
import {CacheNone} from '../cache/strategies';

export const CART_ID = 'gid://shopify/Cart/c1-123';
export const NEW_CART_ID = 'c1-new-cart-id';

function storefrontQuery(
  query: string,
  payload?: {
    variables?: ExecutionArgs['variableValues'];
    cache?: CachingStrategy;
  },
) {
  return Promise.resolve({
    cart: {
      id: payload?.variables?.cartId,
      query,
    },
  });
}

function storefrontMutate(
  query: string,
  payload?: {
    variables?: ExecutionArgs['variableValues'];
  },
) {
  let cartId = payload?.variables?.cartId as string;
  const keyWrapper: string =
    String(query.match(/mutation\s+([^\(\s]+)/i)?.[1]) || 'error';

  if (keyWrapper === 'cartCreate') {
    cartId = 'c1-new-cart-id';
  }

  if (
    keyWrapper === 'cartMetafieldsSet' ||
    keyWrapper === 'cartMetafieldDelete'
  ) {
    return Promise.resolve({
      [keyWrapper]: {
        userErrors: [query],
      },
    });
  } else {
    return Promise.resolve({
      [keyWrapper]: {
        cart: {
          id: cartId,
        },
        userErrors: [query],
      },
    });
  }
}

export function mockHeaders(cartId?: string) {
  return new Headers({
    Cookie: cartId ? `cart=${cartId}` : '',
  });
}

export function mockCreateStorefrontClient() {
  return {
    query: storefrontQuery,
    mutate: storefrontMutate,
    CacheNone: CacheNone,
  } as Storefront;
}
