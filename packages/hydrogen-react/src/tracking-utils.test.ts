import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  cachedTrackingValues,
  getTrackingValues,
  storeTrackingValues,
} from './tracking-utils.js';
import {getShopifyCookies} from './cookies-utils.js';

type TokenGetterOptions = {generateFallback?: boolean; tag?: string};

type StubOptions = {
  uniqueToken?: string;
  visitToken?: string;
  cachedConsent?: string;
};

/**
 * Simulates the consent-tracking-api script loaded on the window:
 * `cachedConsent` for consent and `__internal` getters for tokens.
 */
function stubCustomerPrivacyApi({
  uniqueToken,
  visitToken,
  cachedConsent,
}: StubOptions = {}) {
  const uniqueTokenGetter = vi.fn(
    (_options?: TokenGetterOptions) => uniqueToken,
  );
  const visitTokenGetter = vi.fn((_options?: TokenGetterOptions) => visitToken);

  vi.stubGlobal('window', {
    Shopify: {
      customerPrivacy: {
        cachedConsent,
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
    cachedTrackingValues.current = null;
  });

  describe('getTrackingValues', () => {
    it('reads tokens and consent from the Customer Privacy API first', () => {
      stubCustomerPrivacyApi({
        uniqueToken: 'cta-unique',
        visitToken: 'cta-visit',
        cachedConsent: 'cta-consent',
      });
      storeTrackingValues({
        uniqueToken: 'cache-unique',
        visitToken: 'cache-visit',
        consent: 'cache-consent',
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

    it('falls back to the cached consentManagement body values when the Customer Privacy API holds no tokens', () => {
      // A consent gate or empty cache makes the getters return nothing:
      stubCustomerPrivacyApi();
      storeTrackingValues({
        uniqueToken: 'cache-unique',
        visitToken: 'cache-visit',
        consent: 'cache-consent',
      });
      stubLegacyCookies(
        '_shopify_y=legacy-unique; _shopify_s=legacy-visit; _tracking_consent=legacy-consent',
      );

      expect(getTrackingValues()).toEqual({
        uniqueToken: 'cache-unique',
        visitToken: 'cache-visit',
        consent: 'cache-consent',
      });
    });

    it('falls back to legacy cookies when no Customer Privacy API and no cached body values exist', () => {
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

    it('never asks the Customer Privacy API to generate fallback tokens', () => {
      const {uniqueTokenGetter, visitTokenGetter} = stubCustomerPrivacyApi({
        uniqueToken: 'cta-unique',
        visitToken: 'cta-visit',
      });

      getTrackingValues();

      // Hydrogen never requests fallback generation: minting new tokens
      // would race Hydrogen's own consent fetch.
      expect(uniqueTokenGetter).toHaveBeenCalledWith({
        generateFallback: false,
        tag: 'hydrogen:classic',
      });
      expect(visitTokenGetter).toHaveBeenCalledWith({
        generateFallback: false,
        tag: 'hydrogen:classic',
      });
    });
  });

  describe('storeTrackingValues', () => {
    it('stores consentManagement body values for later reads', () => {
      storeTrackingValues({
        uniqueToken: 'body-unique',
        visitToken: 'body-visit',
        consent: 'body-consent',
      });

      expect(getTrackingValues()).toEqual({
        uniqueToken: 'body-unique',
        visitToken: 'body-visit',
        consent: 'body-consent',
      });
    });

    it('replaces previously stored values with the latest body values', () => {
      storeTrackingValues({
        uniqueToken: 'old-unique',
        visitToken: 'old-visit',
        consent: 'old-consent',
      });
      storeTrackingValues({
        uniqueToken: 'new-unique',
        visitToken: 'new-visit',
        consent: 'new-consent',
      });

      expect(getTrackingValues()).toEqual({
        uniqueToken: 'new-unique',
        visitToken: 'new-visit',
        consent: 'new-consent',
      });
    });

    it('drops stored values that a later response reports as null', () => {
      // The backend returns null tokens when consent is not granted:
      storeTrackingValues({
        uniqueToken: 'old-unique',
        visitToken: 'old-visit',
        consent: 'old-consent',
      });
      storeTrackingValues({
        uniqueToken: null,
        visitToken: null,
        consent: null,
      });

      expect(getTrackingValues()).toEqual({
        uniqueToken: '',
        visitToken: '',
        consent: '',
      });
    });
  });
});
