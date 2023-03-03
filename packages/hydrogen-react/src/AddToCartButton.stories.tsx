import * as React from 'react';
import type {Story} from '@ladle/react';
import {AddToCartButton} from './AddToCartButton.js';
import {CartProvider} from './CartProvider.js';
import {ProductProvider} from './ProductProvider.js';
import {getCartMock} from './CartProvider.test.helpers.js';
import {getVariant, getProduct} from './ProductProvider.test.helpers.js';

type AddToCartButtonProps = React.ComponentPropsWithoutRef<
  typeof AddToCartButton
>;

const variant = getVariant();
const cart = getCartMock();
const product = getProduct();

const Template: Story<AddToCartButtonProps> = (props) => {
  return (
    <ProductProvider data={product}>
      <CartProvider data={cart}>
        <AddToCartButton {...props}>Add to cart</AddToCartButton>
      </CartProvider>
    </ProductProvider>
  );
};

export const Default = Template.bind({});
Default.args = {
  variantId: variant.id,
};
