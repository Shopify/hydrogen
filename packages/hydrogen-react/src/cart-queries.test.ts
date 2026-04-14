import {describe, it, expect} from 'vitest';
import {
  CartLineAdd,
  CartCreate,
  CartLineRemove,
  CartLineUpdate,
  CartNoteUpdate,
  CartBuyerIdentityUpdate,
  CartAttributesUpdate,
  CartDiscountCodesUpdate,
  CartQuery,
} from './cart-queries';

const MOCK_FRAGMENT = '...MockFragment';

describe('cart-queries', () => {
  describe('visitorConsent conditional inclusion', () => {
    const queries = [
      {name: 'CartLineAdd', fn: CartLineAdd},
      {name: 'CartCreate', fn: CartCreate},
      {name: 'CartLineRemove', fn: CartLineRemove},
      {name: 'CartLineUpdate', fn: CartLineUpdate},
      {name: 'CartNoteUpdate', fn: CartNoteUpdate},
      {name: 'CartBuyerIdentityUpdate', fn: CartBuyerIdentityUpdate},
      {name: 'CartAttributesUpdate', fn: CartAttributesUpdate},
      {name: 'CartDiscountCodesUpdate', fn: CartDiscountCodesUpdate},
      {name: 'CartQuery', fn: CartQuery},
    ];

    describe.each(queries)('$name', ({fn}) => {
      it('should not include visitorConsent by default', () => {
        const query = fn(MOCK_FRAGMENT);

        expect(query).toContain('@inContext');
        expect(query).not.toContain('visitorConsent');
        expect(query).not.toContain('VisitorConsent');
      });

      it('should not include visitorConsent when explicitly disabled', () => {
        const query = fn(MOCK_FRAGMENT, {includeVisitorConsent: false});

        expect(query).toContain('@inContext');
        expect(query).not.toContain('visitorConsent');
        expect(query).not.toContain('VisitorConsent');
      });

      it('should include visitorConsent when explicitly enabled', () => {
        const query = fn(MOCK_FRAGMENT, {includeVisitorConsent: true});

        expect(query).toContain('@inContext');
        expect(query).toContain('$visitorConsent: VisitorConsent');
        expect(query).toContain('visitorConsent: $visitorConsent');
      });
    });
  });
});
