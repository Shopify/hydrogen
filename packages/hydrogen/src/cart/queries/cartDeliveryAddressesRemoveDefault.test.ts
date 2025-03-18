import { describe, it, expect } from 'vitest';
import { CART_ID, mockCreateStorefrontClient } from '../cart-test-helper';
import { cartDeliveryAddressesRemoveDefault } from './cartDeliveryAddressesRemoveDefault';

describe('cartDeliveryAddressesRemoveDefault', () => {
  it('should return a default cart delivery address remove implementation', async () => {
    const removeDeliveryAddresses = cartDeliveryAddressesRemoveDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await removeDeliveryAddresses([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const removeDeliveryAddresses = cartDeliveryAddressesRemoveDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await removeDeliveryAddresses([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
    expect(result.userErrors?.[0]).toContain(cartFragment);
  });
});
