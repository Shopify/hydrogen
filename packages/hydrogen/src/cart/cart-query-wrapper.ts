import {
  DEFAULT_CART_FRAGMENT,
  MINIMAL_CART_FRAGMENT,
  CartQuery,
  CartLinesAdd,
  CartCreate,
} from './cart-queries';
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
  cartFragment?: string;
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
): (cartInput: CartFormInput) => Promise<Cart | null | undefined> {
  return async (cartInput: CartFormInput) => {
    const cartId = options.getStoredCartId();

    if (!cartId) return null;

    const {cart} = await options.storefront.query<{cart?: Cart}>(
      CartQuery(options.cartFragment || DEFAULT_CART_FRAGMENT),
      {
        variables: {
          cartId,
          numCartLines: cartInput.numCartLines || 100,
        },
        cache: options.storefront.CacheNone(),
      },
    );

    return cart;
  };
}

export function cartCreateDefault(options: CartQueryOptions): CartQueryReturn {
  return async (cartInput: CartFormInput) => {
    const {cartCreate} = await options.storefront.mutate<{
      cartCreate: CartQueryData;
    }>(CartCreate(options.cartFragment || MINIMAL_CART_FRAGMENT), {
      variables: cartInput,
    });
    return cartCreate;
  };
}

export function cartLinesAddDefault(
  options: CartQueryOptions,
): CartQueryReturn {
  return async (cartInput: CartFormInput) => {
    const {cartLinesAdd} = await options.storefront.mutate<{
      cartLinesAdd: CartQueryData;
    }>(CartLinesAdd(options.cartFragment || MINIMAL_CART_FRAGMENT), {
      variables: {
        cartId: options.getStoredCartId(),
        ...cartInput,
      },
    });
    return cartLinesAdd;
  };
}
