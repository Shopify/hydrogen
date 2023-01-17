import {render, screen, renderHook} from '@testing-library/react';
import {
  ShopifyProvider,
  useShop,
  type ShopifyContextProps,
} from './ShopifyProvider.js';
import type {PartialDeep} from 'type-fest';

const SHOPIFY_CONFIG: ShopifyContextProps = {
  storeDomain: 'https://notashop.myshopify.com',
  storefrontToken: 'abc123',
  storefrontApiVersion: '2023-01',
  country: {
    isoCode: 'CA',
  },
  language: {
    isoCode: 'EN',
  },
  locale: 'en-CA',
};

describe('<ShopifyProvider/>', () => {
  it('renders its children', () => {
    render(
      <ShopifyProvider shopifyConfig={SHOPIFY_CONFIG}>
        <div>child</div>;
      </ShopifyProvider>
    );

    expect(screen.getByText('child')).toBeInTheDocument();
  });

  describe(`getStorefrontApiUrl()`, () => {
    it(`returns the correct values`, () => {
      const {result} = renderHook(() => useShop(), {
        wrapper: ({children}) => (
          <ShopifyProvider
            shopifyConfig={{
              ...SHOPIFY_CONFIG,
              storeDomain: 'https://notashop.myshopify.com',
            }}
          >
            {children}
          </ShopifyProvider>
        ),
      });

      expect(result.current.getStorefrontApiUrl()).toBe(
        'https://notashop.myshopify.com/api/2023-01/graphql.json'
      );
    });

    it(`allows overrides`, () => {
      const {result} = renderHook(() => useShop(), {
        wrapper: ({children}) => (
          <ShopifyProvider
            shopifyConfig={{
              ...SHOPIFY_CONFIG,
              storeDomain: 'https://notashop.myshopify.com',
            }}
          >
            {children}
          </ShopifyProvider>
        ),
      });

      expect(
        result.current.getStorefrontApiUrl({
          storeDomain: 'https://override.myshopify.com',
          storefrontApiVersion: '2022-07',
        })
      ).toBe('https://override.myshopify.com/api/2022-07/graphql.json');
    });
  });

  describe(`getPublicTokenHeaders()`, () => {
    it(`returns the correct values`, () => {
      const {result} = renderHook(() => useShop(), {
        wrapper: ({children}) => (
          <ShopifyProvider
            shopifyConfig={{
              ...SHOPIFY_CONFIG,
              storeDomain: 'https://notashop.myshopify.com',
            }}
          >
            {children}
          </ShopifyProvider>
        ),
      });

      expect(
        result.current.getPublicTokenHeaders({contentType: 'json'})
      ).toEqual({
        'X-SDK-Variant': 'storefront-kit',
        'X-SDK-Variant-Source': 'react',
        'X-SDK-Version': '2023-01',
        'X-Shopify-Storefront-Access-Token': 'abc123',
        'content-type': 'application/json',
      });
    });

    it(`allows overrides`, () => {
      const {result} = renderHook(() => useShop(), {
        wrapper: ({children}) => (
          <ShopifyProvider
            shopifyConfig={{
              ...SHOPIFY_CONFIG,
              storeDomain: 'https://notashop.myshopify.com',
            }}
          >
            {children}
          </ShopifyProvider>
        ),
      });

      expect(
        result.current.getPublicTokenHeaders({
          contentType: 'graphql',
          storefrontToken: 'newtoken',
        })
      ).toEqual({
        'X-SDK-Variant': 'storefront-kit',
        'X-SDK-Variant-Source': 'react',
        'X-SDK-Version': '2023-01',
        'X-Shopify-Storefront-Access-Token': 'newtoken',
        'content-type': 'application/graphql',
      });
    });
  });

  describe(`getShopifyDomain()`, () => {
    it(`works with the domain`, () => {
      const {result} = renderHook(() => useShop(), {
        wrapper: ({children}) => (
          <ShopifyProvider
            shopifyConfig={{
              ...SHOPIFY_CONFIG,
              storeDomain: 'https://notashop.myshopify.com',
            }}
          >
            {children}
          </ShopifyProvider>
        ),
      });

      expect(result.current.getShopifyDomain()).toBe(
        'https://notashop.myshopify.com'
      );
    });

    it(`works with the domain as override`, () => {
      const {result} = renderHook(() => useShop(), {
        wrapper: ({children}) => (
          <ShopifyProvider
            shopifyConfig={{
              ...SHOPIFY_CONFIG,
              storeDomain: 'https://notashop.myshopify.com',
            }}
          >
            {children}
          </ShopifyProvider>
        ),
      });

      expect(
        result.current.getShopifyDomain({
          storeDomain: 'https://test.myshopify.com',
        })
      ).toBe('https://test.myshopify.com');
    });
  });
});

export function getShopifyConfig(
  config: PartialDeep<ShopifyContextProps, {recurseIntoArrays: true}> = {}
) {
  return {
    country: {
      isoCode: config.country?.isoCode ?? 'US',
    },
    language: {
      isoCode: config.language?.isoCode ?? 'EN',
    },
    locale: config.locale ?? 'EN-US',
    storeDomain: config.storeDomain ?? 'https://notashop.myshopify.io',
    storefrontToken: config.storefrontToken ?? 'abc123',
    storefrontApiVersion: config.storefrontApiVersion ?? '2023-01',
  };
}
