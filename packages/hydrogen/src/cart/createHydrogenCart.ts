import type {Storefront} from '../storefront';
import type {CustomerAccount} from '../customer/types';
import type {CartBuyerIdentityInput} from '@shopify/hydrogen-react/storefront-api-types';
import {
  createCartHandler,
  type HydrogenCart,
  type HydrogenCartCustom,
  type CustomMethodsBase,
} from './createCartHandler';
import {cartGetDefault} from './queries/cartGetDefault';
import {cartCreateDefault} from './queries/cartCreateDefault';
import {cartLinesAddDefault} from './queries/cartLinesAddDefault';
import {cartLinesUpdateDefault} from './queries/cartLinesUpdateDefault';
import {cartLinesRemoveDefault} from './queries/cartLinesRemoveDefault';
import {cartDiscountCodesUpdateDefault} from './queries/cartDiscountCodesUpdateDefault';
import {cartBuyerIdentityUpdateDefault} from './queries/cartBuyerIdentityUpdateDefault';
import {cartNoteUpdateDefault} from './queries/cartNoteUpdateDefault';
import {cartSelectedDeliveryOptionsUpdateDefault} from './queries/cartSelectedDeliveryOptionsUpdateDefault';
import {cartAttributesUpdateDefault} from './queries/cartAttributesUpdateDefault';
import {cartMetafieldsSetDefault} from './queries/cartMetafieldsSetDefault';
import {cartMetafieldDeleteDefault} from './queries/cartMetafieldDeleteDefault';
import {cartGiftCardCodesUpdateDefault} from './queries/cartGiftCardCodeUpdateDefault';
import {cartGiftCardCodesAddDefault} from './queries/cartGiftCardCodesAddDefault';
import {cartGiftCardCodesRemoveDefault} from './queries/cartGiftCardCodesRemoveDefault';
import {cartDeliveryAddressesAddDefault} from './queries/cartDeliveryAddressesAddDefault';
import {cartDeliveryAddressesRemoveDefault} from './queries/cartDeliveryAddressesRemoveDefault';
import {cartDeliveryAddressesUpdateDefault} from './queries/cartDeliveryAddressesUpdateDefault';
import {cartDeliveryAddressesReplaceDefault} from './queries/cartDeliveryAddressesReplaceDefault';

export type HydrogenCartOptions = {
  storefront: Storefront;
  customerAccount?: CustomerAccount;
  getCartId: () => string | undefined;
  setCartId: (cartId: string) => Headers;
  cartQueryFragment?: string;
  cartMutateFragment?: string;
  buyerIdentity?: CartBuyerIdentityInput;
};

export type HydrogenCartOptionsWithCustom<
  TCustomMethods extends CustomMethodsBase,
> = HydrogenCartOptions & {
  customMethods?: TCustomMethods;
};

export function createHydrogenCart(options: HydrogenCartOptions): HydrogenCart;
export function createHydrogenCart<TCustomMethods extends CustomMethodsBase>(
  options: HydrogenCartOptionsWithCustom<TCustomMethods>,
): HydrogenCartCustom<TCustomMethods>;
export function createHydrogenCart<TCustomMethods extends CustomMethodsBase>(
  options: HydrogenCartOptions | HydrogenCartOptionsWithCustom<TCustomMethods>,
): HydrogenCart | HydrogenCartCustom<TCustomMethods> {
  const {cartQueryFragment, cartMutateFragment, ...rest} = options;

  const customMethods =
    'customMethods' in options ? options.customMethods : undefined;

  return createCartHandler({
    ...rest,
    customMethods,
    methods: {
      get: cartGetDefault({query: cartQueryFragment}),
      create: cartCreateDefault({mutation: cartMutateFragment}),
      addLines: cartLinesAddDefault({mutation: cartMutateFragment}),
      updateLines: cartLinesUpdateDefault({mutation: cartMutateFragment}),
      removeLines: cartLinesRemoveDefault({mutation: cartMutateFragment}),
      updateDiscountCodes: cartDiscountCodesUpdateDefault({
        mutation: cartMutateFragment,
      }),
      updateGiftCardCodes: cartGiftCardCodesUpdateDefault({
        mutation: cartMutateFragment,
      }),
      addGiftCardCodes: cartGiftCardCodesAddDefault({
        mutation: cartMutateFragment,
      }),
      removeGiftCardCodes: cartGiftCardCodesRemoveDefault({
        mutation: cartMutateFragment,
      }),
      updateBuyerIdentity: cartBuyerIdentityUpdateDefault({
        mutation: cartMutateFragment,
      }),
      updateNote: cartNoteUpdateDefault({mutation: cartMutateFragment}),
      updateSelectedDeliveryOption: cartSelectedDeliveryOptionsUpdateDefault({
        mutation: cartMutateFragment,
      }),
      updateAttributes: cartAttributesUpdateDefault({
        mutation: cartMutateFragment,
      }),
      setMetafields: cartMetafieldsSetDefault(),
      deleteMetafield: cartMetafieldDeleteDefault(),
      addDeliveryAddresses: cartDeliveryAddressesAddDefault({
        mutation: cartMutateFragment,
      }),
      removeDeliveryAddresses: cartDeliveryAddressesRemoveDefault({
        mutation: cartMutateFragment,
      }),
      updateDeliveryAddresses: cartDeliveryAddressesUpdateDefault({
        mutation: cartMutateFragment,
      }),
      replaceDeliveryAddresses: cartDeliveryAddressesReplaceDefault({
        mutation: cartMutateFragment,
      }),
    },
  }) as HydrogenCart | HydrogenCartCustom<TCustomMethods>;
}

export type HydrogenCartOptionsForDocs<
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
