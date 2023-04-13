import {
  CART_FRAGMENT_BASIC,
  CART_FRAGMENT_DEFAULT,
  CartQuery,
  CartCreate,
  CartLineAdd,
} from '@shopify/hydrogen-react';
import type {Storefront} from '../storefront';
import type {CartFormInput} from './cart-types';
import type {
  Cart,
  CartUserError,
} from '@shopify/hydrogen-react/storefront-api-types';

export type CartQueryOptions = {
  storefront: Storefront;
  getStoredCartId: () => string | undefined;
  query?: string;
  variables?: Record<string, unknown>;
};

export type CartQueryData = {
  cart: Cart;
  errors?: CartUserError;
};

export type CartQueryReturn = (
  cartInput: CartFormInput,
) => Promise<CartQueryData>;
export type CartQueryFunction = (options: CartQueryOptions) => CartQueryReturn;

export function cartGetDefault(
  options: CartQueryOptions,
): () => Promise<Cart | null | undefined> {
  return async () => {
    const cartId = options.getStoredCartId();

    if (!cartId) return null;

    const {cart} = await options.storefront.query<{cart?: Cart}>(
      options.query || CartQuery(CART_FRAGMENT_DEFAULT),
      {
        variables: options.variables || {
          id: cartId,
          country: options.storefront.i18n.country,
        },
        cache: options.storefront.CacheNone(),
      },
    );

    return cart;
  };
}

export function cartCreateDefault(options: CartQueryOptions): CartQueryReturn {
  return (cartInput: CartFormInput) => {
    return options.storefront.mutate<CartQueryData>(
      options.query || CartCreate(CART_FRAGMENT_BASIC),
      {
        variables: cartInput,
      },
    );
  };
}

export function cartLineAddDefault(options: CartQueryOptions): CartQueryReturn {
  return (cartInput: CartFormInput) => {
    return options.storefront.mutate<CartQueryData>(
      options.query || CartLineAdd(CART_FRAGMENT_BASIC),
      {
        variables: cartInput,
      },
    );
  };
}
