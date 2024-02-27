import {Storefront} from '../storefront';
import {type CartGetFunction, cartGetDefault} from './queries/cartGetDefault';
import {
  type CartCreateFunction,
  cartCreateDefault,
} from './queries/cartCreateDefault';
import {
  type CartLinesAddFunction,
  cartLinesAddDefault,
} from './queries/cartLinesAddDefault';
import {
  type CartLinesUpdateFunction,
  cartLinesUpdateDefault,
} from './queries/cartLinesUpdateDefault';
import {
  type CartLinesRemoveFunction,
  cartLinesRemoveDefault,
} from './queries/cartLinesRemoveDefault';
import {
  type CartDiscountCodesUpdateFunction,
  cartDiscountCodesUpdateDefault,
} from './queries/cartDiscountCodesUpdateDefault';
import {
  type CartBuyerIdentityUpdateFunction,
  cartBuyerIdentityUpdateDefault,
} from './queries/cartBuyerIdentityUpdateDefault';
import {
  type CartNoteUpdateFunction,
  cartNoteUpdateDefault,
} from './queries/cartNoteUpdateDefault';
import {
  type CartSelectedDeliveryOptionsUpdateFunction,
  cartSelectedDeliveryOptionsUpdateDefault,
} from './queries/cartSelectedDeliveryOptionsUpdateDefault';
import {
  type CartAttributesUpdateFunction,
  cartAttributesUpdateDefault,
} from './queries/cartAttributesUpdateDefault';
import {
  type CartMetafieldsSetFunction,
  cartMetafieldsSetDefault,
} from './queries/cartMetafieldsSetDefault';
import {
  type CartMetafieldDeleteFunction,
  cartMetafieldDeleteDefault,
} from './queries/cartMetafieldDeleteDefault';

export type CartHandlerOptions = {
  storefront: Storefront;
  getCartId: () => string | undefined;
  setCartId: (cartId: string) => Headers;
  cartQueryFragment?: string;
  cartMutateFragment?: string;
};

export type CustomMethodsBase = Record<string, Function>;
export type CartHandlerOptionsWithCustom<
  TCustomMethods extends CustomMethodsBase,
> = CartHandlerOptions & {
  customMethods__unstable?: TCustomMethods;
};

