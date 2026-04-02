import {describe, expect, it, vi} from 'vitest';

// Mock react-router since its hooks aren't callable outside a router context.
// The pure functions we're testing don't use hooks, but the module imports them.
vi.mock('react-router', () => ({useMatches: vi.fn(), useLocation: vi.fn()}));

import {
  getLocaleFromRequest,
  getPathWithoutLocale,
  localeMatchesPrefix,
  normalizePrefix,
  findLocaleByPrefix,
  cleanPath,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
} from '../ingredients/templates/skeleton/app/lib/i18n';

describe('markets recipe — i18n utilities', () => {
  describe('DEFAULT_LOCALE', () => {
    it('defaults to US English with root prefix', () => {
      expect(DEFAULT_LOCALE).toEqual({
        language: 'EN',
        country: 'US',
        pathPrefix: '/',
      });
    });
  });

  describe('SUPPORTED_LOCALES', () => {
    it('includes at least the default locale and one non-default', () => {
      expect(SUPPORTED_LOCALES.length).toBeGreaterThan(1);
      expect(SUPPORTED_LOCALES).toContainEqual(DEFAULT_LOCALE);
    });
  });

  describe('getLocaleFromRequest', () => {
    it('returns DEFAULT_LOCALE for a root URL', () => {
      const request = new Request('http://localhost/');
      expect(getLocaleFromRequest(request)).toEqual(DEFAULT_LOCALE);
    });

    it('returns DEFAULT_LOCALE for a non-locale path', () => {
      const request = new Request('http://localhost/products/widget');
      expect(getLocaleFromRequest(request)).toEqual(DEFAULT_LOCALE);
    });

    it('parses a locale prefix from the URL', () => {
      const request = new Request('http://localhost/FR-CA/products');
      expect(getLocaleFromRequest(request)).toEqual({
        language: 'FR',
        country: 'CA',
        pathPrefix: '/FR-CA',
      });
    });

    it('is case-insensitive — normalizes to uppercase', () => {
      const request = new Request('http://localhost/fr-ca/products');
      expect(getLocaleFromRequest(request)).toEqual({
        language: 'FR',
        country: 'CA',
        pathPrefix: '/FR-CA',
      });
    });

    it('strips .data suffix before parsing locale', () => {
      const request = new Request('http://localhost/EN-CA.data/products');
      const locale = getLocaleFromRequest(request);
      expect(locale.pathPrefix).toBe('/EN-CA');
    });
  });

  describe('getPathWithoutLocale', () => {
    it('strips the locale prefix from a path', () => {
      const locale = {
        language: 'FR' as const,
        country: 'CA' as const,
        pathPrefix: '/FR-CA',
      };
      expect(getPathWithoutLocale('/FR-CA/products', locale)).toBe('/products');
    });

    it('returns the original path when locale is null', () => {
      expect(getPathWithoutLocale('/products', null)).toBe('/products');
    });

    it('returns root when only the locale prefix is present', () => {
      const locale = {
        language: 'FR' as const,
        country: 'CA' as const,
        pathPrefix: '/FR-CA',
      };
      expect(getPathWithoutLocale('/FR-CA', locale)).toBe('/');
    });

    it('is case-insensitive', () => {
      const locale = {
        language: 'FR' as const,
        country: 'CA' as const,
        pathPrefix: '/FR-CA',
      };
      expect(getPathWithoutLocale('/fr-ca/about', locale)).toBe('/about');
    });

    it('returns path unchanged for DEFAULT_LOCALE (root prefix)', () => {
      expect(getPathWithoutLocale('/products', DEFAULT_LOCALE)).toBe(
        '/products',
      );
    });
  });

  describe('localeMatchesPrefix', () => {
    it('returns true for a supported locale segment', () => {
      expect(localeMatchesPrefix('EN-CA')).toBe(true);
    });

    it('returns false for an unsupported locale segment', () => {
      expect(localeMatchesPrefix('XY-ZZ')).toBe(false);
    });

    it('returns true for null (matches default locale root prefix)', () => {
      expect(localeMatchesPrefix(null)).toBe(true);
    });
  });

  describe('normalizePrefix', () => {
    it('strips trailing slashes', () => {
      expect(normalizePrefix('/FR-CA/')).toBe('/FR-CA');
    });

    it('returns empty string for root prefix', () => {
      expect(normalizePrefix('/')).toBe('');
    });

    it('preserves a prefix without trailing slash', () => {
      expect(normalizePrefix('/EN-CA')).toBe('/EN-CA');
    });
  });

  describe('findLocaleByPrefix', () => {
    it('finds a locale by case-insensitive prefix', () => {
      const locale = findLocaleByPrefix('/fr-ca/products');
      expect(locale).toEqual(
        expect.objectContaining({language: 'FR', country: 'CA'}),
      );
    });

    it('returns null for the default locale prefix /', () => {
      expect(findLocaleByPrefix('/products')).toBeNull();
    });

    it('returns null for an unknown prefix', () => {
      expect(findLocaleByPrefix('/XY-ZZ/about')).toBeNull();
    });
  });

  describe('cleanPath', () => {
    it('strips a known locale prefix', () => {
      expect(cleanPath('/FR-CA/products')).toBe('/products');
    });

    it('returns root when only a locale prefix is present', () => {
      expect(cleanPath('/FR-CA')).toBe('/');
    });

    it('returns the path unchanged when no locale is present', () => {
      expect(cleanPath('/products/widget')).toBe('/products/widget');
    });

    it('strips a language-only prefix that is not a valid locale', () => {
      expect(cleanPath('/de/products')).toBe('/products');
    });
  });
});
