import * as React from 'react';
import type {Story} from '@ladle/react';
import {CartCheckoutButton} from './CartCheckoutButton.js';
import {CartProvider} from './CartProvider.js';
import {getCartMock} from './CartProvider.test.helpers.js';

type CartCheckoutButtonProps = React.ComponentPropsWithoutRef<
  typeof CartCheckoutButton
>;

const cart = getCartMock();

const Template: Story<CartCheckoutButtonProps> = (props) => {
  return (
    <CartProvider data={cart}>
      <CartCheckoutButton {...props}>Checkout</CartCheckoutButton>
    </CartProvider>
  );
};

export const Default = Template.bind({});
