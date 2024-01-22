import React, {useCallback} from 'react';
import {multipass} from '~/lib/multipass/multipass';

type MultipassCheckoutButtonProps = {
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
export function MultipassCheckoutButton(props: MultipassCheckoutButtonProps) {
  const {children, onClick, checkoutUrl, redirect = true} = props;

  const checkoutHandler = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      event.preventDefault();
      if (!checkoutUrl) return;

      if (typeof onClick === 'function') {
        onClick();
      }

      /*
       * If they user is logged in we persist it in the checkout,
       * otherwise we log them out of the checkout too.
       */
      return await multipass({return_to: checkoutUrl, redirect});
    },
    [redirect, checkoutUrl, onClick],
  );

  return <button onClick={checkoutHandler}>{children}</button>;
}
