import {describe, it, expect} from 'vitest';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import {cartSelectedDeliveryOptionsUpdateDefault} from './cartSelectedDeliveryOptionsUpdateDefault';

describe('cartSelectedDeliveryOptionsUpdateDefault', () => {
  it('should return a default cart delivery option update implementation', async () => {
    const cartUpdate = cartSelectedDeliveryOptionsUpdateDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await cartUpdate([
      {
        deliveryGroupId: 'gid://shopify/DeliveryGroup/123',
        deliveryOptionHandle: 'Postal Service',
      },
    ]);

    expect(result.cart).toHaveProperty('id', CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const cartUpdate = cartSelectedDeliveryOptionsUpdateDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await cartUpdate([
      {
        deliveryGroupId: 'gid://shopify/DeliveryGroup/123',
        deliveryOptionHandle: 'Postal Service',
      },
    ]);

    expect(result.cart).toHaveProperty('id', CART_ID);
    expect(result.errors?.[0]).toContain(cartFragment);
  });
});
