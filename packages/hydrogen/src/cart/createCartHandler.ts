import {Storefront} from '../storefront';
import type {CustomerAccount} from '../customer/types';
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
import {
  type CartGiftCardCodesUpdateFunction,
  cartGiftCardCodesUpdateDefault,
} from './queries/cartGiftCardCodeUpdateDefault';
import {
  type CartGiftCardCodesAddFunction,
  cartGiftCardCodesAddDefault,
} from './queries/cartGiftCardCodesAddDefault';
import {
  type CartGiftCardCodesRemoveFunction,
  cartGiftCardCodesRemoveDefault,
} from './queries/cartGiftCardCodesRemoveDefault';
import {
  type CartDeliveryAddressesAddFunction,
  cartDeliveryAddressesAddDefault,
} from './queries/cartDeliveryAddressesAddDefault';
import {
  type CartDeliveryAddressesRemoveFunction,
  cartDeliveryAddressesRemoveDefault,
} from './queries/cartDeliveryAddressesRemoveDefault';
import {
  type CartDeliveryAddressesUpdateFunction,
  cartDeliveryAddressesUpdateDefault,
} from './queries/cartDeliveryAddressesUpdateDefault';
import {
  type CartDeliveryAddressesReplaceFunction,
  cartDeliveryAddressesReplaceDefault,
} from './queries/cartDeliveryAddressesReplaceDefault';
import type {
  Cart,
  CartBuyerIdentityInput,
} from '@shopify/hydrogen-react/storefront-api-types';
import type {
  CartOptionalInput,
  CartQueryDataReturn,
  MetafieldWithoutOwnerId,
} from './queries/cart-types';

export type CartHandlerOptions = {
  storefront: Storefront;
  customerAccount?: CustomerAccount;
  getCartId: () => string | undefined;
  setCartId: (cartId: string) => Headers;
  cartQueryFragment?: string;
  cartMutateFragment?: string;
  buyerIdentity?: CartBuyerIdentityInput;
};

export type CustomMethodsBase = Record<string, Function>;
export type CartHandlerOptionsWithCustom<
  TCustomMethods extends CustomMethodsBase,
> = CartHandlerOptions & {
  customMethods?: TCustomMethods;
};
type CartHandlerOptionsWithRequiredCustom<
  TCustomMethods extends CustomMethodsBase,
> = CartHandlerOptions & {
  customMethods: TCustomMethods;
};

export type HydrogenCart<
  TCart = HydrogenCustomCartFragment & Cart,
  TGetExtraVariables = {},
