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
  let keyWrapper: string = 'error';
  if (/mutation CartCreate/.test(query)) {
    keyWrapper = 'cartCreate';
    cartId = 'c1-new-cart-id';
  } else if (/mutation CartLinesAdd/.test(query)) {
    keyWrapper = 'cartLinesAdd';
  } else if (/mutation CartLinesUpdate/.test(query)) {
    keyWrapper = 'cartLinesUpdate';
  } else if (/mutation CartLinesRemove/.test(query)) {
    keyWrapper = 'cartLinesRemove';
  } else if (/mutation cartDiscountCodesUpdate/.test(query)) {
    keyWrapper = 'cartDiscountCodesUpdate';
  } else if (/mutation cartBuyerIdentityUpdate/.test(query)) {
    keyWrapper = 'cartBuyerIdentityUpdate';
  } else if (/mutation cartNoteUpdate/.test(query)) {
    keyWrapper = 'cartNoteUpdate';
  } else if (/mutation cartSelectedDeliveryOptionsUpdate/.test(query)) {
    keyWrapper = 'cartSelectedDeliveryOptionsUpdate';
  } else if (/mutation cartAttributesUpdate/.test(query)) {
    keyWrapper = 'cartAttributesUpdate';
  } else if (/mutation cartMetafieldsSet/.test(query)) {
    keyWrapper = 'cartMetafieldsSet';
  } else if (/mutation cartMetafieldDelete/.test(query)) {
    keyWrapper = 'cartMetafieldDelete';
  }

  return Promise.resolve({
    [keyWrapper]: {
      cart: {
        id: cartId,
      },
      errors: [query],
    },
  });
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
