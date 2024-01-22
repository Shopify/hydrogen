import {describe, it, expect} from 'vitest';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import {cartMetafieldDeleteDefault} from './cartMetafieldDeleteDefault';

describe('cartMetafieldsSetDefault', () => {
  it('should return a default cart metafields set implementation', async () => {
    const cartMetafieldDelete = cartMetafieldDeleteDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await cartMetafieldDelete('');

    expect(result.cart).toHaveProperty('id', CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const cartMetafieldDelete = cartMetafieldDeleteDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await cartMetafieldDelete('');

    expect(result.cart).toHaveProperty('id', CART_ID);
    expect(result.userErrors?.[0]).not.toContain(cartFragment);
  });
});