> = {
  get: CartGetFunction<TCart, TGetExtraVariables>;
  getCartId: () => string | undefined;
  setCartId: (cartId: string) => Headers;
  create: CartCreateFunction<TCart>;
  addLines: CartLinesAddFunction<TCart>;
  updateLines: CartLinesUpdateFunction<TCart>;
  removeLines: CartLinesRemoveFunction<TCart>;
  updateDiscountCodes: CartDiscountCodesUpdateFunction<TCart>;
  updateGiftCardCodes: CartGiftCardCodesUpdateFunction<TCart>;
  addGiftCardCodes: CartGiftCardCodesAddFunction<TCart>;
  removeGiftCardCodes: CartGiftCardCodesRemoveFunction<TCart>;
  updateBuyerIdentity: CartBuyerIdentityUpdateFunction<TCart>;
  updateNote: CartNoteUpdateFunction<TCart>;
  updateSelectedDeliveryOption: CartSelectedDeliveryOptionsUpdateFunction<TCart>;
  updateAttributes: CartAttributesUpdateFunction<TCart>;
  setMetafields: (
    metafields: MetafieldWithoutOwnerId[],
    optionalParams?: CartOptionalInput,
  ) => Promise<CartQueryDataReturn | CartQueryDataReturn<TCart>>;
  deleteMetafield: ReturnType<typeof cartMetafieldDeleteDefault>;
  /**
   * Adds delivery addresses to the cart.
   *
   * This function sends a mutation to the storefront API to add one or more delivery addresses to the cart.
   * It returns the result of the mutation, including any errors that occurred.
   *
   * @param {CartQueryOptions} options - The options for the cart query, including the storefront API client and cart fragment.
   * @returns {ReturnType<typeof cartDeliveryAddressesAddDefault>} - A function that takes an array of addresses and optional parameters, and returns the result of the API call.
   *
   * @example
   * const result = await cart.addDeliveryAddresses(
   *   [
   *     {
   *       address1: '123 Main St',
   *       city: 'Anytown',
   *       countryCode: 'US'
   *     }
   *   ],
   *   { someOptionalParam: 'value' }
   * );
   */
  addDeliveryAddresses: CartDeliveryAddressesAddFunction<TCart>;
  /**
   * Removes delivery addresses from the cart.
   *
   * This function sends a mutation to the storefront API to remove one or more delivery addresses from the cart.
   * It returns the result of the mutation, including any errors that occurred.
   *
   * @param {CartQueryOptions} options - The options for the cart query, including the storefront API client and cart fragment.
   * @returns {CartDeliveryAddressRemoveFunction} - A function that takes an array of address IDs and optional parameters, and returns the result of the API call.
   *
   * @example
   * const result = await cart.removeDeliveryAddresses([
   *   "gid://shopify/<objectName>/10079785100"
   * ],
   * { someOptionalParam: 'value' });
   */

  removeDeliveryAddresses: CartDeliveryAddressesRemoveFunction<TCart>;
  /**
  * Updates delivery addresses in the cart.
  *
  * This function sends a mutation to the storefront API to update one or more delivery addresses in the cart.
  * It returns the result of the mutation, including any errors that occurred.
  *
  * @param {CartQueryOptions} options - The options for the cart query, including the storefront API client and cart fragment.
  * @returns {CartDeliveryAddressUpdateFunction} - A function that takes an array of addresses and optional parameters, and returns the result of the API call.
  *
  * const result = await cart.updateDeliveryAddresses([
      {
        "address": {
          "copyFromCustomerAddressId": "gid://shopify/<objectName>/10079785100",
          "deliveryAddress": {
            "address1": "<your-address1>",
            "address2": "<your-address2>",
            "city": "<your-city>",
            "company": "<your-company>",
            "countryCode": "AC",
            "firstName": "<your-firstName>",
            "lastName": "<your-lastName>",
            "phone": "<your-phone>",
            "provinceCode": "<your-provinceCode>",
            "zip": "<your-zip>"
          }
        },
        "id": "gid://shopify/<objectName>/10079785100",
        "oneTimeUse": true,
        "selected": true,
        "validationStrategy": "COUNTRY_CODE_ONLY"
      }
    ],{ someOptionalParam: 'value' });
  */
  updateDeliveryAddresses: CartDeliveryAddressesUpdateFunction<TCart>;
  /**
   * Replaces all delivery addresses on the cart.
   *
   * This function sends a mutation to the storefront API to replace all delivery addresses on the cart
   * with the provided addresses. It returns the result of the mutation, including any errors that occurred.
   *
   * @param {CartQueryOptions} options - The options for the cart query, including the storefront API client and cart fragment.
   * @returns {CartDeliveryAddressesReplaceFunction} - A function that takes an array of addresses and optional parameters, and returns the result of the API call.
   *
   * @example
   * const result = await cart.replaceDeliveryAddresses([
   *   {
   *     address: {
   *       deliveryAddress: {
   *         address1: '123 Main St',
   *         city: 'Anytown',
   *         countryCode: 'US'
   *       }
   *     },
   *     selected: true
   *   }
   * ], { someOptionalParam: 'value' });
   */
  replaceDeliveryAddresses: CartDeliveryAddressesReplaceFunction<TCart>;
};

export type HydrogenCartCustom<
  TCustomMethods extends CustomMethodsBase,
  TCart = HydrogenCustomCartFragment & Cart,
  TGetExtraVariables = {},
> = Omit<HydrogenCart<TCart, TGetExtraVariables>, keyof TCustomMethods> &
  TCustomMethods;
