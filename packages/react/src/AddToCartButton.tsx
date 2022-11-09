import {useCallback, useEffect, Ref, ReactNode, useState} from 'react';

import {useCart} from './CartProvider.js';
import {useProduct} from './ProductProvider.js';

interface AddToCartButtonProps {
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

/**
 * The `AddToCartButton` component renders a button that adds an item to the cart when pressed.
 * It must be a descendent of the `CartProvider` component.
 */
export function AddToCartButton<AsType extends React.ElementType = 'button'>(
  props: AddToCartButtonProps & BaseButtonProps<AsType>
) {
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
    passthroughProps.disabled;

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

export interface CustomBaseButtonProps<AsType> {
  /** Provide a React element or component to render as the underlying button. Note: for accessibility compliance, almost always you should use a `button` element, or a component that renders an underlying button. */
  as?: AsType;
  /** Any ReactNode elements. */
  children: ReactNode;
  /** Click event handler. Default behaviour triggers unless prevented */
  onClick?: (
    event?: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void | boolean;
  /** A default onClick behavior */
  defaultOnClick?: (
    event?: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void | boolean;
  /** A ref to the underlying button */
  buttonRef?: Ref<HTMLButtonElement>;
}

export type BaseButtonProps<AsType extends React.ElementType> =
  CustomBaseButtonProps<AsType> &
    Omit<
      React.ComponentPropsWithoutRef<AsType>,
      keyof CustomBaseButtonProps<AsType>
    >;

export function BaseButton<AsType extends React.ElementType = 'button'>(
  props: BaseButtonProps<AsType>
) {
  const {
    as,
    onClick,
    defaultOnClick,
    children,
    buttonRef,
    ...passthroughProps
  } = props;

  const handleOnClick = useCallback(
    (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      if (onClick) {
        const clickShouldContinue = onClick(event);
        if (
          (typeof clickShouldContinue === 'boolean' &&
            clickShouldContinue === false) ||
          event?.defaultPrevented
        )
          return;
      }

      defaultOnClick?.(event);
    },
    [defaultOnClick, onClick]
  );

  const Component = as || 'button';

  return (
    <Component ref={buttonRef} onClick={handleOnClick} {...passthroughProps}>
      {children}
    </Component>
  );
}
