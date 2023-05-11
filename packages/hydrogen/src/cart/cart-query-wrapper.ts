import {
  CART_QUERY,
  CART_LINES_ADD_MUTATION,
  CART_CREATE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_DISCOUNT_CODE_UPDATE_MUTATION,
  CART_BUYER_IDENTITY_UPDATE_MUTATION,
  CART_METAFIELD_DELETE_MUTATION,
  CART_METAFIELD_SET_MUTATION,
  CART_NOTE_UPDATE_MUTATION,
  CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION,
} from './cart-queries';
import type {Storefront} from '../storefront';
import type {
  CartBuyerIdentityUpdate,
  CartCreate,
  CartDiscountCodesUpdate,
  CartFormInput,
  CartLinesAdd,
  CartLinesRemove,
  CartLinesUpdate,
  CartMetafieldDelete,
  CartMetafieldsSet,
  CartNoteUpdate,
  CartSelectedDeliveryOptionsUpdate,
} from './cart-types';
import type {
  Cart,
  CartUserError,
  CartMetafieldsSetInput,
  Metafield,
  MetafieldsSetUserError,
  Scalars,
} from '@shopify/hydrogen-react/storefront-api-types';

export type CartQueryOptions = {
  storefront: Storefront;
  getCartId: () => string | undefined;
  cartQueryFragment?: string;
  cartMutateFragment?: string;
};

type CartQueryData = {
  cart: Cart;
  errors?: CartUserError[] | MetafieldsSetUserError[];
};

export type CartQueryReturn<T> = (cartInput: T) => Promise<CartQueryData>;

function getInputs(cartInput: CartFormInput): Omit<CartFormInput, 'action'> {
  const {action, ...restOfInputs} = cartInput;
  return restOfInputs;
}

export function cartGetDefault(
  options: CartQueryOptions,
): (cartInput?: CartFormInput) => Promise<Cart | null | undefined> {
  return async (cartInput?: CartFormInput) => {
    const cartId = options.getCartId();

    if (!cartId) return null;

    const {cart} = await options.storefront.query<{cart?: Cart}>(
      CART_QUERY(options.cartQueryFragment),
      {
        variables: {
          cartId,
          ...getInputs(cartInput || {action: 'CartGet'}),
        },
        cache: options.storefront.CacheNone(),
      },
    );

    return cart;
  };
}

export function cartCreateDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartCreate> {
  return async (cartInput: CartCreate) => {
    const {cartCreate} = await options.storefront.mutate<{
      cartCreate: CartQueryData;
    }>(CART_CREATE_MUTATION(options.cartMutateFragment), {
      variables: getInputs(cartInput),
    });
    return cartCreate;
  };
}

export function cartLinesAddDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartLinesAdd> {
  return async (cartInput: CartLinesAdd) => {
    const {cartLinesAdd} = await options.storefront.mutate<{
      cartLinesAdd: CartQueryData;
    }>(CART_LINES_ADD_MUTATION(options.cartMutateFragment), {
      variables: {
        cartId: options.getCartId(),
        ...getInputs(cartInput),
      },
    });
    return cartLinesAdd;
  };
}

export function cartLinesUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartLinesUpdate> {
  return async (cartInput: CartLinesUpdate) => {
    const {cartLinesUpdate} = await options.storefront.mutate<{
      cartLinesUpdate: CartQueryData;
    }>(CART_LINES_UPDATE_MUTATION(options.cartMutateFragment), {
      variables: {
        cartId: options.getCartId(),
        ...getInputs(cartInput),
      },
    });
    return cartLinesUpdate;
  };
}

export function cartLinesRemoveDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartLinesRemove> {
  return async (cartInput: CartLinesRemove) => {
    const {cartLinesRemove} = await options.storefront.mutate<{
      cartLinesRemove: CartQueryData;
    }>(CART_LINES_REMOVE_MUTATION(options.cartMutateFragment), {
      variables: {
        cartId: options.getCartId(),
        ...getInputs(cartInput),
      },
    });
    return cartLinesRemove;
  };
}

