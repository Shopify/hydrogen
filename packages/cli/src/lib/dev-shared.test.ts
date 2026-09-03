import {describe, it, expect} from 'vitest';
import {isMockShop} from './dev-shared.js';

describe('isMockShop', () => {
  it('recognizes the default mock.shop store', () => {
    expect(isMockShop({PUBLIC_STORE_DOMAIN: 'mock.shop'})).toBe(true);
  });

  it('recognizes a store on its own mock.shop host', () => {
    expect(isMockShop({PUBLIC_STORE_DOMAIN: 'pets.mock.shop'})).toBe(true);
  });

  it('treats an empty domain as the mock.shop fallback', () => {
    expect(isMockShop({PUBLIC_STORE_DOMAIN: ''})).toBe(true);
  });

  it('leaves an unset domain to remote variables', () => {
    expect(isMockShop({})).toBe(false);
  });

  it('does not match real stores or look-alikes', () => {
    expect(isMockShop({PUBLIC_STORE_DOMAIN: 'my-store.myshopify.com'})).toBe(
      false,
    );
    expect(isMockShop({PUBLIC_STORE_DOMAIN: 'notmock.shop'})).toBe(false);
  });
});
