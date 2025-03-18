import { type FetcherWithComponents, useFetcher } from '@remix-run/react';
import { type MetafieldWithoutOwnerId } from './queries/cart-types';
import type { ReactNode } from 'react';
import type {
  AttributeInput,
  CartBuyerIdentityInput,
  CartInput,
  CartLineInput,
  CartLineUpdateInput,
  CartSelectedDeliveryOptionInput,
  Scalars,
  CartSelectableAddressInput,
  CartSelectableAddressUpdateInput,
} from '@shopify/hydrogen-react/storefront-api-types';

type OtherFormData = {
  [key: string]: unknown;
};

type CartAttributesUpdateProps = {
  action: 'AttributesUpdateInput';
  inputs?: {
    attributes: AttributeInput[];
  } & OtherFormData;
};

type CartAttributesUpdateRequire = {
  action: 'AttributesUpdateInput';
  inputs: {
    attributes: AttributeInput[];
  } & OtherFormData;
};

type CartBuyerIdentityUpdateProps = {
  action: 'BuyerIdentityUpdate';
  inputs?: {
    buyerIdentity: CartBuyerIdentityInput;
  } & OtherFormData;
};

type CartBuyerIdentityUpdateRequire = {
  action: 'BuyerIdentityUpdate';
  inputs: {
    buyerIdentity: CartBuyerIdentityInput;
  } & OtherFormData;
};

type CartCreateProps = {
  action: 'Create';
  inputs?: {
    input: CartInput;
  } & OtherFormData;
};

type CartCreateRequire = {
  action: 'Create';
  inputs: {
    input: CartInput;
  } & OtherFormData;
};

type CartDiscountCodesUpdateProps = {
  action: 'DiscountCodesUpdate';
  inputs?: {
    discountCodes: string[];
  } & OtherFormData;
};

type CartDiscountCodesUpdateRequire = {
  action: 'DiscountCodesUpdate';
  inputs: {
    discountCodes: string[];
  } & OtherFormData;
};

type CartGiftCardCodesUpdateProps = {
  action: 'GiftCardCodesUpdate';
  inputs?: {
    giftCardCodes: string[];
  } & OtherFormData;
};

type CartGiftCardCodesUpdateRequire = {
  action: 'GiftCardCodesUpdate';
  inputs: {
    giftCardCodes: string[];
  } & OtherFormData;
};

export type OptimisticCartLineInput = CartLineInput & {
  selectedVariant?: unknown;
};

type CartLinesAddProps = {
  action: 'LinesAdd';
  inputs?: {
    lines: Array<OptimisticCartLineInput>;
  } & OtherFormData;
};

type CartLinesAddRequire = {
  action: 'LinesAdd';
  inputs: {
    lines: Array<OptimisticCartLineInput>;
  } & OtherFormData;
};

type CartLinesUpdateProps = {
  action: 'LinesUpdate';
  inputs?: {
    lines: CartLineUpdateInput[];
  } & OtherFormData;
};

type CartLinesUpdateRequire = {
  action: 'LinesUpdate';
  inputs: {
    lines: CartLineUpdateInput[];
  } & OtherFormData;
};

type CartLinesRemoveProps = {
  action: 'LinesRemove';
  inputs?: {
    lineIds: string[];
  } & OtherFormData;
};

type CartLinesRemoveRequire = {
  action: 'LinesRemove';
  inputs: {
    lineIds: string[];
  } & OtherFormData;
};

type CartNoteUpdateProps = {
  action: 'NoteUpdate';
  inputs?: {
    note: string;
  } & OtherFormData;
};

type CartNoteUpdateRequire = {
  action: 'NoteUpdate';
  inputs: {
    note: string;
  } & OtherFormData;
};

type CartSelectedDeliveryOptionsUpdateProps = {
  action: 'SelectedDeliveryOptionsUpdate';
  inputs?: {
    selectedDeliveryOptions: CartSelectedDeliveryOptionInput[];
  } & OtherFormData;
};

type CartSelectedDeliveryOptionsUpdateRequire = {
  action: 'SelectedDeliveryOptionsUpdate';
  inputs: {
    selectedDeliveryOptions: CartSelectedDeliveryOptionInput[];
  } & OtherFormData;
};

type CartMetafieldsSetProps = {
  action: 'MetafieldsSet';
  inputs?: {
    metafields: MetafieldWithoutOwnerId[];
  } & OtherFormData;
};

type CartMetafieldsSetRequire = {
  action: 'MetafieldsSet';
  inputs: {
    metafields: MetafieldWithoutOwnerId[];
  } & OtherFormData;
};

type CartMetafieldDeleteProps = {
  action: 'MetafieldsDelete';
  inputs?: {
    key: Scalars['String']['input'];
  } & OtherFormData;
};

type CartMetafieldDeleteRequire = {
  action: 'MetafieldsDelete';
  inputs: {
    key: Scalars['String']['input'];
  } & OtherFormData;
};

type CartDeliveryAddressesAddProps = {
  action: 'DeliveryAddressesAdd';
  inputs?: {
    addresses: Array<CartSelectableAddressInput>;
  } & OtherFormData;
}

type CartDeliveryAddressesAddRequire = {
  action: 'DeliveryAddressesAdd';
  inputs: {
    addresses: Array<CartSelectableAddressInput>;
  } & OtherFormData;
}

type CartDeliveryAddressesRemoveProps = {
  action: 'DeliveryAddressesRemove';
  inputs?: {
    addressIds: Array<string> | Array<Scalars['ID']['input']>;
  } & OtherFormData;
}

