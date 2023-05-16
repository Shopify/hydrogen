import {Storefront} from '../storefront';
import {getFormInput, FormInput} from './CartForm';
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
  cartAttributesUpdateDefault,
} from './cart-query-wrapper';
import type {CartGet, MetafieldWithoutOwnerId} from './cart-types';
import {
  AttributeInput,
  Cart,
  CartBuyerIdentityInput,
  CartInput,
  CartLineInput,
  CartLineUpdateInput,
  CartSelectedDeliveryOptionInput,
  Scalars,
} from '@shopify/hydrogen-react/storefront-api-types';
import {parse as parseCookie} from 'worktop/cookie';

type CartHandlerOptions = {
  storefront: Storefront;
  requestHeaders: Headers;
  getCartId?: () => string | undefined;
  setCartId?: (cartId: string, headers: Headers) => void;
  cartQueryFragment?: string;
  cartMutateFragment?: string;
};

type CustomMethodsBase = Record<string, Function>;
type CartHandlerOptionsWithCustom<TCustomMethods extends CustomMethodsBase> =
  CartHandlerOptions & {
    customMethods?: TCustomMethods;
  };
export type CartHandlerReturnBase = {
  getFormInput: (formData: any) => FormInput;
  get: (cartInput?: CartGet) => Promise<Cart | null | undefined>;
  getCartId: () => string | undefined;
  setCartId: (cartId: string, headers: Headers) => void;
  create: CartQueryReturn<CartInput>;
  addLines: CartQueryReturn<CartLineInput[]>;
  updateLines: CartQueryReturn<CartLineUpdateInput[]>;
  removeLines: CartQueryReturn<string[]>;
  updateDiscountCodes: CartQueryReturn<string[]>;
  updateBuyerIdentity: CartQueryReturn<CartBuyerIdentityInput>;
  updateNote: CartQueryReturn<string>;
  updateSelectedDeliveryOption: CartQueryReturn<CartSelectedDeliveryOptionInput>;
  attributesUpdate: CartQueryReturn<AttributeInput[]>;
  metafieldsSet: CartQueryReturn<MetafieldWithoutOwnerId[]>;
  metafieldDelete: CartQueryReturn<Scalars['String']>;
};

export type CartHandlerReturnCustom<
  TCustomMethods extends Partial<CartHandlerReturnBase>,
> = Omit<CartHandlerReturnBase, keyof TCustomMethods> & TCustomMethods;
export type CartHandlerReturn<TCustomMethods extends CustomMethodsBase> =
  | CartHandlerReturnCustom<TCustomMethods>
  | CartHandlerReturnBase;

export function createCartHandler_unstable(
  options: CartHandlerOptions,
): CartHandlerReturnBase;
export function createCartHandler_unstable<
  TCustomMethods extends CustomMethodsBase,
>(
  options: CartHandlerOptionsWithCustom<TCustomMethods>,
): CartHandlerReturnCustom<TCustomMethods>;
export function createCartHandler_unstable<
  TCustomMethods extends CustomMethodsBase,
>(
  options: CartHandlerOptions | CartHandlerOptionsWithCustom<TCustomMethods>,
): CartHandlerReturn<TCustomMethods> {
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

  const methods: CartHandlerReturnBase = {
    getFormInput,
    get: cartGetDefault({
      storefront,
      getCartId,
      cartQueryFragment,
    }),
    getCartId,
    setCartId,
    create: cartCreate,
    addLines: async (lines, optionalParams) => {
      return cartId
        ? await cartLinesAddDefault(mutateOptions)(lines, optionalParams)
        : await cartCreate({lines}, optionalParams);
    },
    updateLines: cartLinesUpdateDefault(mutateOptions),
    removeLines: cartLinesRemoveDefault(mutateOptions),
    updateDiscountCodes: async (discountCodes, optionalParams) => {
      return cartId
        ? await cartDiscountCodesUpdateDefault(mutateOptions)(
            discountCodes,
            optionalParams,
          )
        : await cartCreate({discountCodes}, optionalParams);
    },
    updateBuyerIdentity: async (buyerIdentity, optionalParams) => {
      return cartId
        ? await cartBuyerIdentityUpdateDefault(mutateOptions)(
            buyerIdentity,
            optionalParams,
          )
        : await cartCreate({buyerIdentity}, optionalParams);
    },
    updateNote: cartNoteUpdateDefault(mutateOptions),
    updateSelectedDeliveryOption:
      cartSelectedDeliveryOptionsUpdateDefault(mutateOptions),
    attributesUpdate: cartAttributesUpdateDefault(mutateOptions),
    metafieldsSet: async (metafields, optionalParams) => {
      return cartId
        ? await cartMetafieldsSetDefault(mutateOptions)(
            metafields,
            optionalParams,
          )
        : await cartCreate({metafields}, optionalParams);
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
