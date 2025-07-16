import {useEffect, useState, useCallback, type JSX} from 'react';
import {useCart} from './CartProvider.js';
import {
  BaseButton,
  type BaseButtonProps,
  type CustomBaseButtonProps,
} from './BaseButton.js';

interface BuyNowButtonPropsBase {
  /** The item quantity. Defaults to 1. */
  quantity?: number;
  /** The ID of the variant. */
  variantId: string;
  /** The selling plan ID of the subscription variant */
  sellingPlanId?: string;
  /** An array of cart line attributes that belong to the item being added to the cart. */
  attributes?: {
    key: string;
    value: string;
  }[];
}

type BuyNowButtonProps<AsType extends React.ElementType = 'button'> =
  BuyNowButtonPropsBase & BaseButtonProps<AsType>;

/**
 * The `BuyNowButton` component renders a button that adds an item to the cart and redirects the customer to checkout.
 * Must be a child of a `CartProvider` component.
 */
export function BuyNowButton<AsType extends React.ElementType = 'button'>(
  props: BuyNowButtonProps<AsType>,
): JSX.Element {
  const {cartCreate, checkoutUrl} = useCart();
  const [loading, setLoading] = useState<boolean>(false);

  const {
    quantity,
    variantId,
    sellingPlanId,
    onClick,
    attributes,
    children,
    ...passthroughProps
  } = props;

  useEffect(() => {
    if (loading && checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  }, [loading, checkoutUrl]);

  const handleBuyNow = useCallback(() => {
    setLoading(true);
    cartCreate({
      lines: [
        {
          quantity: quantity ?? 1,
          merchandiseId: variantId,
          attributes,
          sellingPlanId,
        },
      ],
    });
  }, [cartCreate, quantity, variantId, attributes, sellingPlanId]);

  return (
    <BaseButton
      // Only certain 'as' types such as 'button' contain `disabled`
      disabled={loading ?? (passthroughProps as {disabled?: boolean}).disabled}
      {...passthroughProps}
      onClick={onClick}
      defaultOnClick={handleBuyNow}
    >
      {children}
    </BaseButton>
  );
}

// This is only for documentation purposes, and it is not used in the code.
export interface BuyNowButtonPropsForDocs<
  AsType extends React.ElementType = 'button',
> extends BuyNowButtonPropsBase,
    CustomBaseButtonProps<AsType> {}
