import { describe, it, expect } from 'vitest';
import { CART_ID, mockCreateStorefrontClient } from '../cart-test-helper';
import { cartDeliveryAddressesAddDefault } from './cartDeliveryAddressesAddDefault';

describe('cartDeliveryAddressesAddDefault', () => {
  it('should return a default cart delivery address add implementation', async () => {
    const addDeliveryAddresses = cartDeliveryAddressesAddDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await addDeliveryAddresses([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const addDeliveryAddresses = cartDeliveryAddressesAddDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await addDeliveryAddresses([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
    expect(result.userErrors?.[0]).toContain(cartFragment);
  });
});
