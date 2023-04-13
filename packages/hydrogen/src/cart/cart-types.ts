import type {
  AttributeInput,
  CartBuyerIdentityInput,
  CartInput,
  CartLineInput,
  CartLineUpdateInput,
} from '@shopify/hydrogen-react/storefront-api-types';

export const CartFormInputAction = {
  CartAttributesUpdateInput: 'CartAttributesUpdateInput',
  CartBuyerIdentityUpdate: 'CartBuyerIdentityUpdate',
  CartCreate: 'CartCreate',
  CartDiscountCodesUpdate: 'CartDiscountCodesUpdate',
  CartLinesAdd: 'CartLinesAdd',
  CartLinesRemove: 'CartLinesRemove',
  CartLinesUpdate: 'CartLinesUpdate',
  CartNoteUpdate: 'CartNoteUpdate',
  CartSelectedDeliveryOptionsUpdate: 'CartSelectedDeliveryOptionsUpdate',
} as const;

export type CartAttributesUpdateInput = {
  action: 'CartAttributesUpdateInput';
  attribute: AttributeInput;
  [key: string]: unknown;
};

export type CartBuyerIdentityUpdate = {
  action: 'CartBuyerIdentityUpdate';
  buyerIdentity: CartBuyerIdentityInput;
  [key: string]: unknown;
};

export type CartCreate = {
  action: 'CartCreate';
  input: CartInput;
  [key: string]: unknown;
};

export type CartDiscountCodesUpdate = {
  action: 'CartDiscountCodesUpdate';
  discountCodes: string[];
  [key: string]: unknown;
};

export type CartLinesAdd = {
  action: 'CartLinesAdd';
  lines: CartLineInput[];
  [key: string]: unknown;
};

export type CartLinesRemove = {
  action: 'CartLinesRemove';
  lineIds: string[];
  [key: string]: unknown;
};

export type CartLinesUpdate = {
  action: 'CartLinesUpdate';
  lines: CartLineUpdateInput;
  [key: string]: unknown;
};
export type CartNoteUpdate = {
  action: 'CartNoteUpdate';
  note: string;
  [key: string]: unknown;
};
export type CartSelectedDeliveryOptionsUpdate = {
  action: 'CartSelectedDeliveryOptionsUpdate';
  selectedDeliveryOptions: CartSelectedDeliveryOptionsUpdate;
  [key: string]: unknown;
};

export type CartFormInput =
  | CartAttributesUpdateInput
  | CartBuyerIdentityUpdate
  | CartCreate
  | CartDiscountCodesUpdate
  | CartLinesAdd
  | CartLinesRemove
  | CartLinesUpdate
  | CartNoteUpdate
  | CartSelectedDeliveryOptionsUpdate;
