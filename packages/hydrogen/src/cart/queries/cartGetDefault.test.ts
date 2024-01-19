import {describe, it, expect} from 'vitest';
import {cartGetDefault} from './cartGetDefault';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';

describe('cartGetDefault', () => {
  it('should return a default cart get implementation', async () => {
    const cartGet = cartGetDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await cartGet();

    expect(result).toHaveProperty('id', CART_ID);
  });

  it('should return an empty object when no cart id found', async () => {
    const cartGet = cartGetDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => undefined,
    });

    const result = await cartGet();

    expect(result).toStrictEqual(null);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const cartGet = cartGetDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await cartGet();

    expect(result).toHaveProperty('id', CART_ID);

    // @ts-expect-error
    expect(result.query).toContain(cartFragment);
  });
});
