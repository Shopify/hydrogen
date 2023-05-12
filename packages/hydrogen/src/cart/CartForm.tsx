import {type FetcherWithComponents, useFetcher} from '@remix-run/react';
import {
  CartAttributesUpdateInput,
  CartBuyerIdentityUpdate,
  CartCreate,
  CartDiscountCodesUpdate,
  CartFormInputAction,
  CartGet,
  CartLinesAdd,
  CartLinesRemove,
  CartLinesUpdate,
  CartMetafieldDelete,
  CartMetafieldsSet,
  CartNoteUpdate,
  CartSelectedDeliveryOptionsUpdate,
} from './cart-types';
import React from 'react';
import {
  CartLineInput,
  CartLineUpdateInput,
} from '@shopify/hydrogen-react/storefront-api-types';

type OtherFormData = {
  [key: string]: unknown;
};

export type CartFormInput =
  | (CartGet & OtherFormData & {action: 'CartGet'})
  | (CartAttributesUpdateInput &
      OtherFormData & {action: 'CartAttributesUpdateInput'})
  | (CartBuyerIdentityUpdate &
      OtherFormData & {action: 'CartBuyerIdentityUpdate'})
  | (CartCreate & OtherFormData & {action: 'CartCreate'})
  | (CartDiscountCodesUpdate &
      OtherFormData & {action: 'CartDiscountCodesUpdate'})
  | (CartLinesAdd & OtherFormData & {action: 'CartLinesAdd'})
  | (CartLinesRemove & OtherFormData & {action: 'CartLinesRemove'})
  | (CartLinesUpdate & OtherFormData & {action: 'CartLinesUpdate'})
  | (CartNoteUpdate & OtherFormData & {action: 'CartNoteUpdate'})
  | (CartSelectedDeliveryOptionsUpdate &
      OtherFormData & {action: 'CartSelectedDeliveryOptionsUpdate'})
  | (CartMetafieldsSet & OtherFormData & {action: 'CartMetafieldsSet'})
  | (CartMetafieldDelete & OtherFormData & {action: 'CartMetafieldsDelete'});

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
  action: keyof typeof CartFormInputAction;
  cartInputs: Record<string, unknown>;
};

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
