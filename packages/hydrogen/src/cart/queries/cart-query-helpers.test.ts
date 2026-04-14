import {describe, it, expect} from 'vitest';
import {
  getInContextVariables,
  getInContextDirective,
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

    it('returns directive with visitorConsent when included', () => {
      const result = getInContextDirective(true);

      expect(result).toBe(
        '@inContext(country: $country, language: $language, visitorConsent: $visitorConsent)',
      );
    });
  });
});
