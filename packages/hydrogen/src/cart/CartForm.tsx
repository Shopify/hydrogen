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
  action: 'AttributesUpdateInput';
  inputs: {
    attributes: AttributeInput[];
  } & OtherFormData;
};

type CartBuyerIdentityUpdateFormInput = {
  action: 'BuyerIdentityUpdate';
  inputs: {
    buyerIdentity: CartBuyerIdentityInput;
  } & OtherFormData;
};

type CartCreateFormInput = {
  action: 'Create';
  inputs: {
    input: CartInput;
  } & OtherFormData;
};

type CartDiscountCodesUpdateFormInput = {
  action: 'DiscountCodesUpdate';
  inputs: {
    discountCodes: string[];
  } & OtherFormData;
};

type CartLinesAddProps = {
  action: 'LinesAdd';
  inputs: {
    lines: CartLineInput[];
  } & OtherFormData;
};

type CartLinesUpdateProps = {
  action: 'LinesUpdate';
  inputs: {
    lines: CartLineUpdateInput[];
  } & OtherFormData;
};

type CartLinesRemoveFormInput = {
  action: 'LinesRemove';
  inputs: {
    lineIds: string[];
  } & OtherFormData;
};

type CartNoteUpdateFormInput = {
  action: 'NoteUpdate';
  inputs: {
    note: string;
  } & OtherFormData;
};

type CartSelectedDeliveryOptionsUpdateFormInput = {
  action: 'SelectedDeliveryOptionsUpdate';
  inputs: {
    selectedDeliveryOptions: CartSelectedDeliveryOptionInput[];
  } & OtherFormData;
};

type CartMetafieldsSetFormInput = {
  action: 'MetafieldsSet';
  inputs: {
    metafields: MetafieldWithoutOwnerId[];
  } & OtherFormData;
};

type CartMetafieldDeleteFormInput = {
  action: 'MetafieldsDelete';
  inputs: {
    key: Scalars['String'];
  } & OtherFormData;
};

type CartCustomFormInput = {
  action: 'Custom';
  inputs: OtherFormData;
};

type CartFormCommonProps = {
  children?:
    | React.ReactNode
    | ((fetcher: FetcherWithComponents<any>) => React.ReactNode);
  route?: string;
};

export type CartActionInput =
  | CartAttributesUpdateFormInput
  | CartBuyerIdentityUpdateFormInput
  | CartCreateFormInput
  | CartDiscountCodesUpdateFormInput
  | CartLinesAddProps
  | CartLinesUpdateProps
  | CartLinesRemoveFormInput
  | CartNoteUpdateFormInput
  | CartSelectedDeliveryOptionsUpdateFormInput
  | CartMetafieldsSetFormInput
  | CartMetafieldDeleteFormInput
  | CartCustomFormInput;

type CartFormProps = CartActionInput & CartFormCommonProps;

const INPUT_NAME = 'cartFormInput';

export function CartForm({
  children,
  action,
  inputs,
  route,
}: CartFormProps): JSX.Element {
  const fetcher = useFetcher();

  return (
    <fetcher.Form action={route || ''} method="post">
      {(action || inputs) && (
        <input
          type="hidden"
          name={INPUT_NAME}
          value={JSON.stringify({action, ...inputs})}
        />
      )}
      {typeof children === 'function' ? children(fetcher) : children}
    </fetcher.Form>
  );
}
CartForm.INPUT_NAME = INPUT_NAME;
CartForm.ACTIONS = {
  AttributesUpdateInput: 'AttributesUpdateInput',
  BuyerIdentityUpdate: 'BuyerIdentityUpdate',
  Create: 'Create',
  DiscountCodesUpdate: 'DiscountCodesUpdate',
  LinesAdd: 'LinesAdd',
  LinesRemove: 'LinesRemove',
  LinesUpdate: 'LinesUpdate',
  NoteUpdate: 'NoteUpdate',
  SelectedDeliveryOptionsUpdate: 'SelectedDeliveryOptionsUpdate',
  MetafieldsSet: 'MetafieldsSet',
  MetafieldsDelete: 'MetafieldsDelete',
  Custom: 'Custom',
} as const;

export function getFormInput(formData: any): CartActionInput {
  const formInputs: CartActionInput = formData.has(INPUT_NAME)
    ? JSON.parse(String(formData.get(INPUT_NAME)))
    : {};

  return formInputs;
}
