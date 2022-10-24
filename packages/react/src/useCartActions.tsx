import {useCallback, useMemo} from 'react';
import {
  AttributeInput,
  CartBuyerIdentityInput,
  CartInput,
  CartLineInput,
  CartLineUpdateInput,
  CountryCode,
  Cart as CartType,
  MutationCartDiscountCodesUpdateArgs,
  MutationCartNoteUpdateArgs,
} from './storefront-api-types.js';
import {
  CartAttributesUpdate,
  CartBuyerIdentityUpdate,
  CartCreate,
  CartDiscountCodesUpdate,
  CartLineAdd,
  CartLineRemove,
  CartLineUpdate,
  CartNoteUpdate,
  CartQuery,
} from './cart-queries.js';
import {useCartFetch} from './cart-hooks.js';
import {PartialDeep} from 'type-fest';

type CartResponse = PartialDeep<CartType, {recurseIntoArrays: true}>;

/**
 * The `useCartActions` hook returns helper graphql functions for Storefront Cart API
 *
 * See [cart API graphql mutations](https://shopify.dev/api/storefront/2022-10/objects/Cart)
 */
export function useCartActions({
  numCartLines,
  cartFragment,
  countryCode = 'US',
}: {
  /**  Maximum number of cart lines to fetch. Defaults to 250 cart lines. */
  numCartLines?: number;
  /** A fragment used to query the Storefront API's [Cart object](https://shopify.dev/api/storefront/latest/objects/cart) for all queries and mutations. A default value is used if no argument is provided. */
  cartFragment: string;
  /** The ISO country code for i18n. */
  countryCode?: CountryCode;
}) {
  const fetchCart = useCartFetch();

  const cartFetch = useCallback(
    (cartId: string) => {
      return fetchCart<{cart: CartResponse}>({
        query: CartQuery(cartFragment),
        variables: {
          id: cartId,
          numCartLines,
          country: countryCode,
        },
      });
    },
    [fetchCart, cartFragment, numCartLines, countryCode]
  );

  const cartCreate = useCallback(
    (cart: CartInput) => {
      return fetchCart<{cartCreate: {cart: CartResponse}}>({
        query: CartCreate(cartFragment),
        variables: {
          input: cart,
          numCartLines,
          country: countryCode,
        },
      });
    },
    [cartFragment, countryCode, fetchCart, numCartLines]
  );

  const cartLineAdd = useCallback(
    (cartId: string, lines: CartLineInput[]) => {
      return fetchCart<{cartLinesAdd: {cart: CartResponse}}>({
        query: CartLineAdd(cartFragment),
        variables: {
          cartId,
          lines,
          numCartLines,
          country: countryCode,
        },
      });
    },
    [cartFragment, countryCode, fetchCart, numCartLines]
  );

  const cartLineUpdate = useCallback(
    (cartId: string, lines: CartLineUpdateInput[]) => {
      return fetchCart<{cartLinesUpdate: {cart: CartResponse}}>({
        query: CartLineUpdate(cartFragment),
        variables: {
          cartId,
          lines,
          numCartLines,
          country: countryCode,
        },
      });
    },
    [cartFragment, countryCode, fetchCart, numCartLines]
  );

  const cartLineRemove = useCallback(
    (cartId: string, lines: string[]) => {
      return fetchCart<{cartLinesRemove: {cart: CartResponse}}>({
        query: CartLineRemove(cartFragment),
        variables: {
          cartId,
          lines,
          numCartLines,
          country: countryCode,
        },
      });
    },
    [cartFragment, countryCode, fetchCart, numCartLines]
  );

  const noteUpdate = useCallback(
    (cartId: string, note: MutationCartNoteUpdateArgs['note']) => {
      return fetchCart<{cartNoteUpdate: {cart: CartResponse}}>({
        query: CartNoteUpdate(cartFragment),
        variables: {
          cartId,
          note,
          numCartLines,
          country: countryCode,
        },
      });
    },
    [fetchCart, cartFragment, numCartLines, countryCode]
  );

  const buyerIdentityUpdate = useCallback(
    (cartId: string, buyerIdentity: CartBuyerIdentityInput) => {
      return fetchCart<{cartBuyerIdentityUpdate: {cart: CartResponse}}>({
        query: CartBuyerIdentityUpdate(cartFragment),
        variables: {
          cartId,
          buyerIdentity,
          numCartLines,
          country: countryCode,
        },
      });
    },
    [cartFragment, countryCode, fetchCart, numCartLines]
  );

  const cartAttributesUpdate = useCallback(
    (cartId: string, attributes: AttributeInput[]) => {
      return fetchCart<{cartAttributesUpdate: {cart: CartResponse}}>({
        query: CartAttributesUpdate(cartFragment),
        variables: {
          cartId,
          attributes,
          numCartLines,
          country: countryCode,
        },
      });
    },
    [cartFragment, countryCode, fetchCart, numCartLines]
  );

  const discountCodesUpdate = useCallback(
    (
      cartId: string,
      discountCodes: MutationCartDiscountCodesUpdateArgs['discountCodes']
    ) => {
      return fetchCart<{cartDiscountCodesUpdate: {cart: CartResponse}}>({
        query: CartDiscountCodesUpdate(cartFragment),
        variables: {
          cartId,
          discountCodes,
          numCartLines,
          country: countryCode,
        },
      });
    },
    [cartFragment, countryCode, fetchCart, numCartLines]
  );

  return useMemo(
    () => ({
      cartFetch,
      cartCreate,
      cartLineAdd,
      cartLineUpdate,
      cartLineRemove,
      noteUpdate,
      buyerIdentityUpdate,
      cartAttributesUpdate,
      discountCodesUpdate,
      cartFragment,
    }),
    [
      cartFetch,
      cartCreate,
      cartLineAdd,
      cartLineUpdate,
      cartLineRemove,
      noteUpdate,
      buyerIdentityUpdate,
      cartAttributesUpdate,
      discountCodesUpdate,
      cartFragment,
    ]
  );
}