type CartDeliveryAddressesRemoveRequire = {
  action: 'DeliveryAddressesRemove';
  inputs: {
    addressIds: Array<string> | Array<Scalars['ID']['input']>;
  } & OtherFormData;
}

type CartDeliveryAddressesUpdateProps = {
  action: 'DeliveryAddressesUpdate';
  inputs?: {
    addresses: Array<CartSelectableAddressUpdateInput>
  } & OtherFormData;
}

type CartDeliveryAddressesUpdateRequire = {
  action: 'DeliveryAddressesUpdate';
  inputs: {
    addresses: Array<CartSelectableAddressUpdateInput>
  } & OtherFormData;
}

type CartCustomProps = {
  action: `Custom${string}`;
  inputs?: Record<string, unknown>;
};

type CartCustomRequire = {
  action: `Custom${string}`;
  inputs: Record<string, unknown>;
};

type CartFormCommonProps = {
  /**
   * Children nodes of CartForm.
   * Children can be a render prop that receives the fetcher.
   */
  children: ReactNode | ((fetcher: FetcherWithComponents<any>) => ReactNode);
  /**
   * The route to submit the form to. Defaults to the current route.
   */
  route?: string;
  /**
   * Optional key to use for the fetcher.
   * @see https://remix.run/hooks/use-fetcher#key
   */
  fetcherKey?: string;
};

type CartActionInputProps =
  | CartAttributesUpdateProps
  | CartBuyerIdentityUpdateProps
  | CartCreateProps
  | CartDiscountCodesUpdateProps
  | CartGiftCardCodesUpdateProps
  | CartLinesAddProps
  | CartLinesUpdateProps
  | CartLinesRemoveProps
  | CartNoteUpdateProps
  | CartSelectedDeliveryOptionsUpdateProps
  | CartMetafieldsSetProps
  | CartMetafieldDeleteProps
  | CartDeliveryAddressesAddProps
  | CartDeliveryAddressesRemoveProps
  | CartDeliveryAddressesUpdateProps
  | CartCustomProps;

export type CartActionInput =
  | CartAttributesUpdateRequire
  | CartBuyerIdentityUpdateRequire
  | CartCreateRequire
  | CartDiscountCodesUpdateRequire
  | CartGiftCardCodesUpdateRequire
  | CartLinesAddRequire
  | CartLinesUpdateRequire
  | CartLinesRemoveRequire
  | CartNoteUpdateRequire
  | CartSelectedDeliveryOptionsUpdateRequire
  | CartMetafieldsSetRequire
  | CartMetafieldDeleteRequire
  | CartDeliveryAddressesAddRequire
  | CartDeliveryAddressesRemoveRequire
  | CartDeliveryAddressesUpdateRequire
  | CartCustomRequire;

type CartFormProps = CartActionInputProps & CartFormCommonProps;

const INPUT_NAME = 'cartFormInput';

export function CartForm({
  children,
  action,
  inputs,
  route,
  fetcherKey,
}: CartFormProps): JSX.Element {
  const fetcher = useFetcher({ key: fetcherKey });

  return (
    <fetcher.Form action={route || ''} method="post">
      {(action || inputs) && (
        <input
          type="hidden"
          name={INPUT_NAME}
          value={JSON.stringify({ action, inputs })}
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
  GiftCardCodesUpdate: 'GiftCardCodesUpdate',
  LinesAdd: 'LinesAdd',
  LinesRemove: 'LinesRemove',
  LinesUpdate: 'LinesUpdate',
  NoteUpdate: 'NoteUpdate',
  SelectedDeliveryOptionsUpdate: 'SelectedDeliveryOptionsUpdate',
  MetafieldsSet: 'MetafieldsSet',
  MetafieldDelete: 'MetafieldDelete',
  DeliveryAddressesAdd: 'DeliveryAddressesAdd',
  DeliveryAddressesUpdate: 'DeliveryAddressesUpdate',
  DeliveryAddressesRemove: 'DeliveryAddressesRemove',
} as const;

function getFormInput(formData: FormData): CartActionInput {
  // Get all form data
  const data: Record<string, unknown> = {};
  for (const pair of formData.entries()) {
    const key = pair[0];
    const values = formData.getAll(key);

    data[key] = values.length > 1 ? values : pair[1];
  }

  // Parse cartFormInput
  const { cartFormInput, ...otherData } = data;
  const { action, inputs }: CartActionInput = cartFormInput
    ? JSON.parse(String(cartFormInput))
    : {};


  return {
    action,
    inputs: {
      ...inputs,
      ...otherData,
    },
  } as unknown as CartActionInput;
}

/**
 * Converts form data into a CartActionInput object.
 *
 * This function takes a FormData object, extracts its entries, and constructs a CartActionInput object.
 * It parses the `cartFormInput` field if present and merges it with other form data.
 *
 * @param {FormData} formData - The form data to convert.
 * @returns {CartActionInput} - The resulting CartActionInput object.
 *
 * @example
 * const formData = new FormData();
 * formData.append('cartFormInput', JSON.stringify({ action: 'add', inputs: { productId: '123' } }));
 * formData.append('quantity', '2');
 * const cartActionInput = getFormInput(formData);
 * console.log(cartActionInput);
 * // Output: { action: 'add', inputs: { productId: '123', quantity: '2' } }
 */
CartForm.getFormInput = getFormInput;
