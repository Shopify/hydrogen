import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';

import {buildUUID, hexTime, getShopifyCookies} from './cookies-utils.js';
import {ShopifyCookies} from './analytics-types.js';

describe('cookies-utils', () => {
  describe('buildUUID', () => {
    it('returns a string', () => {
      expect(typeof buildUUID()).toBe('string');
    });
  });

  describe('hexTime', () => {
    it('returns a string', () => {
      expect(typeof hexTime()).toBe('string');
    });
  });

  describe('getShopifyCookies', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns object with SHOPIFY_Y and SHOPIFY_X from cookies when no Server-Timing', () => {
      const cookie =
        '_shopify_m=persistent; _y=44c60bb0-577c-4901-874c-92cb323fccf1; _shopify_y=44c60bb0-577c-4901-874c-92cb323fccf1; _shopify_y=44c60bb0-577c-4901-874c-92cb323fccf1; _tracking_consent={"lim":["GDPR"],"v":"2.0","con":{"GDPR":""},"reg":"CCPA"}; _shopify_s=a797b9ef-C0E7-4536-18BA-2828BA504882';
      expect(getShopifyCookies(cookie)).toMatchObject<ShopifyCookies>({
        _shopify_y: '44c60bb0-577c-4901-874c-92cb323fccf1',
        _shopify_s: 'a797b9ef-C0E7-4536-18BA-2828BA504882',
      });
    });

    it('reads from Server-Timing when available', () => {
      const mockNavEntry = {
        serverTiming: [
          {name: '_y', description: 'server-y-value', duration: 0},
          {name: '_s', description: 'server-s-value', duration: 0},
        ],
      };

      vi.spyOn(window.performance, 'getEntriesByType').mockReturnValue([
        mockNavEntry,
      ] as any);

      const result = getShopifyCookies('');

      expect(result).toEqual({
        _shopify_y: 'server-y-value',
        _shopify_s: 'server-s-value',
      });
    });

    it('uses Server-Timing over cookies when both are available', () => {
      const mockNavEntry = {
        serverTiming: [
          {name: '_y', description: 'server-timing-y', duration: 0},
          {name: '_s', description: 'server-timing-s', duration: 0},
        ],
      };

      vi.spyOn(window.performance, 'getEntriesByType').mockReturnValue([
        mockNavEntry,
      ] as any);

      const cookie = '_shopify_y=cookie-y;_shopify_s=cookie-s';
      const result = getShopifyCookies(cookie);

      expect(result).toEqual({
        _shopify_y: 'server-timing-y',
        _shopify_s: 'server-timing-s',
      });
    });

    it('falls back to cookies when Server-Timing is partial', () => {
      const mockNavEntry = {
        serverTiming: [{name: '_y', description: 'server-y-only', duration: 0}],
      };

      vi.spyOn(window.performance, 'getEntriesByType').mockReturnValue([
        mockNavEntry,
      ] as any);

      const cookie = '_shopify_s=cookie-s-fallback';
      const result = getShopifyCookies(cookie);

      expect(result).toEqual({
        _shopify_y: 'server-y-only',
        _shopify_s: 'cookie-s-fallback',
      });
    });

    it('handles missing performance API gracefully', () => {
      const originalPerf = window.performance;
      // @ts-ignore
      delete window.performance;

      const cookie = '_shopify_y=fallback-y;_shopify_s=fallback-s';
      const result = getShopifyCookies(cookie);

      expect(result).toEqual({
        _shopify_y: 'fallback-y',
        _shopify_s: 'fallback-s',
      });

      window.performance = originalPerf;
    });

    it('handles Server-Timing API errors gracefully', () => {
      vi.spyOn(window.performance, 'getEntriesByType').mockImplementation(
        () => {
          throw new Error('API Error');
        },
      );

      const cookie = '_shopify_y=error-fallback-y;_shopify_s=error-fallback-s';
      const result = getShopifyCookies(cookie);

      expect(result).toEqual({
        _shopify_y: 'error-fallback-y',
        _shopify_s: 'error-fallback-s',
      });
    });

    it('returns empty strings when no data is available', () => {
      vi.spyOn(window.performance, 'getEntriesByType').mockReturnValue([]);

      const result = getShopifyCookies('');

      expect(result).toEqual({
        _shopify_y: '',
        _shopify_s: '',
      });
    });

    it('ignores Server-Timing entries with empty descriptions', () => {
      const mockNavEntry = {
        serverTiming: [
          {name: '_y', description: '', duration: 0},
          {name: '_s', description: '', duration: 0},
        ],
      };

      vi.spyOn(window.performance, 'getEntriesByType').mockReturnValue([
        mockNavEntry,
      ] as any);

      const cookie = '_shopify_y=cookie-y;_shopify_s=cookie-s';
      const result = getShopifyCookies(cookie);

      expect(result).toEqual({
        _shopify_y: 'cookie-y',
        _shopify_s: 'cookie-s',
      });
    });
  });
});