export type CartHandlerReturn<
  TCustomMethods extends CustomMethodsBase,
  TCart = HydrogenCustomCartFragment & Cart,
  TGetExtraVariables = {},
> =
  | HydrogenCartCustom<TCustomMethods, TCart, TGetExtraVariables>
  | HydrogenCart<TCart, TGetExtraVariables>;

/** @publicDocs */
export function createCartHandler<TCustomMethods extends CustomMethodsBase>(
  options: CartHandlerOptionsWithRequiredCustom<TCustomMethods>,
): HydrogenCartCustom<TCustomMethods>;
export function createCartHandler<
  TCart = HydrogenCustomCartFragment & Cart,
  TGetExtraVariables = {},
>(options: CartHandlerOptions): HydrogenCart<TCart, TGetExtraVariables>;
export function createCartHandler<
  TCart,
  TGetExtraVariables,
  TCustomMethods extends CustomMethodsBase,
>(
  options: CartHandlerOptionsWithRequiredCustom<TCustomMethods>,
): HydrogenCartCustom<TCustomMethods, TCart, TGetExtraVariables>;
export function createCartHandler<
  TCart = HydrogenCustomCartFragment & Cart,
  TGetExtraVariables = {},
  TCustomMethods extends CustomMethodsBase = CustomMethodsBase,
