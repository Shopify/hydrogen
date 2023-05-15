import type {
  CartMetafieldsSetInput,
  Scalars,
  CountryCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';

export const CartFormInputAction = {
  CartGet: 'CartGet',
  CartAttributesUpdateInput: 'CartAttributesUpdateInput',
  CartBuyerIdentityUpdate: 'CartBuyerIdentityUpdate',
  CartCreate: 'CartCreate',
  CartDiscountCodesUpdate: 'CartDiscountCodesUpdate',
  CartLinesAdd: 'CartLinesAdd',
  CartLinesRemove: 'CartLinesRemove',
  CartLinesUpdate: 'CartLinesUpdate',
  CartNoteUpdate: 'CartNoteUpdate',
  CartSelectedDeliveryOptionsUpdate: 'CartSelectedDeliveryOptionsUpdate',
  CartMetafieldsSet: 'CartMetafieldsSet',
  CartMetafieldsDelete: 'CartMetafieldsDelete',
} as const;

export type CartOptionalInput = {
  cartId?: Scalars['ID'];
  language?: LanguageCode;
  country?: CountryCode;
};

export type MetafieldWithoutOwnerId = Omit<CartMetafieldsSetInput, 'ownerId'>;

export type CartGet = {
  numCartLines?: number;
} & CartOptionalInput;
