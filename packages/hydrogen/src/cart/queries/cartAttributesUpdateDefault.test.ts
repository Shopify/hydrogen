import {describe, it, expect} from 'vitest';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import {cartAttributesUpdateDefault} from './cartAttributesUpdateDefault';

describe('cartAttributesUpdateDefault', () => {
  it('should return a default cart attribute update implementation', async () => {
    const cartAttribute = cartAttributesUpdateDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await cartAttribute([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const cartAttribute = cartAttributesUpdateDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await cartAttribute([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
    expect(result.userErrors?.[0]).toContain(cartFragment);
  });
});
