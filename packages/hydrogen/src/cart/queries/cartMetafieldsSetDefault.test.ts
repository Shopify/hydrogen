import {describe, it, expect} from 'vitest';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import {cartMetafieldsSetDefault} from './cartMetafieldsSetDefault';

describe('cartMetafieldsSetDefault', () => {
  it('should return a default cart metafields set implementation', async () => {
    const cartMetafieldsSet = cartMetafieldsSetDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await cartMetafieldsSet([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const cartMetafieldsSet = cartMetafieldsSetDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await cartMetafieldsSet([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
    expect(result.errors?.[0]).not.toContain(cartFragment);
  });
});
