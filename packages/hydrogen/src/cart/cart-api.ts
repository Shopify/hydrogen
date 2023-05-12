import {CountryCode} from '@shopify/hydrogen-react/storefront-api-types';
import {Storefront} from '../storefront';
import {getFormInput} from './CartForm';
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
  type CartMetafieldsSet,
  type CartMetafieldDelete,
} from './cart-types';
import {Cart} from '@shopify/hydrogen-react/storefront-api-types';
import {parse as parseCookie} from 'worktop/cookie';
import {LanguageCode} from '@shopify/hydrogen-react/storefront-api-types';

export type CartApiOptions = {
  storefront: Storefront;
  requestHeaders: Headers;
  getCartId?: () => string | undefined;
  setCartId?: (cartId: string, headers: Headers) => void;
  cartQueryFragment?: string;
  cartMutateFragment?: string;
};

export type CustomMethodsBase = Record<string, Function>;
export type CartApiOptionsWithCustom<TCustomMethods extends CustomMethodsBase> =
  CartApiOptions & {
    customMethods?: TCustomMethods;
  };
export type CartApiReturnBase = {
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
            action: CartFormInputAction.CartCreate,
            input: {lines: cartInput.lines},
          });
    },
    updateLines: cartLinesUpdateDefault(mutateOptions),
    removeLines: cartLinesRemoveDefault(mutateOptions),
    updateDiscountCodes: async (cartInput: CartDiscountCodesUpdate) => {
      return cartId
        ? await cartDiscountCodesUpdateDefault(mutateOptions)(cartInput)
        : await cartCreate({
            action: CartFormInputAction.CartCreate,
            input: {discountCodes: cartInput.discountCodes},
          });
    },
    updateBuyerIdentity: async (cartInput: CartBuyerIdentityUpdate) => {
      return cartId
        ? await cartBuyerIdentityUpdateDefault(mutateOptions)({
            action: CartFormInputAction.CartBuyerIdentityUpdate,
            buyerIdentity: cartInput.buyerIdentity,
          })
        : await cartCreate({
            action: CartFormInputAction.CartCreate,
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
            action: CartFormInputAction.CartCreate,
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

export type CartApiOptionsForDocs<TCustomMethods extends CustomMethodsBase> = {
  /**
   * The storefront instance created by [createStorefrontClient](](docs/api/hydrogen/latest/utilities/createstorefrontclient)).
   */
  storefront: Storefront;
  /**
   * The request headers.
   */
  requestHeaders: Headers;
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
  /**
   * Cart query fragment to be used by `cart.get()`.
   */
  cartQueryFragment?: string;
  /**
   * Cart mutate fragment to be used for all mutation query requests except for metafieldsSet and metafieldDelete.
   */
  cartMutateFragment?: string;
  /**
   * Define custom methods or overriding methods to be used in your cart api instance.
   * See [example](/docs/api/hydrogen/2023-04/utilities/createcartapi#example-custom-methods) usage.
   */
  customMethods?: TCustomMethods;
};

type CartGetForDocs = {
  /**
   * The cart id.
   * @default cart.getCartId();
   */
  cartId?: string;
  /**
   * The number of cart lines to be returned.
   * @default 100
   */
  numCartLines?: number;
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
};

export type CartApiReturnBaseForDocs = {
  /**
   * Gets the form input created by CartForm action request.
   * See [example](/docs/api/hydrogen/2023-04/utilities/createcartapi#example-returns) usage.
   */
  getFormInput?: (formData: any) => CartFormInput;
  /**
   * Gets the cart with the storefront api.
   * See [example](/docs/api/hydrogen/2023-04/utilities/createcartapi#example-returns) usage.
   */
  get?: (cartInput?: CartGetForDocs) => Promise<Cart | null | undefined>;
  /**
   * Gets the cart id. Default behavior is to get the cart id from the request cookie.
   * Returns the cart id in the form of `gid://shopify/Cart/123`
   */
  getCartId?: () => string | undefined;
  /**
   * Sets the cart id. Default behavior is to set the cart id in the header cookie.
   */
  setCartId?: (cartId: string, headers: Headers) => void;
  /**
   * Creates a new cart with the storefront api.
   */
  create?: CartQueryReturn<CartCreate>;
  /**
   * Add lines to the cart with the storefront api.
   * If the cart does not exist, a new cart will be created.
   * See [example](/docs/api/hydrogen/2023-04/utilities/createcartapi#example-returns) usage.
   */
  addLine?: CartQueryReturn<CartLinesAdd>;
  /**
   * Update lines in the cart with the storefront api.
   */
  updateLines?: CartQueryReturn<CartLinesUpdate>;
  /**
   * Remove lines from the cart with the storefront api.
   */
  removeLines?: CartQueryReturn<CartLinesRemove>;
  /**
   * Update discount codes in the cart with the storefront api.
   */
  updateDiscountCodes?: CartQueryReturn<CartDiscountCodesUpdate>;
  /**
   * Update buyer identity in the cart with the storefront api.
   * If the cart does not exist, a new cart will be created.
   */
  updateBuyerIdentity?: CartQueryReturn<CartBuyerIdentityUpdate>;
  /**
   * Update note in the cart with the storefront api.
   * If the cart does not exist, a new cart will be created.
   */
  updateNote?: CartQueryReturn<CartNoteUpdate>;
  /**
   * Update selected delivery options in the cart with the storefront api.
   * Only available for cart associated with an `buyerIdentity.customerAccessToken`.
   */
  updateSelectedDeliveryOption?: CartQueryReturn<CartSelectedDeliveryOptionsUpdate>;
  /**
   * Set metafields in the cart with the storefront api.
   * If the cart does not exist, a new cart will be created.
   */
  metafieldsSet?: CartQueryReturn<CartMetafieldsSet>;
  /**
   * Delete metafield in the cart with the storefront api.
   */
  metafieldDelete?: CartQueryReturn<CartMetafieldDelete>;
};
