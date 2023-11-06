import * as React from 'react';
import type {Story} from '@ladle/react';
import {ShopPayButton} from './ShopPayButton.js';

type ButtonProps = React.ComponentPropsWithoutRef<typeof ShopPayButton>;

const Template: Story<ButtonProps> = (props) => <ShopPayButton {...props} />;

export const NoQuantity = Template.bind({});
NoQuantity.args = {
  variantIds: [
    'gid://shopify/ProductVariant/123',
    'gid://shopify/ProductVariant/456',
  ],
  storeDomain: 'https://notashop.myshopify.io',
  className: '',
  width: '',
};

export const Quantities = Template.bind({});
Quantities.args = {
  variantIdsAndQuantities: [
    {id: 'gid://shopify/ProductVariant/123', quantity: 2},
  ],
  storeDomain: 'https://notashop.myshopify.io',
  className: '',
  width: '',
};

export const ChannelAttribution = Template.bind({});
ChannelAttribution.args = {
  channel: 'hydrogen',
  variantIdsAndQuantities: [
    {id: 'gid://shopify/ProductVariant/123', quantity: 2},
  ],
  storeDomain: 'https://notashop.myshopify.io',
  className: '',
  width: '',
};
