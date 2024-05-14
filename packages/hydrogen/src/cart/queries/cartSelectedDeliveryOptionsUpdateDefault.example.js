/* eslint-disable @typescript-eslint/no-unused-vars */
import {cartSelectedDeliveryOptionsUpdateDefault} from '@shopify/hydrogen';

const cartDeliveryOption = cartSelectedDeliveryOptionsUpdateDefault({
  storefront,
  getCartId,
});

const result = await cartDeliveryOption([
  {
    deliveryGroupId: '123',
    deliveryOptionHandle: 'Canada Post',
  },
]);
