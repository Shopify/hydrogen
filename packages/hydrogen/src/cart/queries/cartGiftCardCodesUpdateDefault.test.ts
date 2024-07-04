import {describe, it, expect} from 'vitest';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import {cartGiftCardCodesUpdateDefault} from './cartGiftCardCodeUpdateDefault';

describe('cartGiftCardCodesUpdateDefault', () => {
  it('should return a default cart discount code update implementation', async () => {
    const cartGiftCardCodes = cartGiftCardCodesUpdateDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await cartGiftCardCodes([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const cartGiftCardCodes = cartGiftCardCodesUpdateDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await cartGiftCardCodes([]);

    expect(result.cart).toHaveProperty('id', CART_ID);
    expect(result.userErrors?.[0]).toContain(cartFragment);
  });
});
