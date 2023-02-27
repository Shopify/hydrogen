import * as React from 'react';
import type {Story} from '@ladle/react';
import {CartLinePrice} from './CartLinePrice.js';
import {getCartLineMock} from './CartProvider.test.helpers.js';

type CartLinePriceProps = React.ComponentPropsWithoutRef<typeof CartLinePrice>;

const cartLineMock = getCartLineMock({
  cost: {
    totalAmount: {
      amount: '100',
      currencyCode: 'USD',
    },
    compareAtAmountPerQuantity: {
      amount: '200',
      currencyCode: 'USD',
    },
  },
});

const Template: Story<{priceType: CartLinePriceProps['priceType']}> = (
  props
) => <CartLinePrice data={cartLineMock} {...props} />;

export const Default = Template.bind({});
Default.argTypes = {
  priceType: {
    options: ['regular', 'compareAt'],
    control: {
      type: 'select',
    },
    defaultValue: 'regular',
  },
};

export const CompareAt = Template.bind({});
CompareAt.argTypes = {
  priceType: {
    options: ['regular', 'compareAt'],
    control: {
      type: 'select',
    },
    defaultValue: 'compareAt',
  },
};