export function cartDiscountCodesUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartDiscountCodesUpdate> {
  return async (cartInput: CartDiscountCodesUpdate) => {
    const {cartDiscountCodesUpdate} = await options.storefront.mutate<{
      cartDiscountCodesUpdate: CartQueryData;
    }>(CART_DISCOUNT_CODE_UPDATE_MUTATION(options.cartMutateFragment), {
      variables: {
        cartId: options.getCartId(),
        ...getInputs(cartInput),
      },
    });
    return cartDiscountCodesUpdate;
  };
}

export function cartBuyerIdentityUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartBuyerIdentityUpdate> {
  return async (cartInput: CartBuyerIdentityUpdate) => {
    const {cartBuyerIdentityUpdate} = await options.storefront.mutate<{
      cartBuyerIdentityUpdate: CartQueryData;
    }>(CART_BUYER_IDENTITY_UPDATE_MUTATION(options.cartMutateFragment), {
      variables: {
        cartId: options.getCartId(),
        ...getInputs(cartInput),
      },
    });
    return cartBuyerIdentityUpdate;
  };
}

export function cartNoteUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartNoteUpdate> {
  return async (cartInput: CartNoteUpdate) => {
    const {cartNoteUpdate} = await options.storefront.mutate<{
      cartNoteUpdate: CartQueryData;
    }>(CART_NOTE_UPDATE_MUTATION(options.cartMutateFragment), {
      variables: {
        cartId: options.getCartId(),
        ...getInputs(cartInput),
      },
    });
    return cartNoteUpdate;
  };
}

export function cartSelectedDeliveryOptionsUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartSelectedDeliveryOptionsUpdate> {
  return async (cartInput: CartSelectedDeliveryOptionsUpdate) => {
    const {cartSelectedDeliveryOptionsUpdate} =
      await options.storefront.mutate<{
        cartSelectedDeliveryOptionsUpdate: CartQueryData;
      }>(
        CART_SELECTED_DELIVERY_OPTIONS_UPDATE_MUTATION(
          options.cartMutateFragment,
        ),
        {
          variables: {
            cartId: options.getCartId(),
            ...getInputs(cartInput),
          },
        },
      );
    return cartSelectedDeliveryOptionsUpdate;
  };
}

type MetafieldsQueryData = {
  metafields: Metafield;
  errors: MetafieldsSetUserError[];
};

export function cartMetafieldsSetDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartMetafieldsSet> {
  return async (cartInput: CartMetafieldsSet) => {
    const cartId = options.getCartId();
    const metafields = cartInput.metafields.map(
      (metafield: Omit<CartMetafieldsSetInput, 'ownerId'>) => ({
        ...metafield,
        ownerId: cartId,
      }),
    );
    const {cartMetafieldsSet} = await options.storefront.mutate<{
      cartMetafieldsSet: MetafieldsQueryData;
    }>(CART_METAFIELD_SET_MUTATION(), {
      variables: {metafields},
    });

    return {
      cart: {
        id: cartId,
        metafields: cartMetafieldsSet.metafields as unknown as Metafield[],
      } as Cart,
      errors: cartMetafieldsSet.errors as unknown as MetafieldsSetUserError[],
    };
  };
}

type MetafieldsDeleteData = {
  deletedId: Scalars['String'];
  errors: MetafieldsSetUserError[];
};

export function cartMetafieldDeleteDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartMetafieldDelete> {
  return async (cartInput: CartMetafieldDelete) => {
    const cartId = options.getCartId();
    const {cartMetafieldDelete} = await options.storefront.mutate<{
      cartMetafieldDelete: MetafieldsDeleteData;
    }>(CART_METAFIELD_DELETE_MUTATION(), {
      variables: {
        input: {
          ownerId: cartId,
          key: cartInput.key,
        },
      },
    });
    return {
      cart: {
        id: cartId,
      } as Cart,
      errors: cartMetafieldDelete.errors as unknown as MetafieldsSetUserError[],
    };
  };
}
