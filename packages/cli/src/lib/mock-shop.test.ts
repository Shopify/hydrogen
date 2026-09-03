import {describe, it, expect, vi} from 'vitest';
import {
  fetchMockShopStores,
  normalizeMockShopStore,
  parseMockShopDirectory,
} from './mock-shop.js';

const DIRECTORY = `# mock.shop

> mock.shop is an auth-free Shopify Storefront GraphQL API.

## Stores

- [Mock.shop (default)](https://mock.shop/api): Apparel basics. Collections: Tops, Bottoms.
- [Paws and Whimsy](https://pets.mock.shop/api): Durable, stylish gear for pets. Categories: Dog Toys, Pet Beds.
- [Bare Shop](https://bare.mock.shop/api)

## Build and deploy your storefront

- [Shopify Hydrogen](https://shopify.dev/docs/storefronts/headless/hydrogen): React-based framework.
`;

describe('parseMockShopDirectory', () => {
  it('reads one store per directory line and ignores everything else', () => {
    expect(parseMockShopDirectory(DIRECTORY)).toEqual([
      {
        name: 'Mock.shop (default)',
        host: 'mock.shop',
        summary: 'Apparel basics. Collections: Tops, Bottoms.',
      },
      {
        name: 'Paws and Whimsy',
        host: 'pets.mock.shop',
        summary:
          'Durable, stylish gear for pets. Categories: Dog Toys, Pet Beds.',
      },
      {name: 'Bare Shop', host: 'bare.mock.shop', summary: ''},
    ]);
  });

  it('returns nothing for text that is not a directory', () => {
    expect(parseMockShopDirectory('<html>404</html>')).toEqual([]);
  });
});

describe('normalizeMockShopStore', () => {
  it('accepts a subdomain, a host, or an API URL', () => {
    expect(normalizeMockShopStore('pets')).toBe('pets.mock.shop');
    expect(normalizeMockShopStore('Pets.mock.shop')).toBe('pets.mock.shop');
    expect(normalizeMockShopStore('https://pets.mock.shop/api')).toBe(
      'pets.mock.shop',
    );
  });

  it('treats the apex and an empty value as the default store', () => {
    expect(normalizeMockShopStore('mock.shop')).toBe('mock.shop');
    expect(normalizeMockShopStore('  ')).toBe('mock.shop');
  });

  it('rejects values that cannot name a store', () => {
    expect(() => normalizeMockShopStore('my-store.myshopify.com')).toThrow(
      /not a mock.shop store/,
    );
    expect(() => normalizeMockShopStore('-bad-')).toThrow(
      /not a mock.shop store/,
    );
  });
});

describe('fetchMockShopStores', () => {
  it('parses a successful directory response', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      text: async () => DIRECTORY,
    }));

    const stores = await fetchMockShopStores(fetchFn as any);

    expect(fetchFn).toHaveBeenCalledWith(
      'https://mock.shop/llms.txt',
      expect.objectContaining({signal: expect.anything()}),
    );
    expect(stores.map((store) => store.host)).toEqual([
      'mock.shop',
      'pets.mock.shop',
      'bare.mock.shop',
    ]);
  });

  it('yields no stores when the directory is unreachable or not OK', async () => {
    const failing = vi.fn(async () => {
      throw new Error('offline');
    });
    const notOk = vi.fn(async () => ({ok: false, text: async () => ''}));

    await expect(fetchMockShopStores(failing as any)).resolves.toEqual([]);
    await expect(fetchMockShopStores(notOk as any)).resolves.toEqual([]);
  });
});
