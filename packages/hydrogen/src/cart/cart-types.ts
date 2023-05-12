import type {
  AttributeInput,
  CartBuyerIdentityInput,
  CartInput,
  CartLineInput,
  CartLineUpdateInput,
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

type CartOptionalInput = {
  cartId?: Scalars['ID'];
  language?: LanguageCode;
  country?: CountryCode;
};

export type CartGet = {
  numCartLines?: number;
} & CartOptionalInput;

export type CartAttributesUpdateInput = {
  attribute: AttributeInput;
} & CartOptionalInput;

export type CartBuyerIdentityUpdate = {
  buyerIdentity: CartBuyerIdentityInput;
} & CartOptionalInput;

export type CartCreate = {
  input: CartInput;
} & CartOptionalInput;

export type CartDiscountCodesUpdate = {
  discountCodes: string[];
} & CartOptionalInput;

export type CartLinesAdd = {
  lines: CartLineInput[];
} & CartOptionalInput;

export type CartLinesRemove = {
  lineIds: string[];
} & CartOptionalInput;

export type CartLinesUpdate = {
  lines: CartLineUpdateInput[];
} & CartOptionalInput;
export type CartNoteUpdate = {
  note: string;
} & CartOptionalInput;
export type CartSelectedDeliveryOptionsUpdate = {
  selectedDeliveryOptions: CartSelectedDeliveryOptionsUpdate;
} & CartOptionalInput;
export type CartMetafieldsSet = {
  metafields: Omit<CartMetafieldsSetInput, 'ownerId'>[];
} & CartOptionalInput;

export type CartMetafieldDelete = {
  key: Scalars['String'];
} & CartOptionalInput;
