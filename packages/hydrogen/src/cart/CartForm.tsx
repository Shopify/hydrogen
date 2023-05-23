import {type FetcherWithComponents, useFetcher} from '@remix-run/react';
import {type MetafieldWithoutOwnerId} from './queries/cart-types';
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

type CartAttributesUpdateProps = {
  action: 'AttributesUpdateInput';
  inputs: {
    attributes: AttributeInput[];
  } & OtherFormData;
};

type CartBuyerIdentityUpdateProps = {
  action: 'BuyerIdentityUpdate';
  inputs: {
    buyerIdentity: CartBuyerIdentityInput;
  } & OtherFormData;
};

type CartCreateProps = {
  action: 'Create';
  inputs: {
    input: CartInput;
  } & OtherFormData;
};

type CartDiscountCodesUpdateProps = {
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

type CartLinesRemoveProps = {
  action: 'LinesRemove';
  inputs: {
    lineIds: string[];
  } & OtherFormData;
};

type CartNoteUpdateProps = {
  action: 'NoteUpdate';
  inputs: {
    note: string;
  } & OtherFormData;
};

type CartSelectedDeliveryOptionsUpdateProps = {
  action: 'SelectedDeliveryOptionsUpdate';
  inputs: {
    selectedDeliveryOptions: CartSelectedDeliveryOptionInput[];
  } & OtherFormData;
};

type CartMetafieldsSetProps = {
  action: 'MetafieldsSet';
  inputs: {
    metafields: MetafieldWithoutOwnerId[];
  } & OtherFormData;
};

type CartMetafieldDeleteProps = {
  action: 'MetafieldsDelete';
  inputs: {
    key: Scalars['String'];
  } & OtherFormData;
};

type CartCustomProps = {
  action: 'Custom';
  inputs: Record<string, unknown>;
};

type CartFormCommonProps = {
  children?:
    | React.ReactNode
    | ((fetcher: FetcherWithComponents<any>) => React.ReactNode);
  route?: string;
};

export type CartActionInput =
  | CartAttributesUpdateProps
  | CartBuyerIdentityUpdateProps
  | CartCreateProps
  | CartDiscountCodesUpdateProps
  | CartLinesAddProps
  | CartLinesUpdateProps
  | CartLinesRemoveProps
  | CartNoteUpdateProps
  | CartSelectedDeliveryOptionsUpdateProps
  | CartMetafieldsSetProps
  | CartMetafieldDeleteProps
  | CartCustomProps;

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
  const {action, ...inputs}: CartActionInput = formData.has(INPUT_NAME)
    ? JSON.parse(String(formData.get(INPUT_NAME)))
    : {};

  return {
    action,
    inputs,
  } as unknown as CartActionInput;
}
