import {describe, it, expect} from 'vitest';
import {isMockShop, MOCK_SHOP_DOMAIN} from './mock-shop';

describe('isMockShop', () => {
  it('returns true for the exact mock.shop domain', () => {
    expect(isMockShop(MOCK_SHOP_DOMAIN)).toBe(true);
  });

  it('returns true when mock.shop appears within a URL', () => {
    expect(isMockShop('https://mock.shop/api/graphql')).toBe(true);
  });

  it('returns false for a real shop domain', () => {
    expect(isMockShop('my-store.myshopify.com')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isMockShop('')).toBe(false);
  });
});
