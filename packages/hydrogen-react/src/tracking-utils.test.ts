import {afterEach, describe, expect, it, vi} from 'vitest';
import {getTrackingValues} from './tracking-utils.js';
import {getShopifyCookies} from './cookies-utils.js';

type TokenGetterOptions = {generateFallback?: boolean; tag?: string};

type StubOptions = {
  uniqueToken?: string;
  visitToken?: string;
  cachedConsent?: string;
  asyncConsent?: boolean;
};

/**
 * Simulates the consent-tracking-api script loaded on the window:
 * `cachedConsent` for consent and `__internal` getters for tokens.
 */
function stubCustomerPrivacyApi({
  uniqueToken,
  visitToken,
  cachedConsent,
  asyncConsent,
}: StubOptions = {}) {
  const uniqueTokenGetter = vi.fn(
    (_options?: TokenGetterOptions) => uniqueToken,
  );
  const visitTokenGetter = vi.fn((_options?: TokenGetterOptions) => visitToken);

  vi.stubGlobal('window', {
    Shopify: {
      customerPrivacy: {
        cachedConsent,
        config: {asyncConsent},
        __internal: {
          uniqueToken: uniqueTokenGetter,
          visitToken: visitTokenGetter,
        },
      },
    },
  } as unknown as Window & typeof globalThis);

  return {uniqueTokenGetter, visitTokenGetter};
}

function stubLegacyCookies(cookie: string) {
  vi.stubGlobal('document', {cookie} as unknown as Document);
}

describe('tracking-utils', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getTrackingValues', () => {
    it('reads tokens and consent from the Customer Privacy API first', () => {
      stubCustomerPrivacyApi({
        uniqueToken: 'cta-unique',
        visitToken: 'cta-visit',
        cachedConsent: 'cta-consent',
      });
      stubLegacyCookies(
        '_shopify_y=legacy-unique; _shopify_s=legacy-visit; _tracking_consent=legacy-consent',
      );

      expect(getTrackingValues()).toEqual({
        uniqueToken: 'cta-unique',
        visitToken: 'cta-visit',
        consent: 'cta-consent',
      });
    });

    it('does not restore legacy tokens when the Customer Privacy API returns no tokens', () => {
      // A consent gate or empty cache makes the getters return nothing:
      stubCustomerPrivacyApi();
      stubLegacyCookies(
        '_shopify_y=legacy-unique; _shopify_s=legacy-visit; _tracking_consent=legacy-consent',
      );

      expect(getTrackingValues()).toEqual({
        uniqueToken: '',
        visitToken: '',
        consent: 'legacy-consent',
      });
    });

    it('falls back to legacy cookies when no Customer Privacy API exists', () => {
      stubLegacyCookies(
        '_shopify_y=legacy-unique; _shopify_s=legacy-visit; _tracking_consent=legacy-consent',
      );

      expect(getTrackingValues()).toEqual({
        uniqueToken: 'legacy-unique',
        visitToken: 'legacy-visit',
        consent: 'legacy-consent',
      });
    });

    it('returns empty strings when no source has values', () => {
      expect(getTrackingValues()).toEqual({
        uniqueToken: '',
        visitToken: '',
        consent: '',
      });
    });

    it('reads legacy cookie values from the string passed by getShopifyCookies', () => {
      // getShopifyCookies passes its cookie string so that this read
      // does not depend on document.cookie availability:
      stubLegacyCookies('_shopify_y=document-unique');

      const cookies = getShopifyCookies(
        '_shopify_y=string-unique; _shopify_s=string-visit',
      );

      expect(cookies).toEqual({
        _shopify_y: 'string-unique',
        _shopify_s: 'string-visit',
      });
    });

    it('does not request fallback generation for standalone integrations with their own consent fetch', () => {
      const {uniqueTokenGetter, visitTokenGetter} = stubCustomerPrivacyApi({
        uniqueToken: 'cta-unique',
        visitToken: 'cta-visit',
      });

      getTrackingValues();

      // Standalone integrations retain ownership of their consent fetch.
      expect(uniqueTokenGetter).toHaveBeenCalledWith({
        generateFallback: false,
        tag: 'hydrogen:classic',
      });
      expect(visitTokenGetter).toHaveBeenCalledWith({
        generateFallback: false,
        tag: 'hydrogen:classic',
      });
    });

    it('delegates token generation to CTA for async consent even with legacy cookies', () => {
      const {uniqueTokenGetter, visitTokenGetter} = stubCustomerPrivacyApi({
        asyncConsent: true,
        uniqueToken: 'cta-unique',
        visitToken: 'cta-visit',
      });
      stubLegacyCookies('_tracking_consent=legacy-consent');

      expect(getTrackingValues()).toMatchObject({
        uniqueToken: 'cta-unique',
        visitToken: 'cta-visit',
      });
      for (const getter of [uniqueTokenGetter, visitTokenGetter]) {
        expect(getter).toHaveBeenCalledWith({
          generateFallback: true,
          tag: 'hydrogen:classic',
        });
      }
    });
  });
});