>(
  options: CartHandlerOptions | CartHandlerOptionsWithCustom<TCustomMethods>,
): CartHandlerReturn<TCustomMethods, TCart, TGetExtraVariables> {
  const {
    getCartId: _getCartId,
    setCartId,
    storefront,
    customerAccount,
    cartQueryFragment,
    cartMutateFragment,
    buyerIdentity,
  } = options;

  let cartId = _getCartId();

  const getCartId = () => cartId || _getCartId();

  const mutateOptions = {
    storefront,
    getCartId,
    cartFragment: cartMutateFragment,
    customerAccount,
  };

  const _cartCreate = cartCreateDefault<TCart>(mutateOptions);

  const cartCreate: CartCreateFunction<TCart> = async function (...args) {
    // Default buyerIdentity to what is passed into the handler
    // Only override if buyerIdentity is passed directly to the method
    args[0].buyerIdentity = {
      ...buyerIdentity,
      ...args[0].buyerIdentity,
    };

    const result = await _cartCreate(...args);

    if (
      result?.cart &&
      (typeof result.cart !== 'object' ||
        !('id' in result.cart) ||
        typeof result.cart.id !== 'string')
    ) {
      throw new Error(
        '[h2:error:createCartHandler] Cart created but response is missing a valid `id` field. ' +
          'Ensure your cart query fragment includes the `id` field.',
      );
    }
    cartId =
      result?.cart &&
      typeof result.cart === 'object' &&
      'id' in result.cart &&
      typeof result.cart.id === 'string'
        ? result.cart.id
        : undefined;

    return result;
  };

  const methods: HydrogenCart<TCart, TGetExtraVariables> = {
    get: cartGetDefault<TCart, TGetExtraVariables>({
      storefront,
      customerAccount,
      getCartId,
      cartFragment: cartQueryFragment,
    }),
    getCartId,
    setCartId,
    create: cartCreate,
    addLines: async (linesWithOptimisticData, optionalParams) => {
      const lines = linesWithOptimisticData.map((line) => {
        return {
          attributes: line.attributes,
          quantity: line.quantity,
          merchandiseId: line.merchandiseId,
          sellingPlanId: line.sellingPlanId,
          parent: line.parent,
        };
      });

      return cartId || optionalParams?.cartId
        ? await cartLinesAddDefault<TCart>(mutateOptions)(lines, optionalParams)
        : await cartCreate({lines, buyerIdentity}, optionalParams);
    },
    updateLines: cartLinesUpdateDefault<TCart>(mutateOptions),
    removeLines: cartLinesRemoveDefault<TCart>(mutateOptions),
    updateDiscountCodes: async (discountCodes, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartDiscountCodesUpdateDefault<TCart>(mutateOptions)(
            discountCodes,
            optionalParams,
          )
        : await cartCreate({discountCodes}, optionalParams);
    },
    updateGiftCardCodes: async (giftCardCodes, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartGiftCardCodesUpdateDefault<TCart>(mutateOptions)(
            giftCardCodes,
            optionalParams,
          )
        : await cartCreate({giftCardCodes}, optionalParams);
    },
    addGiftCardCodes: cartGiftCardCodesAddDefault<TCart>(mutateOptions),
    removeGiftCardCodes: cartGiftCardCodesRemoveDefault<TCart>(mutateOptions),
    updateBuyerIdentity: async (buyerIdentity, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartBuyerIdentityUpdateDefault<TCart>(mutateOptions)(
            buyerIdentity,
            optionalParams,
          )
        : await cartCreate({buyerIdentity}, optionalParams);
    },
    updateNote: async (note, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartNoteUpdateDefault<TCart>(mutateOptions)(
            note,
            optionalParams,
          )
        : await cartCreate({note}, optionalParams);
    },
    updateSelectedDeliveryOption:
      cartSelectedDeliveryOptionsUpdateDefault<TCart>(mutateOptions),
    updateAttributes: async (attributes, optionalParams) => {
      return cartId || optionalParams?.cartId
        ? await cartAttributesUpdateDefault<TCart>(mutateOptions)(
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
    addDeliveryAddresses: cartDeliveryAddressesAddDefault<TCart>(mutateOptions),
    removeDeliveryAddresses:
      cartDeliveryAddressesRemoveDefault<TCart>(mutateOptions),
    updateDeliveryAddresses:
      cartDeliveryAddressesUpdateDefault<TCart>(mutateOptions),
    replaceDeliveryAddresses:
      cartDeliveryAddressesReplaceDefault<TCart>(mutateOptions),
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

/** @publicDocs */
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
   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/utilities/createstorefrontclient).
   */
  storefront: Storefront;
  /**
   * The cart mutation fragment used in most mutation requests, except for `setMetafields` and `deleteMetafield`.
   * See the [example usage](/docs/api/hydrogen/utilities/createcarthandler#example-cart-fragments) in the documentation.
   */
  cartMutateFragment?: string;
  /**
   * The cart query fragment used by `cart.get()`.
   * See the [example usage](/docs/api/hydrogen/utilities/createcarthandler#example-cart-fragments) in the documentation.
   */
  cartQueryFragment?: string;
  /**
   * Define custom methods or override existing methods for your cart API instance.
   * See the [example usage](/docs/api/hydrogen/utilities/createcarthandler#example-custom-methods) in the documentation.
   */
  customMethods?: TCustomMethods;

  /**
   * Buyer identity. Default buyer identity is passed to cartCreate.
   */
  buyerIdentity?: CartBuyerIdentityInput;
};

/**
 * The handler returns the following default methods. Any [custom](/docs/api/hydrogen/utilities/createcarthandler#example-custom-methods) or overwritten methods will also be available in the returned cart instance.
 * @publicDocs */
export type HydrogenCartForDocs = {
  /**
   * Adds items to the cart.
   * If the cart doesn't exist, a new one will be created.
   */
  addLines?: CartLinesAddFunction;
  /**
   * Adds a delivery address to the cart.
   */
  addDeliveryAddresses?: CartDeliveryAddressesAddFunction;
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
   * Removes a delivery address from the cart
   */
  removeDeliveryAddresses?: CartDeliveryAddressesRemoveFunction;
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
   * Update cart delivery addresses.
   */
  updateDeliveryAddresses?: CartDeliveryAddressesUpdateFunction;
  /**
   * Replace all delivery addresses on the cart.
   */
  replaceDeliveryAddresses?: CartDeliveryAddressesReplaceFunction;
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
   * Updates gift card codes in the cart.
   */
  updateGiftCardCodes?: CartGiftCardCodesUpdateFunction;
  /**
   * Adds gift card codes to the cart without replacing existing ones.
   */
  addGiftCardCodes?: CartGiftCardCodesAddFunction;
  /**
   * Removes gift card codes from the cart.
   */
  removeGiftCardCodes?: CartGiftCardCodesRemoveFunction;
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
