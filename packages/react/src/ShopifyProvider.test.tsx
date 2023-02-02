import {render, screen, renderHook} from '@testing-library/react';
import {
  ShopifyProvider,
  useShop,
  type ShopifyProviderProps,
} from './ShopifyProvider.js';
import type {PartialDeep} from 'type-fest';

const SHOPIFY_CONFIG: ShopifyProviderProps = {
  storeDomain: 'https://notashop.myshopify.com',
  storefrontToken: 'abc123',
  storefrontApiVersion: '2023-01',
  countryIsoCode: 'CA',
  languageIsoCode: 'EN',
};

describe('<ShopifyProvider/>', () => {
  it('renders its children', () => {
    render(
      <ShopifyProvider {...SHOPIFY_CONFIG}>
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
            {...SHOPIFY_CONFIG}
            storeDomain="https://notashop.myshopify.com"
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
            {...SHOPIFY_CONFIG}
            storeDomain="https://notashop.myshopify.com"
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
            {...SHOPIFY_CONFIG}
            storeDomain="https://notashop.myshopify.com"
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
            {...SHOPIFY_CONFIG}
            storeDomain="https://notashop.myshopify.com"
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
            {...SHOPIFY_CONFIG}
            storeDomain="https://notashop.myshopify.com"
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
            {...SHOPIFY_CONFIG}
            storeDomain="https://notashop.myshopify.com"
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

  describe(`getStorefrontApiUrl`, () => {
    it(`generates the API URL`, () => {
      const {result} = renderHook(() => useShop(), {
        wrapper: ({children}) => (
          <ShopifyProvider
            {...SHOPIFY_CONFIG}
            storeDomain="https://notashop.myshopify.com"
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
            {...SHOPIFY_CONFIG}
            storeDomain="https://notashop.myshopify.com"
          >
            {children}
          </ShopifyProvider>
        ),
      });

      expect(
        result.current.getStorefrontApiUrl({
          storeDomain: 'https://test.myshopify.com',
        })
      ).toBe('https://test.myshopify.com/api/2023-01/graphql.json');
    });

    it(`handles when a '/' is at the end of the url and doesn't add an extra one`, () => {
      const {result} = renderHook(() => useShop(), {
        wrapper: ({children}) => (
          <ShopifyProvider
            {...SHOPIFY_CONFIG}
            storeDomain="https://notashop.myshopify.com/"
          >
            {children}
          </ShopifyProvider>
        ),
      });

      expect(result.current.getStorefrontApiUrl()).toBe(
        'https://notashop.myshopify.com/api/2023-01/graphql.json'
      );
    });
  });
});

export function getShopifyConfig(
  config: PartialDeep<ShopifyProviderProps, {recurseIntoArrays: true}> = {}
) {
  return {
    countryIsoCode: config.countryIsoCode ?? 'US',
    languageIsoCode: config.languageIsoCode ?? 'EN',
    storeDomain: config.storeDomain ?? 'https://notashop.myshopify.io',
    storefrontToken: config.storefrontToken ?? 'abc123',
    storefrontApiVersion: config.storefrontApiVersion ?? '2023-01',
  };
}
