import {describe, it, expect} from 'vitest';
import {
  CART_ID,
  NEW_CART_ID,
  mockCreateStorefrontClient,
} from '../cart-test-helper';
import {cartCreateDefault} from './cartCreateDefault';

describe('cartCreateDefault', () => {
  it('should return a default cart create implementation', async () => {
    const cartCreate = cartCreateDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await cartCreate({});

    expect(result.cart).toHaveProperty('id', NEW_CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const cartCreate = cartCreateDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await cartCreate({});

    expect(result.cart).toHaveProperty('id', NEW_CART_ID);
    expect(result.errors?.[0]).toContain(cartFragment);
  });
});