export type HydrogenCart = {
  get: ReturnType<typeof cartGetDefault>;
  getCartId: () => string | undefined;
  setCartId: (cartId: string) => Headers;
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

export type HydrogenCartCustom<TCustomMethods extends Partial<HydrogenCart>> =
  Omit<HydrogenCart, keyof TCustomMethods> & TCustomMethods;
export type CartHandlerReturn<TCustomMethods extends CustomMethodsBase> =
  | HydrogenCartCustom<TCustomMethods>
  | HydrogenCart;

export function createCartHandler(options: CartHandlerOptions): HydrogenCart;
export function createCartHandler<TCustomMethods extends CustomMethodsBase>(
  options: CartHandlerOptionsWithCustom<TCustomMethods>,
): HydrogenCartCustom<TCustomMethods>;
export function createCartHandler<TCustomMethods extends CustomMethodsBase>(
  options: CartHandlerOptions | CartHandlerOptionsWithCustom<TCustomMethods>,
): CartHandlerReturn<TCustomMethods> {
  const {
    getCartId,
    setCartId,
    storefront,
    cartQueryFragment,
    cartMutateFragment,
  } = options;

  const mutateOptions = {
    storefront,
    getCartId,
    cartFragment: cartMutateFragment,
  };

  const cartId = getCartId();
  const cartCreate = cartCreateDefault(mutateOptions);

  const methods: HydrogenCart = {
    get: cartGetDefault({
      storefront,
      getCartId,
      cartFragment: cartQueryFragment,
    }),
    getCartId,
    setCartId,
    create: cartCreate,
    addLines: async (lines, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartLinesAddDefault(mutateOptions)(lines, optionalParams)
        : await cartCreate({lines}, optionalParams);
    },
    updateLines: cartLinesUpdateDefault(mutateOptions),
    removeLines: cartLinesRemoveDefault(mutateOptions),
    updateDiscountCodes: async (discountCodes, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartDiscountCodesUpdateDefault(mutateOptions)(
            discountCodes,
            optionalParams,
          )
        : await cartCreate({discountCodes}, optionalParams);
    },
    updateBuyerIdentity: async (buyerIdentity, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartBuyerIdentityUpdateDefault(mutateOptions)(
            buyerIdentity,
            optionalParams,
          )
        : await cartCreate({buyerIdentity}, optionalParams);
    },
    updateNote: async (note, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartNoteUpdateDefault(mutateOptions)(note, optionalParams)
        : await cartCreate({note}, optionalParams);
    },
    updateSelectedDeliveryOption:
      cartSelectedDeliveryOptionsUpdateDefault(mutateOptions),
    updateAttributes: async (attributes, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartAttributesUpdateDefault(mutateOptions)(
            attributes,
            optionalParams,
          )
        : await cartCreate({attributes}, optionalParams);
    },
    setMetafields: async (metafields, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartMetafieldsSetDefault(mutateOptions)(
            metafields,
            optionalParams,
          )
        : await cartCreate({metafields}, optionalParams);
    },
    deleteMetafield: cartMetafieldDeleteDefault(mutateOptions),
  };

  if ('customMethods__unstable' in options) {
    return {
      ...methods,
      ...(options.customMethods__unstable ?? {}),
    };
  } else {
    return methods;
  }
}

export type CartHandlerOptionsForDocs<
  TCustomMethods extends CustomMethodsBase,
> = {
  /**
   * A function that returns the cart id in the form of `gid://shopify/Cart/c1-123`.
   */
  getCartId: () => string | undefined;
  /**
   * A function that sets the cart ID.
   */
  setCartId: (cartId: string) => Headers;
  /**
   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/latest/utilities/createstorefrontclient).
   */
  storefront: Storefront;
  /**
   * The cart mutation fragment used in most mutation requests, except for `setMetafields` and `deleteMetafield`.
   * See the [example usage](/docs/api/hydrogen/2023-04/utilities/createcarthandler#example-cart-fragments) in the documentation.
   */
  cartMutateFragment?: string;
  /**
   * The cart query fragment used by `cart.get()`.
   * See the [example usage](/docs/api/hydrogen/2023-04/utilities/createcarthandler#example-cart-fragments) in the documentation.
   */
  cartQueryFragment?: string;
  /**
   * Define custom methods or override existing methods for your cart API instance.
   * See the [example usage](/docs/api/hydrogen/2023-04/utilities/createcarthandler#example-custom-methods) in the documentation.
   */
  customMethods__unstable?: TCustomMethods;
};

export type HydrogenCartForDocs = {
  /**
   * Adds items to the cart.
   * If the cart doesn't exist, a new one will be created.
   */
  addLines?: CartLinesAddFunction;
  /**
   * Creates a new cart.
   */
  create?: CartCreateFunction;
  /**
   * Removes a custom field (metafield) from the cart.
   */
  deleteMetafield?: CartMetafieldDeleteFunction;
  /**
   * Retrieves the cart information.
   */
  get?: CartGetFunction;
  /**
   * Retrieves the unique identifier of the cart.
   * By default, it gets the ID from the request cookie.
   */
  getCartId?: () => string | undefined;
  /**
   * Removes items from the cart.
   */
  removeLines?: CartLinesRemoveFunction;
  /**
   * Sets the unique identifier of the cart.
   * By default, it sets the ID in the header cookie.
   */
  setCartId?: (cartId: string) => Headers;
  /**
   * Adds extra information (metafields) to the cart.
   * If the cart doesn't exist, a new one will be created.
   */
  setMetafields?: CartMetafieldsSetFunction;
  /**
   * Updates additional information (attributes) in the cart.
   */
  updateAttributes?: CartAttributesUpdateFunction;
  /**
   * Updates the buyer's information in the cart.
   * If the cart doesn't exist, a new one will be created.
   */
  updateBuyerIdentity?: CartBuyerIdentityUpdateFunction;
  /**
   * Updates discount codes in the cart.
   */
  updateDiscountCodes?: CartDiscountCodesUpdateFunction;
  /**
   * Updates items in the cart.
   */
  updateLines?: CartLinesUpdateFunction;
  /**
   * Updates the note in the cart.
   * If the cart doesn't exist, a new one will be created.
   */
  updateNote?: CartNoteUpdateFunction;
  /**
   * Updates the selected delivery options in the cart.
   * Only available for carts associated with a customer access token.
   */
  updateSelectedDeliveryOption?: CartSelectedDeliveryOptionsUpdateFunction;
};
