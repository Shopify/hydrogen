import {
  CART_QUERY,
  CART_LINES_ADD_MUTATION,
  CART_CREATE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_DISCOUNT_CODE_UPDATE_MUTATION,
  CART_BUYER_IDENTITY_UPDATE_MUTATION,
} from './cart-queries';
import type {Storefront} from '../storefront';
import type {CartFormInput} from './cart-types';
import type {
  Cart,
  CartUserError,
} from '@shopify/hydrogen-react/storefront-api-types';

export type CartQueryOptions = {
  storefront: Storefront;
  getCartId: () => string | undefined;
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
): (cartInput?: CartFormInput) => Promise<Cart | null | undefined> {
  return async (cartInput?: CartFormInput) => {
    const cartId = options.getCartId();

    if (!cartId) return null;

    const {cart} = await options.storefront.query<{cart?: Cart}>(CART_QUERY, {
      variables: {
        cartId,
        numCartLines: cartInput?.numCartLines || 100,
      },
      cache: options.storefront.CacheNone(),
    });

    return cart;
  };
}

export function cartCreateDefault(options: CartQueryOptions): CartQueryReturn {
  return async (cartInput: CartFormInput) => {
    const {cartCreate} = await options.storefront.mutate<{
      cartCreate: CartQueryData;
    }>(CART_CREATE_MUTATION, {
      variables: cartInput,
    });
    console.log(cartCreate);
    return cartCreate;
  };
}

/**
 * Storefront API cartLinesAdd mutation
 * @param lines [CartLineInput!]! https://shopify.dev/docs/api/storefront/2023-04/input-objects/CartLineInput
 * @see https://shopify.dev/docs/api/storefront/2023-04/mutations/cartLinesAdd
 * @returns result {cart, errors}
 * @preserve
 */
export function cartLinesAddDefault(
  options: CartQueryOptions,
): CartQueryReturn {
  return async (cartInput: CartFormInput) => {
    const {cartLinesAdd} = await options.storefront.mutate<{
      cartLinesAdd: CartQueryData;
    }>(CART_LINES_ADD_MUTATION, {
      variables: {
        cartId: options.getCartId(),
        ...cartInput,
      },
    });
    return cartLinesAdd;
  };
}

/**
 * Storefront API cartLinesUpdate mutation
 * @param lines [CartLineUpdateInput!]! https://shopify.dev/docs/api/storefront/2023-04/input-objects/CartLineUpdateInput
 * @see https://shopify.dev/docs/api/storefront/2023-04/mutations/cartLinesUpdate
 * @returns result {cart, errors}
 * @preserve
 */
export function cartLinesUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn {
  return async (cartInput: CartFormInput) => {
    const {cartLinesUpdate} = await options.storefront.mutate<{
      cartLinesUpdate: CartQueryData;
    }>(CART_LINES_UPDATE_MUTATION, {
      variables: {
        cartId: options.getCartId(),
        ...cartInput,
      },
    });
    return cartLinesUpdate;
  };
}

/**
 * Storefront API cartLinesRemove mutation
 * @param lineIds [ID!]! an array of cart line ids to remove
 * @see https://shopify.dev/docs/api/storefront/2023-04/mutations/cartLinesRemove
 * @returns result {cart, errors}
 * @preserve
 */
export function cartLinesRemoveDefault(
  options: CartQueryOptions,
): CartQueryReturn {
  return async (cartInput: CartFormInput) => {
    const {cartLinesRemove} = await options.storefront.mutate<{
      cartLinesRemove: CartQueryData;
    }>(CART_LINES_REMOVE_MUTATION, {
      variables: {
        cartId: options.getCartId(),
        ...cartInput,
      },
    });
    return cartLinesRemove;
  };
}

/**
 * Storefront API cartDiscountCodesUpdate mutation
 * @param discountCodes [String!] an array of codes to remove
 * @see https://shopify.dev/docs/api/storefront/2023-04/mutations/cartDiscountCodesUpdate
 * @returns result {cart, errors}
 * @preserve
 */
export function cartDiscountCodesUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn {
  return async (cartInput: CartFormInput) => {
    console.log('cartDiscountCodesUpdateDefault', cartInput);
    const {cartDiscountCodesUpdate} = await options.storefront.mutate<{
      cartDiscountCodesUpdate: CartQueryData;
    }>(CART_DISCOUNT_CODE_UPDATE_MUTATION, {
      variables: {
        cartId: options.getCartId(),
        ...cartInput,
      },
    });
    console.log(cartDiscountCodesUpdate);
    return cartDiscountCodesUpdate;
  };
}

/**
 *
 * @param options
 * @returns
 */
export function cartBuyerIdentityUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn {
  return async (cartInput: CartFormInput) => {
    console.log('cartBuyerIdentityUpdateDefault', cartInput);
    const {cartBuyerIdentityUpdate} = await options.storefront.mutate<{
      cartBuyerIdentityUpdate: CartQueryData;
    }>(CART_BUYER_IDENTITY_UPDATE_MUTATION, {
      variables: {
        cartId: options.getCartId(),
        ...cartInput,
      },
    });
    return cartBuyerIdentityUpdate;
  };
}
