import { describe, it, expect } from 'vitest';
import { CART_ID, mockCreateStorefrontClient } from '../cart-test-helper';
import { cartDeliveryAddressesUpdateDefault } from './cartDeliveryAddressesUpdateDefault';

describe('cartDeliveryAddressesUpdateDefault', () => {
  it('should return a default cart delivery address update implementation', async () => {
    const updateDeliveryAddresses = cartDeliveryAddressesUpdateDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await updateDeliveryAddresses([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const updateDeliveryAddresses = cartDeliveryAddressesUpdateDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await updateDeliveryAddresses([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
    expect(result.userErrors?.[0]).toContain(cartFragment);
  });
});
