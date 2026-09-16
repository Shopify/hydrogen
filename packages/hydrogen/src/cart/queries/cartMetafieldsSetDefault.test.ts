import {describe, it, expect} from 'vitest';
import {CART_ID, mockCreateStorefrontClient} from '../cart-test-helper';
import {
  cartMetafieldsSetDefault,
  CART_METAFIELD_SET_MUTATION,
} from './cartMetafieldsSetDefault';

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
    expect(result.userErrors?.[0]).not.toContain(cartFragment);
  });

  describe('mutation structure', () => {
    it('should not include visitorConsent by default', () => {
      const mutation = CART_METAFIELD_SET_MUTATION();

      expect(mutation).toContain('@inContext');
      expect(mutation).not.toContain('visitorConsent');
      expect(mutation).not.toContain('VisitorConsent');
    });

    it('should include visitorConsent when specified', () => {
      const mutation = CART_METAFIELD_SET_MUTATION({
        includeVisitorConsent: true,
      });

      expect(mutation).toContain('@inContext');
      expect(mutation).toContain('$visitorConsent: VisitorConsent');
      expect(mutation).toContain('visitorConsent: $visitorConsent');
    });
  });
});
