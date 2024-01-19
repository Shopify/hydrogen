import {describe, it, expect} from 'vitest';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import {cartLinesAddDefault} from './cartLinesAddDefault';

describe('cartLinesAddDefault', () => {
  it('should return a default cart lines add implementation', async () => {
    const cartAdd = cartLinesAddDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await cartAdd([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const cartAdd = cartLinesAddDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await cartAdd([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
    expect(result.userErrors?.[0]).toContain(cartFragment);
  });
});
