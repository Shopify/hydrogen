import React, {useCallback, forwardRef} from 'react';
import {multipass} from '~/lib/multipass/multipass';

type MultipassCheckoutButtonProps = {
  as?: keyof React.ElementType;
  checkoutUrl: string;
  children: React.ReactNode;
  onClick?: () => void;
  redirect?: boolean;
};

/*
  This component attempts to persist the customer session
  state in the checkout by using multipass.
  Note: multipass checkout is a Shopify Plus+ feature only.
*/
export const MultipassCheckoutButton = forwardRef(
  (props: MultipassCheckoutButtonProps, ref: React.ReactElement) => {
    const {
      children,
      onClick,
      checkoutUrl,
      redirect = true,
      as = 'button',
    } = props;

    const Element: keyof React.ElementType = as;

    const checkoutHandler = useCallback(
      async (event) => {
        event.preventDefault();
        if (!checkoutUrl) return;

        if (typeof onClick === 'function') {
          onClick();
        }

        // If they user is logged in we persist it in the checkout,
        // otherwise we log them out of the checkout too.
        return await multipass({
          return_to: checkoutUrl,
          redirect,
        });
      },
      [redirect, checkoutUrl, onClick],
    );

    return (
      <Element ref={ref} onClick={checkoutHandler}>
        {children}
      </Element>
    );
  },
);
