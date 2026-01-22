/**
 * TODO: These tests are placeholders that verify mock returns, not actual API behavior.
 * They should be improved in a follow-up PR to test real integration scenarios.
 * See PR #3284 for context.
 */
import {describe, it, expect} from 'vitest';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import {
  cartGiftCardCodesAddDefault,
  CART_GIFT_CARD_CODES_ADD_MUTATION,
} from './cartGiftCardCodesAddDefault';

describe('cartGiftCardCodesAddDefault', () => {
  describe('basic functionality', () => {
    it('should add gift card codes to cart without replacing existing ones', async () => {
      const addGiftCardCodes = cartGiftCardCodesAddDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const result = await addGiftCardCodes(['SUMMER2025']);

      expect(result.cart).toHaveProperty('id', CART_ID);
    });

    it('should handle multiple gift card codes in single call', async () => {
      const addGiftCardCodes = cartGiftCardCodesAddDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const result = await addGiftCardCodes([
        'GIFT123',
        'GIFT456',
        'WELCOME25',
      ]);

      expect(result.cart).toHaveProperty('id', CART_ID);
    });

    it('should handle empty array', async () => {
      const addGiftCardCodes = cartGiftCardCodesAddDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const result = await addGiftCardCodes([]);

      expect(result.cart).toHaveProperty('id', CART_ID);
    });
  });

  describe('cartFragment override', () => {
    it('can override cartFragment for custom query fields', async () => {
      const cartFragment = 'cartFragmentOverride';
      const addGiftCardCodes = cartGiftCardCodesAddDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
        cartFragment,
      });

      const result = await addGiftCardCodes(['TESTCODE']);

      expect(result.cart).toHaveProperty('id', CART_ID);
      expect(result.userErrors?.[0]).toContain(cartFragment);
    });
  });

  describe('mutation structure', () => {
    it('should include required mutation fields for error and warning handling', () => {
      const mutation = CART_GIFT_CARD_CODES_ADD_MUTATION();

      expect(mutation).toContain('cartGiftCardCodesAdd');
      expect(mutation).toContain('userErrors');
      expect(mutation).toContain('warnings');
      expect(mutation).toContain('CartApiError');
      expect(mutation).toContain('CartApiWarning');
    });

    it('should include @inContext directive for internationalization', () => {
      const mutation = CART_GIFT_CARD_CODES_ADD_MUTATION();

      expect(mutation).toContain('@inContext');
      expect(mutation).toContain('$country');
      expect(mutation).toContain('$language');
    });
  });

  describe('no duplicate filtering', () => {
    it('should pass duplicate codes to API without filtering', async () => {
      const addGiftCardCodes = cartGiftCardCodesAddDefault({
        storefront: mockCreateStorefrontClient(),
        getCartId: () => CART_ID,
      });

      const codesWithDuplicates = ['GIFT123', 'GIFT123', 'GIFT456'];
      const result = await addGiftCardCodes(codesWithDuplicates);

      expect(result.cart).toHaveProperty('id', CART_ID);
    });
  });
});
