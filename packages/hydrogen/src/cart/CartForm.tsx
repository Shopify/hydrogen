import {type FetcherWithComponents, useFetcher} from '@remix-run/react';
import {type MetafieldWithoutOwnerId} from './cart-types';
import React from 'react';
import {
  AttributeInput,
  CartBuyerIdentityInput,
  CartInput,
  CartLineInput,
  CartLineUpdateInput,
  CartSelectedDeliveryOptionInput,
  Scalars,
} from '@shopify/hydrogen-react/storefront-api-types';

type OtherFormData = {
  [key: string]: unknown;
};

type CartAttributesUpdateFormInput = {
  action: 'CartAttributesUpdateInput';
  attributes: AttributeInput[];
};

type CartBuyerIdentityUpdateFormInput = {
  action: 'CartBuyerIdentityUpdate';
  buyerIdentity: CartBuyerIdentityInput;
};

type CartCreateFormInput = {
  action: 'CartCreate';
  input: CartInput;
};

type CartDiscountCodesUpdateFormInput = {
  action: 'CartDiscountCodesUpdate';
  discountCodes: string[];
};

type CartLinesAddFormInput = {
  action: 'CartLinesAdd';
  lines: CartLineInput[];
};

type CartLinesUpdateFormInput = {
  action: 'CartLinesUpdate';
  lines: CartLineUpdateInput[];
};

type CartLinesRemoveFormInput = {
  action: 'CartLinesRemove';
  lineIds: string[];
};

type CartNoteUpdateFormInput = {
  action: 'CartNoteUpdate';
  note: string;
};

type CartSelectedDeliveryOptionsUpdateFormInput = {
  action: 'CartSelectedDeliveryOptionsUpdate';
  selectedDeliveryOptions: CartSelectedDeliveryOptionInput[];
};

type CartMetafieldsSetFormInput = {
  action: 'CartMetafieldsSet';
  metafields: MetafieldWithoutOwnerId[];
};

type CartMetafieldDeleteFormInput = {
  action: 'CartMetafieldsDelete';
  key: Scalars['String'];
};

type CartActionFormInput = {
  action: string;
};

export type CartFormInput =
  | (CartAttributesUpdateFormInput & OtherFormData)
  | (CartBuyerIdentityUpdateFormInput & OtherFormData)
  | (CartCreateFormInput & OtherFormData)
  | (CartDiscountCodesUpdateFormInput & OtherFormData)
  | (CartLinesAddFormInput & OtherFormData)
  | (CartLinesRemoveFormInput & OtherFormData)
  | (CartLinesUpdateFormInput & OtherFormData)
  | (CartNoteUpdateFormInput & OtherFormData)
  | (CartSelectedDeliveryOptionsUpdateFormInput & OtherFormData)
  | (CartMetafieldsSetFormInput & OtherFormData)
  | (CartMetafieldDeleteFormInput & OtherFormData)
  | (CartActionFormInput & OtherFormData);

type CartFormProps = {
  children?:
    | React.ReactNode
    | ((fetcher: FetcherWithComponents<any>) => React.ReactNode);
  formInput?: CartFormInput;
  route?: string;
};

const CART_FORM_INPUT_NAME = 'cartFormInput';

export function CartForm({children, formInput, route}: CartFormProps) {
  const fetcher = useFetcher();

  return (
    <fetcher.Form action={route || ''} method="post">
      {formInput && (
        <input
          type="hidden"
          name={CART_FORM_INPUT_NAME}
          value={JSON.stringify(formInput || {})}
        />
      )}
      {typeof children === 'function' ? children(fetcher) : children}
    </fetcher.Form>
  );
}

export type FormInput = {
  action: CartFormInput['action'];
  cartInputs: Record<string, unknown>;
};

// Not sure if it is possible to return cartInput as an inferred type
// based on the action value. Even if we can, what do we do with the other
// form data that doesn't meet the type requirements?
export function getFormInput(formData: any): FormInput {
  const {action, ...cartInputs}: CartFormInput = formData.has(
    CART_FORM_INPUT_NAME,
  )
    ? JSON.parse(String(formData.get(CART_FORM_INPUT_NAME)))
    : {};

  return {
    action,
    cartInputs,
  };
}
