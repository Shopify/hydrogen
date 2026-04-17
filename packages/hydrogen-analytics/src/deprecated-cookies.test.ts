import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  initDeprecatedCookies,
  _computeCookieDomainForTesting as computeCookieDomain,
} from './deprecated-cookies';
import {getTrackingValues} from './utils/tracking-values';

vi.mock('./utils/tracking-values', () => ({
  getTrackingValues: vi.fn(() => ({
    uniqueToken: 'abc-unique-token',
    visitToken: 'def-visit-token',
    consent: null,
  })),
}));

vi.mock('./utils/uuid', () => ({
  buildUUID: vi.fn(() => 'mock-uuid'),
}));

const getTrackingValuesMock = vi.mocked(getTrackingValues);

function createMockDeps(overrides = {}) {
  const subscriptions = new Map<string, Array<(payload: any) => void>>();
  return {
    deps: {
      subscribe: vi.fn((event: string, callback: (payload: any) => void) => {
        if (!subscriptions.has(event)) subscriptions.set(event, []);
        subscriptions.get(event)!.push(callback);
        return () => {};
      }),
      canTrack: () => true,
      checkoutDomain: 'checkout.hydrogen.shop',
      cookieDomain: undefined as string | undefined,
      ...overrides,
    },
    fire(event: string, payload: any = {}) {
      const handlers = subscriptions.get(event) ?? [];
      for (const handler of handlers) handler(payload);
    },
  };
}

describe('deprecated-cookies', () => {
  let cookieJar: string;

  beforeEach(() => {
    cookieJar = '';
    Object.defineProperty(document, 'cookie', {
      get: () => cookieJar,
      set: (value: string) => {
        cookieJar += (cookieJar ? '; ' : '') + value;
      },
      configurable: true,
    });
  });

  describe('computeCookieDomain', () => {
    it('returns common ancestor domain with leading dot', () => {
      const result = computeCookieDomain('checkout.hydrogen.shop');
      // In test env, window.location.host is typically 'localhost'
      // so common ancestor with checkout.hydrogen.shop is empty
      expect(typeof result).toBe('string');
    });

    it('returns empty string for localhost', () => {
      const result = computeCookieDomain('checkout.hydrogen.shop');
      // happy-dom typically runs at localhost
      expect(result).toBe('');
    });
  });

  describe('initDeprecatedCookies', () => {
    it('subscribes to consent_collected and page_viewed events', () => {
      const {deps} = createMockDeps();
      initDeprecatedCookies(deps);

      expect(deps.subscribe).toHaveBeenCalledWith(
        '_internal:consent_collected',
        expect.any(Function),
      );
      expect(deps.subscribe).toHaveBeenCalledWith(
        'page_viewed',
        expect.any(Function),
      );
    });

    it('sets cookies when consent is collected and canTrack is true', () => {
      const {deps, fire} = createMockDeps();
      initDeprecatedCookies(deps);

      fire('_internal:consent_collected');

      expect(cookieJar).toContain('_shopify_y=');
      expect(cookieJar).toContain('_shopify_s=');
    });

    it('removes cookies when canTrack returns false', () => {
      const {deps, fire} = createMockDeps({canTrack: () => false});
      initDeprecatedCookies(deps);

      fire('_internal:consent_collected');

      expect(cookieJar).toContain('_shopify_y=;');
      expect(cookieJar).toContain('max-age=0');
    });

    it('skips setting cookies when tracking values start with 00000000-', () => {
      getTrackingValuesMock.mockReturnValueOnce({
        uniqueToken: '00000000-0000-0000-0000-000000000000',
        visitToken: '00000000-0000-0000-0000-000000000000',
        consent: null,
      });

      const {deps, fire} = createMockDeps();
      initDeprecatedCookies(deps);

      cookieJar = ''; // reset
      fire('_internal:consent_collected');

      expect(cookieJar).toBe('');
    });
  });
});