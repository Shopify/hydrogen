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
  CART_ATTRIBUTES_UPDATE_MUTATION,
} from './cart-queries';
import type {Storefront} from '../storefront';
import type {
  CartGet,
  CartOptionalInput,
  MetafieldWithoutOwnerId,
} from './cart-types';
import type {
  Cart,
  CartUserError,
  MetafieldsSetUserError,
  Scalars,
  AttributeInput,
  CartInput,
  CartLineInput,
  CartBuyerIdentityInput,
  CartLineUpdateInput,
  CartSelectedDeliveryOptionInput,
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

export type CartQueryReturn<T> = (
  requiredParams: T,
  optionalParams?: CartOptionalInput,
) => Promise<CartQueryData>;

export function cartGetDefault(
  options: CartQueryOptions,
): (cartInput?: CartGet) => Promise<Cart | null | undefined> {
  return async (cartInput?: CartGet) => {
    const cartId = options.getCartId();

    if (!cartId) return null;

    const {cart} = await options.storefront.query<{cart?: Cart}>(
      CART_QUERY(options.cartQueryFragment),
      {
        variables: {
          cartId,
          ...cartInput,
        },
        cache: options.storefront.CacheNone(),
      },
    );

    return cart;
  };
}

export function cartCreateDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartInput> {
  return async (input, optionalParams) => {
    const {cartId, ...restOfOptionalParams} = optionalParams || {};
    const {cartCreate} = await options.storefront.mutate<{
      cartCreate: CartQueryData;
    }>(CART_CREATE_MUTATION(options.cartMutateFragment), {
      variables: {
        input,
        ...restOfOptionalParams,
      },
    });
    return cartCreate;
  };
}

export function cartLinesAddDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartLineInput[]> {
  return async (lines, optionalParams) => {
    const {cartLinesAdd} = await options.storefront.mutate<{
      cartLinesAdd: CartQueryData;
    }>(CART_LINES_ADD_MUTATION(options.cartMutateFragment), {
      variables: {
        cartId: options.getCartId(),
        lines,
        ...optionalParams,
      },
    });
    return cartLinesAdd;
  };
}

export function cartLinesUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartLineUpdateInput[]> {
  return async (lines, optionalParams) => {
    const {cartLinesUpdate} = await options.storefront.mutate<{
      cartLinesUpdate: CartQueryData;
    }>(CART_LINES_UPDATE_MUTATION(options.cartMutateFragment), {
      variables: {
        cartId: options.getCartId(),
        lines,
        ...optionalParams,
      },
    });
    return cartLinesUpdate;
  };
}

export function cartLinesRemoveDefault(
  options: CartQueryOptions,
): CartQueryReturn<string[]> {
  return async (lineIds, optionalParams) => {
    const {cartLinesRemove} = await options.storefront.mutate<{
      cartLinesRemove: CartQueryData;
    }>(CART_LINES_REMOVE_MUTATION(options.cartMutateFragment), {
      variables: {
        cartId: options.getCartId(),
        lineIds,
        ...optionalParams,
      },
    });
    return cartLinesRemove;
  };
}

export function cartDiscountCodesUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn<string[]> {
  return async (discountCodes, optionalParams) => {
    const {cartDiscountCodesUpdate} = await options.storefront.mutate<{
      cartDiscountCodesUpdate: CartQueryData;
    }>(CART_DISCOUNT_CODE_UPDATE_MUTATION(options.cartMutateFragment), {
      variables: {
        cartId: options.getCartId(),
        discountCodes,
        ...optionalParams,
      },
    });
    return cartDiscountCodesUpdate;
  };
}

export function cartBuyerIdentityUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartBuyerIdentityInput> {
  return async (buyerIdentity, optionalParams) => {
    const {cartBuyerIdentityUpdate} = await options.storefront.mutate<{
      cartBuyerIdentityUpdate: CartQueryData;
    }>(CART_BUYER_IDENTITY_UPDATE_MUTATION(options.cartMutateFragment), {
      variables: {
        cartId: options.getCartId(),
        buyerIdentity,
        ...optionalParams,
      },
    });
    return cartBuyerIdentityUpdate;
  };
}

export function cartNoteUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn<string> {
  return async (note, optionalParams) => {
    const {cartNoteUpdate} = await options.storefront.mutate<{
      cartNoteUpdate: CartQueryData;
    }>(CART_NOTE_UPDATE_MUTATION(options.cartMutateFragment), {
      variables: {
        cartId: options.getCartId(),
        note,
        ...optionalParams,
      },
    });
    return cartNoteUpdate;
  };
}

export function cartSelectedDeliveryOptionsUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn<CartSelectedDeliveryOptionInput> {
  return async (selectedDeliveryOptions, optionalParams) => {
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
            selectedDeliveryOptions,
            ...optionalParams,
          },
        },
      );
    return cartSelectedDeliveryOptionsUpdate;
  };
}

export function cartAttributesUpdateDefault(
  options: CartQueryOptions,
): CartQueryReturn<AttributeInput[]> {
  return async (attributes, optionalParams) => {
    const {cartAttributesUpdate} = await options.storefront.mutate<{
      cartAttributesUpdate: CartQueryData;
    }>(CART_ATTRIBUTES_UPDATE_MUTATION(options.cartMutateFragment), {
      variables: {
        cartId: optionalParams?.cartId || options.getCartId(),
        attributes,
      },
    });
    return cartAttributesUpdate;
  };
}

type MetafieldsQueryData = {
  errors: MetafieldsSetUserError[];
};

export function cartMetafieldsSetDefault(
  options: CartQueryOptions,
): CartQueryReturn<MetafieldWithoutOwnerId[]> {
  return async (metafields, optionalParams) => {
    const ownerId = optionalParams?.cartId || options.getCartId();
    const metafieldsWithOwnerId = metafields.map(
      (metafield: MetafieldWithoutOwnerId) => ({
        ...metafield,
        ownerId,
      }),
    );
    const {cartMetafieldsSet} = await options.storefront.mutate<{
      cartMetafieldsSet: MetafieldsQueryData;
    }>(CART_METAFIELD_SET_MUTATION(), {
      variables: {metafields: metafieldsWithOwnerId},
    });

    return {
      cart: {
        id: ownerId,
      } as Cart,
      errors: cartMetafieldsSet.errors as unknown as MetafieldsSetUserError[],
    };
  };
}

export function cartMetafieldDeleteDefault(
  options: CartQueryOptions,
): CartQueryReturn<Scalars['String']> {
  return async (key, optionalParams) => {
    const ownerId = optionalParams?.cartId || options.getCartId();
    const {cartMetafieldDelete} = await options.storefront.mutate<{
      cartMetafieldDelete: MetafieldsQueryData;
    }>(CART_METAFIELD_DELETE_MUTATION(), {
      variables: {
        input: {
          ownerId,
          key,
        },
      },
    });
    return {
      cart: {
        id: ownerId,
      } as Cart,
      errors: cartMetafieldDelete.errors as unknown as MetafieldsSetUserError[],
    };
  };
}
