import {
  CART_QUERY,
  CART_LINES_ADD_MUTATION,
  CART_CREATE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_DISCOUNT_CODE_UPDATE_MUTATION,
  CART_BUYER_IDENTITY_UPDATE_MUTATION,
  CART_NOTE_UPDATE_MUTATION,
  CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION,
} from './cart-queries';
import type {Storefront} from '../storefront';
import type {CartCreate, CartFormInput} from './cart-types';
import type {
  Cart,
  CartUserError,
} from '@shopify/hydrogen-react/storefront-api-types';

export type CartQueryOptions = {
  storefront: Storefront;
  getCartId: () => string | undefined;
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

export function cartDiscountCodesUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn {
  return async (cartInput: CartFormInput) => {
    const {cartDiscountCodesUpdate} = await options.storefront.mutate<{
      cartDiscountCodesUpdate: CartQueryData;
    }>(CART_DISCOUNT_CODE_UPDATE_MUTATION, {
      variables: {
        cartId: options.getCartId(),
        ...cartInput,
      },
    });
    return cartDiscountCodesUpdate;
  };
}

export function cartBuyerIdentityUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn {
  return async (cartInput: CartFormInput) => {
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

export function cartNoteUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn {
  return async (cartInput: CartFormInput) => {
    const {cartNoteUpdate} = await options.storefront.mutate<{
      cartNoteUpdate: CartQueryData;
    }>(CART_NOTE_UPDATE_MUTATION, {
      variables: {
        cartId: options.getCartId(),
        ...cartInput,
      },
    });
    return cartNoteUpdate;
  };
}

export function cartSelectedDeliveryOptionsUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn {
  return async (cartInput: CartFormInput) => {
    const {cartSelectedDeliveryOptionsUpdate} =
      await options.storefront.mutate<{
        cartSelectedDeliveryOptionsUpdate: CartQueryData;
      }>(CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION, {
        variables: {
          cartId: options.getCartId(),
          ...cartInput,
        },
      });
    return cartSelectedDeliveryOptionsUpdate;
  };
}
