import {CountryCode} from '@shopify/hydrogen-react/storefront-api-types';
import {Storefront} from '../storefront';
import {getFormInput, CartActionInput} from './CartForm';
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
  type CartQueryData,
} from './cart-query-wrapper';
import type {
  CartGet,
  CartOptionalInput,
  MetafieldWithoutOwnerId,
} from './cart-types';
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
import {LanguageCode} from '@shopify/hydrogen-react/storefront-api-types';

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
  updateAttributes: CartQueryReturn<AttributeInput[]>;
  setMetafields: CartQueryReturn<MetafieldWithoutOwnerId[]>;
  deleteMetafield: CartQueryReturn<Scalars['String']>;
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
   * The storefront instance created by [createStorefrontClient](](docs/api/hydrogen/latest/utilities/createstorefrontclient)).
   */
  storefront: Storefront;
  /**
   * Cart mutate fragment to be used for all mutation query requests except for metafieldsSet and metafieldDelete.
   */
  cartMutateFragment?: string;
  /**
   * Cart query fragment to be used by `cart.get()`.
   */
  cartQueryFragment?: string;
  /**
   * Define custom methods or overriding methods to be used in your cart api instance.
   * See [example](/docs/api/hydrogen/2023-04/utilities/createcarthandler_unstable#example-custom-methods) usage.
   */
  customMethods?: TCustomMethods;
  /**
   * A function that returns the cart id.
   * @default () => parseCookie(requestHeaders.get('cookie') ?? '')['cart_id']
   */
  getCartId?: () => string | undefined;
  /**
   * A function that sets the cart id.
   * @default (cartId, headers) => headers.set('cookie', `cart_id=${cartId}`)
   */
  setCartId?: (cartId: string, headers: Headers) => void;
};

type CartGetForDocs = {
  /**
   * The cart id.
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
   * Add lines to the cart with the storefront api.
   * If the cart does not exist, a new cart will be created.
   * See [example](/docs/api/hydrogen/2023-04/utilities/createcarthandler_unstable#example-returns) usage.
   */
  addLine?: CartQueryReturn<CartLineInput[]>;
  /**
   * Creates a new cart with the storefront api.
   */
  create?: (
    input: CartInput,
    optionalParams: CartOptionalInput,
  ) => Promise<CartQueryData>;
  /**
   * Delete metafield in the cart with the storefront api.
   */
  deleteMetafield?: CartQueryReturn<Scalars['String']>;
  /**
   * Gets the cart with the storefront api.
   * See [example](/docs/api/hydrogen/2023-04/utilities/createcarthandler_unstable#example-returns) usage.
   */
  get?: (cartInput?: CartGetForDocs) => Promise<Cart | null | undefined>;
  /**
   * Gets the cart id. Default behavior is to get the cart id from the request cookie.
   * Returns the cart id in the form of `gid://shopify/Cart/123`
   */
  getCartId?: () => string | undefined;
  /**
   * Gets the form input created by CartForm action request.
   * See [example](/docs/api/hydrogen/2023-04/utilities/createcarthandler_unstable#example-returns) usage.
   */
  getFormInput?: (formData: any) => CartActionInput;
  /**
   * Remove lines from the cart with the storefront api.
   */
  removeLines?: CartQueryReturn<string[]>;
  /**
   * Sets the cart id. Default behavior is to set the cart id in the header cookie.
   */
  setCartId?: (cartId: string, headers: Headers) => void;
  /**
   * Set metafields in the cart with the storefront api.
   * If the cart does not exist, a new cart will be created.
   */
  setMetafields?: CartQueryReturn<MetafieldWithoutOwnerId[]>;
  /**
   * Update attributes in the cart with the storefront api.
   */
  updateAttributes?: CartQueryReturn<AttributeInput[]>;
  /**
   * Update buyer identity in the cart with the storefront api.
   * If the cart does not exist, a new cart will be created.
   */
  updateBuyerIdentity?: CartQueryReturn<CartBuyerIdentityInput>;
  /**
   * Update discount codes in the cart with the storefront api.
   */
  updateDiscountCodes?: CartQueryReturn<string[]>;
  /**
   * Update lines in the cart with the storefront api.
   */
  updateLines?: CartQueryReturn<CartLineUpdateInput[]>;
  /**
   * Update note in the cart with the storefront api.
   * If the cart does not exist, a new cart will be created.
   */
  updateNote?: CartQueryReturn<string>;
  /**
   * Update selected delivery options in the cart with the storefront api.
   * Only available for cart associated with an `buyerIdentity.customerAccessToken`.
   */
  updateSelectedDeliveryOption?: CartQueryReturn<CartSelectedDeliveryOptionInput>;
};
