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
    it('returns object with SHOPIFY_Y and SHOPIFY_X', () => {
      const cookie =
        '_shopify_m=persistent; _y=44c60bb0-577c-4901-874c-92cb323fccf1; _shopify_y=44c60bb0-577c-4901-874c-92cb323fccf1; _shopify_y=44c60bb0-577c-4901-874c-92cb323fccf1; _tracking_consent={"lim":["GDPR"],"v":"2.0","con":{"GDPR":""},"reg":"CCPA"}; _shopify_s=a797b9ef-C0E7-4536-18BA-2828BA504882';
      expect(getShopifyCookies(cookie)).toMatchObject<ShopifyCookies>({
        _shopify_y: '44c60bb0-577c-4901-874c-92cb323fccf1',
        _shopify_s: 'a797b9ef-C0E7-4536-18BA-2828BA504882',
      });
    });
  });
});
