import {ReactNode, useEffect, useState} from 'react';
import {useCart} from './CartProvider.js';
import {BaseButton, BaseButtonProps} from './BaseButton.js';

type ChildrenProps = {
  /** A `ReactNode` element. */
  children: ReactNode;
};
type CartCheckoutButtonProps = Omit<BaseButtonProps<'button'>, 'onClick'> &
  ChildrenProps;

/**
 * The `CartCheckoutButton` component renders a button that redirects to the checkout URL for the cart.
 * It must be a descendent of a `CartProvider` component.
 */
export function CartCheckoutButton(props: CartCheckoutButtonProps) {
  const [requestedCheckout, setRequestedCheckout] = useState(false);
  const {status, checkoutUrl} = useCart();
  const {children, ...passthroughProps} = props;

  useEffect(() => {
    if (requestedCheckout && checkoutUrl && status === 'idle') {
      window.location.href = checkoutUrl;
    }
  }, [requestedCheckout, status, checkoutUrl]);

  return (
    <BaseButton
      {...passthroughProps}
      disabled={requestedCheckout || passthroughProps.disabled}
      onClick={() => setRequestedCheckout(true)}
    >
      {children}
    </BaseButton>
  );
}
