// @ts-nocheck

import {getFormInput} from './CartForm';
import {
  type CartQueryOptions,
  type CartQueryData,
  cartCreateDefault,
  cartGetDefault,
  cartLinesAddDefault,
  cartLinesUpdateDefault,
  cartLinesRemoveDefault,
  cartDiscountCodesUpdateDefault,
  cartBuyerIdentityUpdateDefault,
  cartNoteUpdateDefault,
  cartSelectedDeliveryOptionsUpdateDefault,
} from './cart-query-wrapper';
import type {CartFormInput} from './cart-types';
import {Cart} from '@shopify/hydrogen/storefront-api-types';
import {parse as parseCookie} from 'worktop/cookie';

type CartApiOptions = Omit<CartQueryOptions, 'getCartId'> & {
  request: Request;
  getCartId?: () => string | undefined;
  setCartId?: (cartId: string, headers: Headers) => void;
};

type CartDataPromise = Promise<CartQueryData>;

export type CartApiReturn = {
  getFormInput: (formData: any) => Omit<CartFormInput, 'action'>;
  get: (cartInput?: CartFormInput) => Promise<Cart | null | undefined>;
  getCartId: () => string | undefined;
  setCartId: (cartId: string, headers: Headers) => void;
  create: (cartInput: CartFormInput) => CartDataPromise;
  addLine: (cartInput: CartFormInput) => CartDataPromise;
  updateLines: (cartInput: CartFormInput) => CartDataPromise;
  removeLines: (cartInput: CartFormInput) => CartDataPromise;
  updateDiscountCodes: (cartInput: CartFormInput) => CartDataPromise;
  updateBuyerIdentity: (cartInput: CartFormInput) => CartDataPromise;
  updateNote: (cartInput: CartFormInput) => CartDataPromise;
  updateSelectedDeliveryOption: (cartInput: CartFormInput) => CartDataPromise;
};

export function CartApi(options: CartApiOptions): CartApiReturn {
  const {request} = options;

  // Default get cartId in cookie
  const getCartId =
    options.getCartId ||
    (() => {
      const cookies = parseCookie(request.headers.get('Cookie') || '');
      return cookies.cart ? `gid://shopify/Cart/${cookies.cart}` : undefined;
    });

  // Default set cartId in cookie
  const setCartId =
    options.setCartId ||
    ((cartId: string, headers: Headers) => {
      headers.append('Set-Cookie', `cart=${cartId.split('/').pop()}`);
    });

  const queryOptions = {
    storefront: options.storefront,
    getCartId,
  };

  const cartId = getCartId();
  const cartCreate = cartCreateDefault(queryOptions);

  return {
    getFormInput,
    get: cartGetDefault(queryOptions),
    getCartId,
    setCartId,
    create: cartCreate,
    addLine: async (cartInput: CartFormInput) => {
      return cartId
        ? await cartLinesAddDefault(queryOptions)({lines: cartInput.lines})
        : await cartCreate({input: {lines: cartInput.lines}});
    },
    updateLines: cartLinesUpdateDefault(queryOptions),
    removeLines: cartLinesRemoveDefault(queryOptions),
    updateDiscountCodes: async (cartInput: CartFormInput) => {
      return cartId
        ? await cartDiscountCodesUpdateDefault(queryOptions)({
            discountCodes: cartInput.discountCodes,
          })
        : await cartCreate({input: {discountCodes: cartInput.discountCodes}});
    },
    updateBuyerIdentity: async (cartInput: CartFormInput) => {
      return cartId
        ? await cartBuyerIdentityUpdateDefault(queryOptions)({
            buyerIdentity: cartInput.buyerIdentity,
          })
        : await cartCreate({input: {buyerIdentity: cartInput.buyerIdentity}});
    },
    updateNote: cartNoteUpdateDefault(queryOptions),
    updateSelectedDeliveryOption:
      cartSelectedDeliveryOptionsUpdateDefault(queryOptions),
  };
}
