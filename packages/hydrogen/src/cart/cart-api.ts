import {Storefront} from '../storefront';
import {type CartFormInput, getFormInput, FormInput} from './CartForm';
import {
  type CartQueryReturn,
  cartCreateDefault,
  cartGetDefault,
  cartLinesAddDefault,
  cartLinesUpdateDefault,
  cartLinesRemoveDefault,
  cartDiscountCodesUpdateDefault,
  cartBuyerIdentityUpdateDefault,
  cartMetafieldDeleteDefault,
  cartMetafieldsSetDefault,
  cartNoteUpdateDefault,
  cartSelectedDeliveryOptionsUpdateDefault,
} from './cart-query-wrapper';
import type {
  CartBuyerIdentityUpdate,
  CartCreate,
  CartDiscountCodesUpdate,
  CartGet,
  CartLinesAdd,
  CartLinesRemove,
  CartLinesUpdate,
  CartNoteUpdate,
  CartSelectedDeliveryOptionsUpdate,
  CartMetafieldsSet,
  CartMetafieldDelete,
} from './cart-types';
import {Cart} from '@shopify/hydrogen-react/storefront-api-types';
import {parse as parseCookie} from 'worktop/cookie';

type CartApiOptions = {
  storefront: Storefront;
  requestHeaders: Headers;
  getCartId?: () => string | undefined;
  setCartId?: (cartId: string, headers: Headers) => void;
  cartQueryFragment?: string;
  cartMutateFragment?: string;
};

type CustomMethodsBase = Record<string, Function>;
type CartApiOptionsWithCustom<TCustomMethods extends CustomMethodsBase> =
  CartApiOptions & {
    customMethods?: TCustomMethods;
  };
export type CartApiReturnBase = {
  getFormInput: (formData: any) => FormInput;
  get: (cartInput?: CartGet) => Promise<Cart | null | undefined>;
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
  metafieldsSet: CartQueryReturn<CartMetafieldsSet>;
  metafieldDelete: CartQueryReturn<CartMetafieldDelete>;
};

export type CartApiReturnCustom<
  TCustomMethods extends Partial<CartApiReturnBase>,
> = Omit<CartApiReturnBase, keyof TCustomMethods> & TCustomMethods;
export type CartApiReturn<TCustomMethods extends CustomMethodsBase> =
  | CartApiReturnCustom<TCustomMethods>
  | CartApiReturnBase;

export function createCartApi(options: CartApiOptions): CartApiReturnBase;
export function createCartApi<TCustomMethods extends CustomMethodsBase>(
  options: CartApiOptionsWithCustom<TCustomMethods>,
): CartApiReturnCustom<TCustomMethods>;
export function createCartApi<TCustomMethods extends CustomMethodsBase>(
  options: CartApiOptions | CartApiOptionsWithCustom<TCustomMethods>,
): CartApiReturn<TCustomMethods> {
  const {requestHeaders, storefront, cartQueryFragment, cartMutateFragment} =
    options;

  // Default get cartId in cookie
  const getCartId =
    options.getCartId ||
    (() => {
      const cookies = parseCookie(requestHeaders.get('Cookie') || '');
      return cookies.cart ? `gid://shopify/Cart/${cookies.cart}` : undefined;
    });

  // Default set cartId in cookie
  const setCartId =
    options.setCartId ||
    ((cartId: string, headers: Headers) => {
      headers.append('Set-Cookie', `cart=${cartId.split('/').pop()}`);
    });

  const mutateOptions = {
    storefront,
    getCartId,
    cartMutateFragment,
  };

  const cartId = getCartId();
  const cartCreate = cartCreateDefault(mutateOptions);

  const methods: CartApiReturnBase = {
    getFormInput,
    get: cartGetDefault({
      storefront,
      getCartId,
      cartQueryFragment,
    }),
    getCartId,
    setCartId,
    create: cartCreate,
    addLine: async (cartInput: CartLinesAdd) => {
      return cartId
        ? await cartLinesAddDefault(mutateOptions)(cartInput)
        : await cartCreate({
            input: {lines: cartInput.lines},
          });
    },
    updateLines: cartLinesUpdateDefault(mutateOptions),
    removeLines: cartLinesRemoveDefault(mutateOptions),
    updateDiscountCodes: async (cartInput: CartDiscountCodesUpdate) => {
      return cartId
        ? await cartDiscountCodesUpdateDefault(mutateOptions)(cartInput)
        : await cartCreate({
            input: {discountCodes: cartInput.discountCodes},
          });
    },
    updateBuyerIdentity: async (cartInput: CartBuyerIdentityUpdate) => {
      return cartId
        ? await cartBuyerIdentityUpdateDefault(mutateOptions)({
            buyerIdentity: cartInput.buyerIdentity,
          })
        : await cartCreate({
            input: {buyerIdentity: cartInput.buyerIdentity},
          });
    },
    updateNote: cartNoteUpdateDefault(mutateOptions),
    updateSelectedDeliveryOption:
      cartSelectedDeliveryOptionsUpdateDefault(mutateOptions),
    metafieldsSet: async (cartInput: CartMetafieldsSet) => {
      return cartId
        ? await cartMetafieldsSetDefault(mutateOptions)(cartInput)
        : await cartCreate({
            input: {metafields: cartInput.metafields},
          });
    },
    metafieldDelete: cartMetafieldDeleteDefault(mutateOptions),
  };

  if ('customMethods' in options) {
    return {
      ...methods,
      ...(options.customMethods ?? {}),
    };
  } else {
    return methods;
  }
}
