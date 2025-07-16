import {useCallback, useEffect, useState, type JSX} from 'react';
import {useCart} from './CartProvider.js';
import {useProduct} from './ProductProvider.js';
import {
  BaseButton,
  type CustomBaseButtonProps,
  type BaseButtonProps,
} from './BaseButton.js';
import * as React from 'react';

export interface AddToCartButtonPropsBase {
  /** An array of cart line attributes that belong to the item being added to the cart. */
  attributes?: {
    key: string;
    value: string;
  }[];
  /** The ID of the variant. */
  variantId?: string | null;
  /** The item quantity. */
  quantity?: number;
  /** The text that is announced by the screen reader when the item is being added to the cart. Used for accessibility purposes only and not displayed on the page. */
  accessibleAddingToCartLabel?: string;
  /** The selling plan ID of the subscription variant */
  sellingPlanId?: string;
}

export type AddToCartButtonProps<AsType extends React.ElementType = 'button'> =
  AddToCartButtonPropsBase & BaseButtonProps<AsType>;

/**
 * The `AddToCartButton` component renders a button that adds an item to the cart when pressed.
 * It must be a descendent of the `CartProvider` component.
 */
export function AddToCartButton<AsType extends React.ElementType = 'button'>(
  props: AddToCartButtonProps<AsType>,
): JSX.Element {
  const [addingItem, setAddingItem] = useState<boolean>(false);
  const {
    variantId: explicitVariantId,
    quantity = 1,
    attributes,
    sellingPlanId,
    onClick,
    children,
    accessibleAddingToCartLabel,
    ...passthroughProps
  } = props;
  const {status, linesAdd} = useCart();
  const {selectedVariant} = useProduct();
  const variantId = explicitVariantId ?? selectedVariant?.id ?? '';
  const disabled =
    explicitVariantId === null ||
    variantId === '' ||
    selectedVariant === null ||
    addingItem ||
    // Only certain 'as' types such as 'button' contain `disabled`
    (passthroughProps as {disabled?: boolean}).disabled;

  useEffect(() => {
    if (addingItem && status === 'idle') {
      setAddingItem(false);
    }
  }, [status, addingItem]);

  const handleAddItem = useCallback(() => {
    setAddingItem(true);
    linesAdd([
      {
        quantity,
        merchandiseId: variantId || '',
        attributes,
        sellingPlanId,
      },
    ]);
  }, [linesAdd, quantity, variantId, attributes, sellingPlanId]);

  return (
    <>
      <BaseButton
        {...passthroughProps}
        disabled={disabled}
        onClick={onClick}
        defaultOnClick={handleAddItem}
      >
        {children}
      </BaseButton>
      {accessibleAddingToCartLabel ? (
        <p
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            borderWidth: '0',
          }}
          role="alert"
          aria-live="assertive"
        >
          {addingItem ? accessibleAddingToCartLabel : null}
        </p>
      ) : null}
    </>
  );
}

// This is only for documentation purposes, and it is not used in the code.
export interface AddToCartButtonPropsForDocs<
  AsType extends React.ElementType = 'button',
> extends AddToCartButtonPropsBase,
    CustomBaseButtonProps<AsType> {}
