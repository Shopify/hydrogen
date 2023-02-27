import * as React from 'react';
import type {Story} from '@ladle/react';
import {CartCost} from './CartCost.js';
import {CartProvider} from './CartProvider.js';
import {CART_WITH_LINES} from './CartProvider.test.helpers.js';

type CartCostProps = React.ComponentPropsWithoutRef<typeof CartCost>;

const Template: Story<{amountType: CartCostProps['amountType']}> = (props) => {
  return (
    <CartProvider data={CART_WITH_LINES}>
      <div>
        cart.cost.totalAmount will be in the <CartCost amountType="total" />
      </div>
      <div>
        cart.cost.totalAmount will be in the <CartCost amountType="subtotal" />
      </div>
      <div>
        cart.cost.totalAmount will be in the <CartCost amountType="tax" />
      </div>
      <div>
        cart.cost.totalAmount will be in the <CartCost amountType="duty" />
      </div>
      <hr />
      <CartCost {...props} />
    </CartProvider>
  );
};

export const Default = Template.bind({});
Default.args = {
  amountType: 'total',
};
Default.argTypes = {
  amountType: {
    options: ['total', 'subtotal', 'tax', 'duty'],
    control: {type: 'radio'},
    defaultValue: 'total',
  },
};
