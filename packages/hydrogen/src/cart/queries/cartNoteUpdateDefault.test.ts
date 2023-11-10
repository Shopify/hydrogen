import {describe, it, expect} from 'vitest';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import {cartNoteUpdateDefault} from './cartNoteUpdateDefault';

describe('cartNoteUpdateDefault', () => {
  it('should return a default cart note update implementation', async () => {
    const cartNote = cartNoteUpdateDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await cartNote('');

    expect(result.cart).toHaveProperty('id', CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const cartNote = cartNoteUpdateDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await cartNote('');

    expect(result.cart).toHaveProperty('id', CART_ID);
    expect(result.errors?.[0]).toContain(cartFragment);
  });
});
