import {getFormInput} from './CartForm';
import {
  type CartQueryOptions,
  type CartQueryReturn,
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
import {
  type CartBuyerIdentityUpdate,
  type CartCreate,
  type CartDiscountCodesUpdate,
  type CartFormInput,
  CartFormInputAction,
  type CartLinesAdd,
  type CartLinesRemove,
  type CartLinesUpdate,
  type CartNoteUpdate,
  type CartSelectedDeliveryOptionsUpdate,
} from './cart-types';
import {Cart} from '@shopify/hydrogen-react/storefront-api-types';
import {parse as parseCookie} from 'worktop/cookie';

type CartApiOptions = Omit<CartQueryOptions, 'getCartId'> & {
  request: Request;
  getCartId?: () => string | undefined;
  setCartId?: (cartId: string, headers: Headers) => void;
};

export type CartApiReturn = {
  getFormInput: (formData: any) => CartFormInput;
  get: (cartInput?: CartFormInput) => Promise<Cart | null | undefined>;
  getCartId: () => string | undefined;
  setCartId: (cartId: string, headers: Headers) => void;
  create: CartQueryReturn<CartCreate>;
  addLine: CartQueryReturn<CartLinesAdd>;
  updateLines: CartQueryReturn<CartLinesUpdate>;
  removeLines: CartQueryReturn<CartLinesRemove>;
  updateDiscountCodes: CartQueryReturn<CartDiscountCodesUpdate>;
  updateBuyerIdentity: CartQueryReturn<CartBuyerIdentityUpdate>;
  updateNote: CartQueryReturn<CartNoteUpdate>;
  updateSelectedDeliveryOption: CartQueryReturn<CartSelectedDeliveryOptionsUpdate>;
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
    addLine: async (cartInput: CartLinesAdd) => {
      return cartId
        ? await cartLinesAddDefault(queryOptions)(cartInput)
        : await cartCreate({
            action: CartFormInputAction.CartCreate,
            input: {lines: cartInput.lines},
          });
    },
    updateLines: cartLinesUpdateDefault(queryOptions),
    removeLines: cartLinesRemoveDefault(queryOptions),
    updateDiscountCodes: async (cartInput: CartDiscountCodesUpdate) => {
      return cartId
        ? await cartDiscountCodesUpdateDefault(queryOptions)(cartInput)
        : await cartCreate({
            action: CartFormInputAction.CartCreate,
            input: {discountCodes: cartInput.discountCodes},
          });
    },
    updateBuyerIdentity: async (cartInput: CartBuyerIdentityUpdate) => {
      return cartId
        ? await cartBuyerIdentityUpdateDefault(queryOptions)({
            action: CartFormInputAction.CartBuyerIdentityUpdate,
            buyerIdentity: cartInput.buyerIdentity,
          })
        : await cartCreate({
            action: CartFormInputAction.CartCreate,
            input: {buyerIdentity: cartInput.buyerIdentity},
          });
    },
    updateNote: cartNoteUpdateDefault(queryOptions),
    updateSelectedDeliveryOption:
      cartSelectedDeliveryOptionsUpdateDefault(queryOptions),
  };
}
