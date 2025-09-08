import {describe, expect, it} from 'vitest';
import {
  createAnalyticsServerTimingHeader,
  createAnalyticsCookieHeaders,
  type AnalyticsTokens,
} from './analytics-tokens.js';

describe('analytics-tokens', () => {
  describe('createAnalyticsServerTimingHeader', () => {
    it('formats visitor and session tokens correctly', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: 'visitor-123',
        sessionToken: 'session-456',
        source: 'existing-cookies',
      };

      const result = createAnalyticsServerTimingHeader(tokens);
      expect(result).toBe('_y;desc="visitor-123", _s;desc="session-456"');
    });

    it('includes consent cookie when present', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: 'visitor-123',
        sessionToken: 'session-456',
        consentCookie: '3.AMPS.consent',
        source: 'existing-cookies',
      };

      const result = createAnalyticsServerTimingHeader(tokens);
      expect(result).toBe(
        '_y;desc="visitor-123", _s;desc="session-456", _cmp;desc="3.AMPS.consent"',
      );
    });

    it('handles missing tokens gracefully', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: '',
        sessionToken: '',
        source: 'relay-only',
      };

      const result = createAnalyticsServerTimingHeader(tokens);
      expect(result).toBe('');
    });

    it('formats only available tokens', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: 'visitor-only',
        sessionToken: '',
        source: 'existing-cookies',
      };

      const result = createAnalyticsServerTimingHeader(tokens);
      expect(result).toBe('_y;desc="visitor-only"');
    });
  });

  describe('createAnalyticsCookieHeaders', () => {
    it('creates visitor and session cookies with proper expiry', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: 'visitor-123',
        sessionToken: 'session-456',
        source: 'existing-cookies',
      };

      const headers = createAnalyticsCookieHeaders(tokens);

      expect(headers).toHaveLength(2);
      expect(headers[0]).toContain('_shopify_y=visitor-123');
      expect(headers[0]).toContain('Max-Age=31536000'); // 1 year
      expect(headers[1]).toContain('_shopify_s=session-456');
      expect(headers[1]).toContain('Max-Age=1800'); // 30 minutes
    });

    it('uses cookieDomain from tokens when available', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: 'visitor-123',
        sessionToken: 'session-456',
        cookieDomain: '.myshopify.com',
        source: 'storefront-api',
      };

      const headers = createAnalyticsCookieHeaders(tokens);

      expect(headers[0]).toContain('Domain=.myshopify.com');
      expect(headers[1]).toContain('Domain=.myshopify.com');
    });

    it('sets Secure flag by default for production', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: 'visitor-123',
        sessionToken: 'session-456',
        source: 'existing-cookies',
      };

      const headers = createAnalyticsCookieHeaders(tokens);

      expect(headers[0]).toContain('Secure');
      expect(headers[1]).toContain('Secure');
    });

    it('omits domain and secure for localhost URLs', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: 'visitor-123',
        sessionToken: 'session-456',
        source: 'existing-cookies',
      };

      const headers = createAnalyticsCookieHeaders(tokens, {
        requestUrl: 'http://localhost:3000',
      });

      expect(headers[0]).not.toContain('Domain=');
      expect(headers[0]).not.toContain('Secure');
      expect(headers[1]).not.toContain('Domain=');
      expect(headers[1]).not.toContain('Secure');
    });

    it('detects 127.0.0.1 as localhost', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: 'visitor-123',
        sessionToken: 'session-456',
        source: 'existing-cookies',
      };

      const headers = createAnalyticsCookieHeaders(tokens, {
        requestUrl: 'http://127.0.0.1:3000',
        domain: 'example.com', // Should be ignored for localhost
      });

      expect(headers[0]).not.toContain('Domain=');
      expect(headers[0]).not.toContain('Secure');
    });

    it('sets consent cookie without HttpOnly', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: 'visitor-123',
        sessionToken: 'session-456',
        consentCookie: '3.AMPS.consent',
        source: 'existing-cookies',
      };

      const headers = createAnalyticsCookieHeaders(tokens);

      expect(headers).toHaveLength(3);
      expect(headers[2]).toContain('_tracking_consent=3.AMPS.consent');
      expect(headers[2]).not.toContain('HttpOnly');
    });

    it('URL encodes landing page and referrer cookies', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: 'visitor-123',
        sessionToken: 'session-456',
        landingPageCookie: '/products?search=test item',
        origReferrerCookie: 'https://google.com/search?q=test',
        source: 'existing-cookies',
      };

      const headers = createAnalyticsCookieHeaders(tokens);

      expect(headers[2]).toContain(
        '_landing_page=%2Fproducts%3Fsearch%3Dtest%20item',
      );
      expect(headers[3]).toContain(
        '_orig_referrer=https%3A%2F%2Fgoogle.com%2Fsearch%3Fq%3Dtest',
      );
    });

    it('respects custom cookie options', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: 'visitor-123',
        sessionToken: 'session-456',
        source: 'existing-cookies',
      };

      const headers = createAnalyticsCookieHeaders(tokens, {
        domain: 'custom.example.com',
        path: '/shop',
        sameSite: 'Strict',
        secure: false,
        httpOnly: true,
      });

      expect(headers[0]).toContain('Domain=custom.example.com');
      expect(headers[0]).toContain('Path=/shop');
      expect(headers[0]).toContain('SameSite=Strict');
      expect(headers[0]).not.toContain('Secure');
      expect(headers[0]).toContain('HttpOnly');
    });

    it('handles empty tokens array', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: '',
        sessionToken: '',
        source: 'relay-only',
      };

      const headers = createAnalyticsCookieHeaders(tokens);

      expect(headers).toEqual([]);
    });

    it('creates all cookie types when fully populated', () => {
      const tokens: AnalyticsTokens = {
        visitorToken: 'visitor-123',
        sessionToken: 'session-456',
        consentCookie: '3.AMPS.consent',
        landingPageCookie: '/home',
        origReferrerCookie: 'https://example.com',
        cookieDomain: '.myshopify.com',
        source: 'storefront-api',
      };

      const headers = createAnalyticsCookieHeaders(tokens);

      expect(headers).toHaveLength(5);
      expect(headers[0]).toContain('_shopify_y=visitor-123');
      expect(headers[1]).toContain('_shopify_s=session-456');
      expect(headers[2]).toContain('_tracking_consent=3.AMPS.consent');
      expect(headers[3]).toContain('_landing_page=%2Fhome');
      expect(headers[4]).toContain('_orig_referrer=https%3A%2F%2Fexample.com');

      // All should use domain from API
      headers.forEach((header) => {
        expect(header).toContain('Domain=.myshopify.com');
      });
    });
  });
});
