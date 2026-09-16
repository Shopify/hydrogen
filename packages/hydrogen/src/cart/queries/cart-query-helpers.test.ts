import {describe, it, expect} from 'vitest';
import {
  getInContextVariables,
  getInContextDirective,
  shouldIncludeVisitorConsent,
} from './cart-query-helpers';

describe('cart-query-helpers', () => {
  describe('getInContextVariables', () => {
    it('returns base variables without visitorConsent when not included', () => {
      const result = getInContextVariables(false);

      expect(result).toContain('$country: CountryCode = ZZ');
      expect(result).toContain('$language: LanguageCode');
      expect(result).not.toContain('visitorConsent');
      expect(result).not.toContain('VisitorConsent');
    });

    it('defaults to excluding visitorConsent when called with no argument', () => {
      const result = getInContextVariables();

      expect(result).toContain('$country: CountryCode = ZZ');
      expect(result).not.toContain('visitorConsent');
    });

    it('returns variables with visitorConsent when included', () => {
      const result = getInContextVariables(true);

      expect(result).toContain('$country: CountryCode = ZZ');
      expect(result).toContain('$language: LanguageCode');
      expect(result).toContain('$visitorConsent: VisitorConsent');
    });
  });

  describe('getInContextDirective', () => {
    it('returns directive without visitorConsent when not included', () => {
      const result = getInContextDirective(false);

      expect(result).toBe('@inContext(country: $country, language: $language)');
      expect(result).not.toContain('visitorConsent');
    });

    it('defaults to excluding visitorConsent when called with no argument', () => {
      const result = getInContextDirective();

      expect(result).toBe('@inContext(country: $country, language: $language)');
    });

    it('returns directive with visitorConsent when included', () => {
      const result = getInContextDirective(true);

      expect(result).toBe(
        '@inContext(country: $country, language: $language, visitorConsent: $visitorConsent)',
      );
    });
  });

  describe('shouldIncludeVisitorConsent', () => {
    it('returns false when input is undefined', () => {
      expect(shouldIncludeVisitorConsent(undefined)).toBe(false);
    });

    it('returns false when input has no visitorConsent key', () => {
      expect(shouldIncludeVisitorConsent({})).toBe(false);
    });

    it('returns false when visitorConsent is explicitly undefined', () => {
      expect(shouldIncludeVisitorConsent({visitorConsent: undefined})).toBe(
        false,
      );
    });

    it('returns true when visitorConsent is provided', () => {
      expect(
        shouldIncludeVisitorConsent({
          visitorConsent: {saleOfData: 'SALE_OF_DATA_OPTED_OUT'},
        }),
      ).toBe(true);
    });
  });
});
