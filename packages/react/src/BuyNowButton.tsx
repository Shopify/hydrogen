import {useEffect, useState, useCallback} from 'react';
import {useCart} from './CartProvider.js';
import {BaseButton, BaseButtonProps} from './BaseButton.js';

interface BuyNowButtonProps {
  /** The item quantity. Defaults to 1. */
  quantity?: number;
  /** The ID of the variant. */
  variantId: string;
  /** An array of cart line attributes that belong to the item being added to the cart. */
  attributes?: {
    key: string;
    value: string;
  }[];
}

/** The `BuyNowButton` component renders a button that adds an item to the cart and redirects the customer to checkout. */
export function BuyNowButton<AsType extends React.ElementType = 'button'>(
  props: BuyNowButtonProps & BaseButtonProps<AsType>
) {
  const {cartCreate, checkoutUrl} = useCart();
  const [loading, setLoading] = useState<boolean>(false);

  const {
    quantity,
    variantId,
    onClick,
    attributes,
    children,
    ...passthroughProps
  } = props;

  useEffect(() => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  }, [checkoutUrl]);

  const handleBuyNow = useCallback(() => {
    setLoading(true);
    cartCreate({
      lines: [
        {
          quantity: quantity ?? 1,
          merchandiseId: variantId,
          attributes,
        },
      ],
    });
  }, [cartCreate, quantity, variantId, attributes]);

  return (
    <BaseButton
      disabled={loading ?? passthroughProps.disabled}
      {...passthroughProps}
      onClick={onClick}
      defaultOnClick={handleBuyNow}
    >
      {children}
    </BaseButton>
  );
}
