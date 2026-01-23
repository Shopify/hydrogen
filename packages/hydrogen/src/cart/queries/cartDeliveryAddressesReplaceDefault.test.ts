import {describe, it, expect} from 'vitest';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import {cartDeliveryAddressesReplaceDefault} from './cartDeliveryAddressesReplaceDefault';

describe('cartDeliveryAddressesReplaceDefault', () => {
  it('should return a default cart delivery address replace implementation', async () => {
    const replaceDeliveryAddresses = cartDeliveryAddressesReplaceDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await replaceDeliveryAddresses([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const replaceDeliveryAddresses = cartDeliveryAddressesReplaceDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await replaceDeliveryAddresses([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
    expect(result.userErrors?.[0]).toContain(cartFragment);
  });
});
