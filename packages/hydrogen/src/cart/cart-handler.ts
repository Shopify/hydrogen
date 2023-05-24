import {CountryCode} from '@shopify/hydrogen-react/storefront-api-types';
import {Storefront} from '../storefront';
import {getFormInput, CartActionInput} from './CartForm';
import type {
  CartOptionalInput,
  CartQueryData,
  MetafieldWithoutOwnerId,
} from './queries/cart-types';
import {
  AttributeInput,
  Cart,
  CartBuyerIdentityInput,
  CartInput,
  CartLineInput,
  CartLineUpdateInput,
  CartSelectedDeliveryOptionInput,
  LanguageCode,
  Scalars,
} from '@shopify/hydrogen-react/storefront-api-types';
import {parse as parseCookie} from 'worktop/cookie';
import {cartGetDefault} from './queries/cartGetDefault';
import {cartCreateDefault} from './queries/cartCreateDefault';
import {
  type CartLinesAddFunction,
  cartLinesAddDefault,
} from './queries/cartLinesAddDefault';
import {cartLinesUpdateDefault} from './queries/cartLinesUpdateDefault';
import {cartLinesRemoveDefault} from './queries/cartLinesRemoveDefault';
import {cartDiscountCodesUpdateDefault} from './queries/cartDiscountCodesUpdateDefault';
import {cartBuyerIdentityUpdateDefault} from './queries/cartBuyerIdentityUpdateDefault';
import {cartNoteUpdateDefault} from './queries/cartNoteUpdateDefault';
import {cartSelectedDeliveryOptionsUpdateDefault} from './queries/cartSelectedDeliveryOptionsUpdateDefault';
import {cartAttributesUpdateDefault} from './queries/cartAttributesUpdateDefault';
import {cartMetafieldsSetDefault} from './queries/cartMetafieldsSetDefault';
import {cartMetafieldDeleteDefault} from './queries/cartMetafieldDeleteDefault';

export const cartGetIdDefault = (requestHeaders: Headers) => {
  return () => {
    const cookies = parseCookie(requestHeaders.get('Cookie') || '');
    return cookies.cart ? `gid://shopify/Cart/${cookies.cart}` : undefined;
  };
};

export const cartSetIdDefault = () => {
  return (cartId: string, headers: Headers) => {
    headers.append('Set-Cookie', `cart=${cartId.split('/').pop()}`);
  };
};

export type CartHandlerOptions = {
  storefront: Storefront;
  requestHeaders: Headers;
  getCartId?: () => string | undefined;
  setCartId?: (cartId: string, headers: Headers) => void;
  cartQueryFragment?: string;
  cartMutateFragment?: string;
};

export type CustomMethodsBase = Record<string, Function>;
export type CartHandlerOptionsWithCustom<
  TCustomMethods extends CustomMethodsBase,
