import {describe, it, expect} from 'vitest';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import {cartLinesRemoveDefault} from './cartLinesRemoveDefault';

describe('cartLinesRemoveDefault', () => {
  it('should return a default cart lines remove implementation', async () => {
    const cartRemove = cartLinesRemoveDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await cartRemove([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const cartRemove = cartLinesRemoveDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await cartRemove([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
    expect(result.userErrors?.[0]).toContain(cartFragment);
  });
});
