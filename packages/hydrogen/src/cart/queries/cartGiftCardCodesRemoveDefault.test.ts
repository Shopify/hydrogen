import {describe, it, expect} from 'vitest';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import {cartGiftCardCodesRemoveDefault} from './cartGiftCardCodesRemoveDefault';

describe('cartGiftCardCodesRemoveDefault', () => {
  it('should return a default cart gift card codes remove implementation', async () => {
    const removeGiftCardCodes = cartGiftCardCodesRemoveDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
    });

    const result = await removeGiftCardCodes(['GIFT123', 'GIFT456']);

    expect(result.cart).toHaveProperty('id', CART_ID);
  });

  it('can override cartFragment', async () => {
    const cartFragment = 'cartFragmentOverride';
    const removeGiftCardCodes = cartGiftCardCodesRemoveDefault({
      storefront: mockCreateStorefrontClient(),
      getCartId: () => CART_ID,
      cartFragment,
    });

    const result = await removeGiftCardCodes(['GIFT123', 'GIFT456']);

    expect(result.cart).toHaveProperty('id', CART_ID);
    expect(result.userErrors?.[0]).toContain(cartFragment);
  });
});
