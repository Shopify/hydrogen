import type {Storefront} from '../storefront';
import type {CustomerAccount} from '../customer/types';
import type {CartQueryOptions} from './queries/cart-types';
import type {CartGetFunction} from './queries/cartGetDefault';
import type {CartCreateFunction} from './queries/cartCreateDefault';
import type {CartLinesAddFunction} from './queries/cartLinesAddDefault';
import type {CartLinesUpdateFunction} from './queries/cartLinesUpdateDefault';
import type {CartLinesRemoveFunction} from './queries/cartLinesRemoveDefault';
import type {CartDiscountCodesUpdateFunction} from './queries/cartDiscountCodesUpdateDefault';
import type {CartBuyerIdentityUpdateFunction} from './queries/cartBuyerIdentityUpdateDefault';
import type {CartNoteUpdateFunction} from './queries/cartNoteUpdateDefault';
import type {CartSelectedDeliveryOptionsUpdateFunction} from './queries/cartSelectedDeliveryOptionsUpdateDefault';
import type {CartAttributesUpdateFunction} from './queries/cartAttributesUpdateDefault';
import type {CartMetafieldsSetFunction} from './queries/cartMetafieldsSetDefault';
import type {CartMetafieldDeleteFunction} from './queries/cartMetafieldDeleteDefault';
import type {CartGiftCardCodesUpdateFunction} from './queries/cartGiftCardCodeUpdateDefault';
import type {CartGiftCardCodesAddFunction} from './queries/cartGiftCardCodesAddDefault';
import type {CartGiftCardCodesRemoveFunction} from './queries/cartGiftCardCodesRemoveDefault';
import type {CartDeliveryAddressesAddFunction} from './queries/cartDeliveryAddressesAddDefault';
import type {CartDeliveryAddressesRemoveFunction} from './queries/cartDeliveryAddressesRemoveDefault';
import type {CartDeliveryAddressesUpdateFunction} from './queries/cartDeliveryAddressesUpdateDefault';
import type {CartDeliveryAddressesReplaceFunction} from './queries/cartDeliveryAddressesReplaceDefault';
import type {
  CartBuyerIdentityInput,
  CartInput,
} from '@shopify/hydrogen-react/storefront-api-types';

/**
 * A factory function that accepts CartQueryOptions and returns a cart method.
 */
export type CartMethodFactory<T> = (options: CartQueryOptions) => T;

export type CustomMethodsBase = Record<string, Function>;

/**
 * Options for createCartHandler with explicit method registration.
 */
export type CartHandlerOptions<
  TMethods extends Record<string, CartMethodFactory<any>>,
  TCustomMethods extends CustomMethodsBase = {},
> = {
  storefront: Storefront;
  customerAccount?: CustomerAccount;
  getCartId: () => string | undefined;
  setCartId: (cartId: string) => Headers;
  buyerIdentity?: CartBuyerIdentityInput;
  methods: TMethods;
  customMethods?: TCustomMethods;
};

/**
 * Infers the resolved method types from a record of method factories.
 */
type InferMethods<T extends Record<string, CartMethodFactory<any>>> = {
  [K in keyof T]: ReturnType<T[K]>;
};

/**
 * The return type of createCartHandler — resolved methods + getCartId/setCartId + custom methods.
 */
export type CartHandlerResult<
  TMethods extends Record<string, CartMethodFactory<any>>,
  TCustomMethods extends CustomMethodsBase = {},
> = InferMethods<TMethods> & {
  getCartId: () => string | undefined;
  setCartId: (cartId: string) => Headers;
} & TCustomMethods;

/**
 * The full HydrogenCart type with all methods — returned by createHydrogenCart.
 */
export type HydrogenCart = {
  get: CartGetFunction;
  getCartId: () => string | undefined;
  setCartId: (cartId: string) => Headers;
  create: CartCreateFunction;
  addLines: CartLinesAddFunction;
  updateLines: CartLinesUpdateFunction;
  removeLines: CartLinesRemoveFunction;
  updateDiscountCodes: CartDiscountCodesUpdateFunction;
  updateGiftCardCodes: CartGiftCardCodesUpdateFunction;
  addGiftCardCodes: CartGiftCardCodesAddFunction;
  removeGiftCardCodes: CartGiftCardCodesRemoveFunction;
  updateBuyerIdentity: CartBuyerIdentityUpdateFunction;
  updateNote: CartNoteUpdateFunction;
  updateSelectedDeliveryOption: CartSelectedDeliveryOptionsUpdateFunction;
  updateAttributes: CartAttributesUpdateFunction;
  setMetafields: CartMetafieldsSetFunction;
  deleteMetafield: CartMetafieldDeleteFunction;
  /**
   * Adds delivery addresses to the cart.
   */
  addDeliveryAddresses: CartDeliveryAddressesAddFunction;
  /**
   * Removes delivery addresses from the cart.
   */
  removeDeliveryAddresses: CartDeliveryAddressesRemoveFunction;
  /**
   * Updates delivery addresses in the cart.
   */
  updateDeliveryAddresses: CartDeliveryAddressesUpdateFunction;
  /**
   * Replaces all delivery addresses on the cart.
   */
  replaceDeliveryAddresses: CartDeliveryAddressesReplaceFunction;
};