> = CartHandlerOptions & {
  customMethods?: TCustomMethods;
};
export type CartHandlerReturnBase = {
  getFormInput: (formData: any) => CartActionInput;
  get: ReturnType<typeof cartGetDefault>;
  getCartId: () => string | undefined;
  setCartId: (cartId: string, headers: Headers) => void;
  create: ReturnType<typeof cartCreateDefault>;
  addLines: ReturnType<typeof cartLinesAddDefault>;
  updateLines: ReturnType<typeof cartLinesUpdateDefault>;
  removeLines: ReturnType<typeof cartLinesRemoveDefault>;
  updateDiscountCodes: ReturnType<typeof cartDiscountCodesUpdateDefault>;
  updateBuyerIdentity: ReturnType<typeof cartBuyerIdentityUpdateDefault>;
  updateNote: ReturnType<typeof cartNoteUpdateDefault>;
  updateSelectedDeliveryOption: ReturnType<
    typeof cartSelectedDeliveryOptionsUpdateDefault
  >;
  updateAttributes: ReturnType<typeof cartAttributesUpdateDefault>;
  setMetafields: ReturnType<typeof cartMetafieldsSetDefault>;
  deleteMetafield: ReturnType<typeof cartMetafieldDeleteDefault>;
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
  const getCartId = options.getCartId || cartGetIdDefault(requestHeaders);

  // Default set cartId in cookie
  const setCartId = options.setCartId || cartSetIdDefault();

  const mutateOptions = {
    storefront,
    getCartId,
    cartFragment: cartMutateFragment,
  };

  const cartId = getCartId();
  const cartCreate = cartCreateDefault(mutateOptions);

  const methods: CartHandlerReturnBase = {
    getFormInput,
    get: cartGetDefault({
      storefront,
      getCartId,
      cartFragment: cartQueryFragment,
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
    updateAttributes: cartAttributesUpdateDefault(mutateOptions),
    setMetafields: async (metafields, optionalParams) => {
      return cartId
        ? await cartMetafieldsSetDefault(mutateOptions)(
            metafields,
            optionalParams,
          )
        : await cartCreate({metafields}, optionalParams);
    },
    deleteMetafield: cartMetafieldDeleteDefault(mutateOptions),
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

export type CartHandlerOptionsForDocs<
  TCustomMethods extends CustomMethodsBase,
> = {
  /**
   * The request headers.
   */
  requestHeaders: Headers;
  /**
   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).
   */
  storefront: Storefront;
  /**
   * The cart mutation fragment used in most mutation requests, except for `setMetafields` and `deleteMetafield`.
   * See the [example usage](/docs/api/hydrogen/2023-04/utilities/createcarthandler_unstable#example-cart-fragments) in the documentation.
   */
  cartMutateFragment?: string;
  /**
   * The cart query fragment used by `cart.get()`.
   * See the [example usage](/docs/api/hydrogen/2023-04/utilities/createcarthandler_unstable#example-cart-fragments) in the documentation.
   */
  cartQueryFragment?: string;
  /**
   * Define custom methods or override existing methods for your cart API instance.
   * See the [example usage](/docs/api/hydrogen/2023-04/utilities/createcarthandler_unstable#example-custom-methods) in the documentation.
   */
  customMethods?: TCustomMethods;
  /**
   * A function that returns the cart ID.
   * @default () => parseCookie(requestHeaders.get('cookie') ?? '')['cart_id']
   */
  getCartId?: () => string | undefined;
  /**
   * A function that sets the cart ID.
   * @default (cartId, headers) => headers.set('cookie', `cart_id=${cartId}`)
   */
  setCartId?: (cartId: string, headers: Headers) => void;
};

type CartGetForDocs = {
  /**
   * The cart ID.
   * @default cart.getCartId();
   */
  cartId?: string;
  /**
   * The country code.
   * @default storefront.i18n.country
   */
  country?: CountryCode;
  /**
   * The language code.
   * @default storefront.i18n.language
   */
  language?: LanguageCode;
  /**
   * The number of cart lines to be returned.
   * @default 100
   */
  numCartLines?: number;
};

export type CartHandlerReturnBaseForDocs = {
  /**
   * Adds items to the cart.
   * If the cart doesn't exist, a new one will be created.
   */
  addLines?: CartLinesAddFunction;
  /**
   * Creates a new cart.
   */
  create?: (
    input: CartInput,
    optionalParams: CartOptionalInput,
  ) => Promise<CartQueryData>;
  /**
   * Removes a custom field (metafield) from the cart.
   */
  deleteMetafield?: (
    key: Scalars['String'],
    optionalParams: CartOptionalInput,
  ) => Promise<CartQueryData>;
  /**
   * Retrieves the cart information.
   */
  get?: (cartInput?: CartGetForDocs) => Promise<Cart | null | undefined>;
  /**
   * Retrieves the unique identifier of the cart.
   * By default, it gets the ID from the request cookie.
   */
  getCartId?: () => string | undefined;
  /**
   * Retrieves the form input created by the CartForm action request.
   */
  getFormInput?: (formData: any) => CartActionInput;
  /**
   * Removes items from the cart.
   */
  removeLines?: (
    lineIds: string[],
    optionalParams: CartOptionalInput,
  ) => Promise<CartQueryData>;
  /**
   * Sets the unique identifier of the cart.
   * By default, it sets the ID in the header cookie.
   */
  setCartId?: (cartId: string, headers: Headers) => void;
  /**
   * Adds extra information (metafields) to the cart.
   * If the cart doesn't exist, a new one will be created.
   */
  setMetafields?: (
    metafields: MetafieldWithoutOwnerId[],
    optionalParams: CartOptionalInput,
  ) => Promise<CartQueryData>;
  /**
   * Updates additional information (attributes) in the cart.
   */
  updateAttributes?: (
    attributes: AttributeInput[],
    optionalParams: CartOptionalInput,
  ) => Promise<CartQueryData>;
  /**
   * Updates the buyer's information in the cart.
   * If the cart doesn't exist, a new one will be created.
   */
  updateBuyerIdentity?: (
    buyerIdentity: CartBuyerIdentityInput,
    optionalParams: CartOptionalInput,
  ) => Promise<CartQueryData>;
  /**
   * Updates discount codes in the cart.
   */
  updateDiscountCodes?: (
    discountCodes: string[],
    optionalParams: CartOptionalInput,
  ) => Promise<CartQueryData>;
  /**
   * Updates items in the cart.
   */
  updateLines?: (
    lines: CartLineUpdateInput[],
    optionalParams: CartOptionalInput,
  ) => Promise<CartQueryData>;
  /**
   * Updates the note in the cart.
   * If the cart doesn't exist, a new one will be created.
   */
  updateNote?: (
    note: string,
    optionalParams: CartOptionalInput,
  ) => Promise<CartQueryData>;
  /**
   * Updates the selected delivery options in the cart.
   * Only available for carts associated with a customer access token.
   */
  updateSelectedDeliveryOption?: (
    selectedDeliveryOptions: CartSelectedDeliveryOptionInput,
    optionalParams: CartOptionalInput,
  ) => Promise<CartQueryData>;
};
