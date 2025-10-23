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

  describe('no duplicate filtering (API 2025-10+)', () => {
    it('should pass duplicate codes directly to API without filtering', async () => {
      const updateGiftCardCodes = cartGiftCardCodesUpdateDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const codesWithDuplicates = ['GIFT123', 'GIFT123', 'WELCOME10'];
      const result = await updateGiftCardCodes(codesWithDuplicates);

      expect(result.cart).toHaveProperty('id', CART_ID);
    });

    it('should delegate duplicate handling to API (case-insensitive normalization)', async () => {
      const updateGiftCardCodes = cartGiftCardCodesUpdateDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const result = await updateGiftCardCodes(['gift123', 'GIFT123']);

      expect(result.cart).toHaveProperty('id', CART_ID);
    });
  });
});