export type HydrogenCartCustom<
  TCustomMethods extends Partial<HydrogenCart> & CustomMethodsBase,
> = Omit<HydrogenCart, keyof TCustomMethods> & TCustomMethods;
export type CartHandlerReturn<TCustomMethods extends CustomMethodsBase> =
  | HydrogenCartCustom<TCustomMethods>
  | HydrogenCart;

// Methods that support auto-create (will call create if no cartId exists)
const AUTO_CREATE_METHODS = new Set([
  'addLines',
  'updateDiscountCodes',
  'updateBuyerIdentity',
  'updateNote',
  'updateAttributes',
  'setMetafields',
  'updateGiftCardCodes',
]);

export function createCartHandler<
  TMethods extends Record<string, CartMethodFactory<any>>,
  TCustomMethods extends CustomMethodsBase = {},
>(
  options: CartHandlerOptions<TMethods, TCustomMethods>,
): CartHandlerResult<TMethods, TCustomMethods> {
  const {
    getCartId: _getCartId,
    setCartId,
    storefront,
    customerAccount,
    buyerIdentity,
    methods: methodFactories,
    customMethods,
  } = options;

  // Mutable cartId ref shared across all methods in the same request
  let cartId = _getCartId();
  const getCartId = () => cartId || _getCartId();

  const queryOptions: CartQueryOptions = {
    storefront,
    getCartId,
    customerAccount,
  };

  const resolvedMethods: Record<string, any> = {};

  // First, resolve the create method if it exists (needed for auto-create wrapping)
  let cartCreate: CartCreateFunction | undefined;
  if ('create' in methodFactories) {
    const _cartCreate = methodFactories.create(
      queryOptions,
    ) as CartCreateFunction;
    // Wrap create to merge default buyerIdentity and update cartId ref
    cartCreate = async function (...args: Parameters<CartCreateFunction>) {
      args[0] = {
        ...args[0],
        buyerIdentity: {
          ...buyerIdentity,
          ...args[0].buyerIdentity,
        },
      };
      const result = await _cartCreate(...args);
      cartId = result?.cart?.id;
      return result;
    };
    resolvedMethods.create = cartCreate;
  }

  // Resolve all other methods
  for (const [name, factory] of Object.entries(methodFactories)) {
    if (name === 'create') continue; // Already handled

    const method = factory(queryOptions);

    // Apply auto-create wrapping for known methods if create is registered
    if (AUTO_CREATE_METHODS.has(name) && cartCreate) {
      resolvedMethods[name] = wrapWithAutoCreate(
        name,
        method,
        cartCreate,
        getCartId,
        buyerIdentity,
      );
    } else {
      resolvedMethods[name] = method;
    }
  }

  // Add getCartId and setCartId
  resolvedMethods.getCartId = getCartId;
  resolvedMethods.setCartId = setCartId;

  // Merge custom methods
  if (customMethods) {
    Object.assign(resolvedMethods, customMethods);
  }

  return resolvedMethods as CartHandlerResult<TMethods, TCustomMethods>;
}

function wrapWithAutoCreate(
  methodName: string,
  method: Function,
  cartCreate: CartCreateFunction,
  getCartId: () => string | undefined,
  buyerIdentity?: CartBuyerIdentityInput,
): Function {
  return async (input: any, optionalParams?: any) => {
    const currentCartId = getCartId();

    if (currentCartId || optionalParams?.cartId) {
      // Cart exists, use the normal method
      if (methodName === 'addLines') {
        // Strip optimistic data from lines
        const lines = input.map((line: any) => ({
          attributes: line.attributes,
          quantity: line.quantity,
          merchandiseId: line.merchandiseId,
          sellingPlanId: line.sellingPlanId,
          parent: line.parent,
        }));
        return method(lines, optionalParams);
      }
      return method(input, optionalParams);
    }

    // No cart exists, create one with the input
    const createInput: CartInput = {};
    switch (methodName) {
      case 'addLines': {
        const lines = input.map((line: any) => ({
          attributes: line.attributes,
          quantity: line.quantity,
          merchandiseId: line.merchandiseId,
          sellingPlanId: line.sellingPlanId,
          parent: line.parent,
        }));
        createInput.lines = lines;
        createInput.buyerIdentity = buyerIdentity;
        break;
      }
      case 'updateDiscountCodes':
        createInput.discountCodes = input;
        break;
      case 'updateGiftCardCodes':
        createInput.giftCardCodes = input;
        break;
      case 'updateBuyerIdentity':
        createInput.buyerIdentity = input;
        break;
      case 'updateNote':
        createInput.note = input;
        break;
      case 'updateAttributes':
        createInput.attributes = input;
        break;
      case 'setMetafields':
        createInput.metafields = input;
        break;
    }
    return cartCreate(createInput, optionalParams);
  };
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
   * The storefront client instance created by [`createStorefrontClient`](docs/api/hydrogen/utilities/createstorefrontclient).
   */
  storefront: Storefront;
  /**
   * An object of cart method factories. Each factory is called with CartQueryOptions
   * and returns the resolved method. Only methods you register are included in the
   * returned cart object, enabling tree-shaking of unused cart operations.
   */
  methods: Record<string, CartMethodFactory<any>>;
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
