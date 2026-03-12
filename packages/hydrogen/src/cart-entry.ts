// Framework-agnostic cart utilities — no React Router dependency
export {cartGetIdDefault} from './cart/cartGetIdDefault';
export {cartSetIdDefault, type CookieOptions} from './cart/cartSetIdDefault';
export {
  type CartMethodFactory,
  createCartHandler,
} from './cart/createCartHandler';
export type {
  CartQueryDataReturn,
  CartQueryOptions,
  CartQueryReturn,
  CartReturn,
  MetafieldWithoutOwnerId,
} from './cart/queries/cart-types';

// Default cart fragments
export {DEFAULT_CART_FRAGMENT} from './cart/queries/cartGetDefault';
export {
  MINIMAL_CART_FRAGMENT,
  DEFAULT_CART_MUTATION_FRAGMENT,
} from './cart/queries/cart-fragments';

// All query/mutation defaults
export {cartAttributesUpdateDefault} from './cart/queries/cartAttributesUpdateDefault';
export {cartBuyerIdentityUpdateDefault} from './cart/queries/cartBuyerIdentityUpdateDefault';
export {cartCreateDefault} from './cart/queries/cartCreateDefault';
export {cartDeliveryAddressesAddDefault} from './cart/queries/cartDeliveryAddressesAddDefault';
export {cartDeliveryAddressesRemoveDefault} from './cart/queries/cartDeliveryAddressesRemoveDefault';
export {cartDeliveryAddressesReplaceDefault} from './cart/queries/cartDeliveryAddressesReplaceDefault';
export {cartDeliveryAddressesUpdateDefault} from './cart/queries/cartDeliveryAddressesUpdateDefault';
export {cartDiscountCodesUpdateDefault} from './cart/queries/cartDiscountCodesUpdateDefault';
export {cartGetDefault} from './cart/queries/cartGetDefault';
export {cartGiftCardCodesAddDefault} from './cart/queries/cartGiftCardCodesAddDefault';
export {cartGiftCardCodesRemoveDefault} from './cart/queries/cartGiftCardCodesRemoveDefault';
export {cartGiftCardCodesUpdateDefault} from './cart/queries/cartGiftCardCodeUpdateDefault';
export {cartLinesAddDefault} from './cart/queries/cartLinesAddDefault';
export {cartLinesRemoveDefault} from './cart/queries/cartLinesRemoveDefault';
export {cartLinesUpdateDefault} from './cart/queries/cartLinesUpdateDefault';
export {cartMetafieldDeleteDefault} from './cart/queries/cartMetafieldDeleteDefault';
export {cartMetafieldsSetDefault} from './cart/queries/cartMetafieldsSetDefault';
export {cartNoteUpdateDefault} from './cart/queries/cartNoteUpdateDefault';
export {cartSelectedDeliveryOptionsUpdateDefault} from './cart/queries/cartSelectedDeliveryOptionsUpdateDefault';
