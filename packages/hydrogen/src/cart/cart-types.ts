import type {
  AttributeInput,
  CartBuyerIdentityInput,
  CartInput,
  CartLineInput,
  CartLineUpdateInput,
  CartMetafieldDeleteInput,
  CartMetafieldsSetInput,
  Scalars,
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

export type CartGet = {
  action: 'CartGet';
};

export type CartAttributesUpdateInput = {
  action: 'CartAttributesUpdateInput';
  attribute: AttributeInput;
};

export type CartBuyerIdentityUpdate = {
  action: 'CartBuyerIdentityUpdate';
  buyerIdentity: CartBuyerIdentityInput;
};

export type CartCreate = {
  action: 'CartCreate';
  input: CartInput;
};

export type CartDiscountCodesUpdate = {
  action: 'CartDiscountCodesUpdate';
  discountCodes: string[];
};

export type CartLinesAdd = {
  action: 'CartLinesAdd';
  lines: CartLineInput[];
};

export type CartLinesRemove = {
  action: 'CartLinesRemove';
  lineIds: string[];
};

export type CartLinesUpdate = {
  action: 'CartLinesUpdate';
  lines: CartLineUpdateInput[];
};
export type CartNoteUpdate = {
  action: 'CartNoteUpdate';
  note: string;
};
export type CartSelectedDeliveryOptionsUpdate = {
  action: 'CartSelectedDeliveryOptionsUpdate';
  selectedDeliveryOptions: CartSelectedDeliveryOptionsUpdate;
};
export type CartMetafieldsSet = {
  action: 'CartMetafieldsSet';
  metafields: Omit<CartMetafieldsSetInput, 'ownerId'>[];
};

export type CartMetafieldDelete = {
  action: 'CartMetafieldsDelete';
  key: Scalars['String'];
};

type OtherFormData = {
  [key: string]: unknown;
};

export type CartFormInput =
  | (CartGet & OtherFormData)
  | (CartAttributesUpdateInput & OtherFormData)
  | (CartBuyerIdentityUpdate & OtherFormData)
  | (CartCreate & OtherFormData)
  | (CartDiscountCodesUpdate & OtherFormData)
  | (CartLinesAdd & OtherFormData)
  | (CartLinesRemove & OtherFormData)
  | (CartLinesUpdate & OtherFormData)
  | (CartNoteUpdate & OtherFormData)
  | (CartSelectedDeliveryOptionsUpdate & OtherFormData)
  | (CartMetafieldsSet & OtherFormData)
  | (CartMetafieldDelete & OtherFormData);
