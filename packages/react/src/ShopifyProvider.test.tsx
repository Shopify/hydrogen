import {render, screen, renderHook} from '@testing-library/react';
import {
  ShopifyProvider,
  useShop,
  type ShopifyContextProps,
} from './ShopifyProvider.js';
import type {PartialDeep} from 'type-fest';

const SHOPIFY_CONFIG: ShopifyContextProps = {
  storeDomain: 'notashop.myshopify.com',
  storefrontToken: 'abc123',
  storefrontApiVersion: '2022-10',
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

  it(`contains 'storeDomain' without https:// prefix`, () => {
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

    expect(result.current.storeDomain).toBe('notashop.myshopify.com');
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
        'https://notashop.myshopify.com/api/2022-10/graphql.json'
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
          storeDomain: 'override.myshopify.com',
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
        'X-SDK-Variant': 'hydrogen-ui',
        'X-SDK-Variant-Source': 'react',
        'X-SDK-Version': '2022-10',
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
        'X-SDK-Variant': 'hydrogen-ui',
        'X-SDK-Variant-Source': 'react',
        'X-SDK-Version': '2022-10',
        'X-Shopify-Storefront-Access-Token': 'newtoken',
        'content-type': 'application/graphql',
      });
    });
  });

  describe(`storeDomain`, () => {
    it(`works with just the subdomain`, () => {
      const {result} = renderHook(() => useShop(), {
        wrapper: ({children}) => (
          <ShopifyProvider
            shopifyConfig={{
              ...SHOPIFY_CONFIG,
              storeDomain: 'notashop',
            }}
          >
            {children}
          </ShopifyProvider>
        ),
      });

      expect(result.current.storeDomain).toBe('notashop');
    });
  });

  describe(`getShopifyDomain()`, () => {
    it(`works with just the subdomain`, () => {
      const {result} = renderHook(() => useShop(), {
        wrapper: ({children}) => (
          <ShopifyProvider
            shopifyConfig={{
              ...SHOPIFY_CONFIG,
              storeDomain: 'notashop',
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

    it(`works with the domain`, () => {
      // @deprecated to be removed when we no longer support passing in '.myshopify.com' for domainName
      const {result} = renderHook(() => useShop(), {
        wrapper: ({children}) => (
          <ShopifyProvider
            shopifyConfig={{
              ...SHOPIFY_CONFIG,
              storeDomain: 'notashop.myshopify.com',
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

    it(`works with just the subdomain as override`, () => {
      const {result} = renderHook(() => useShop(), {
        wrapper: ({children}) => (
          <ShopifyProvider
            shopifyConfig={{
              ...SHOPIFY_CONFIG,
              storeDomain: 'notashop',
            }}
          >
            {children}
          </ShopifyProvider>
        ),
      });

      expect(result.current.getShopifyDomain({storeDomain: 'test'})).toBe(
        'https://test.myshopify.com'
      );
    });

    it(`works with the domain as override`, () => {
      // @deprecated to be removed when we no longer support passing in '.myshopify.com' for domainName
      const {result} = renderHook(() => useShop(), {
        wrapper: ({children}) => (
          <ShopifyProvider
            shopifyConfig={{
              ...SHOPIFY_CONFIG,
              storeDomain: 'notashop.myshopify.com',
            }}
          >
            {children}
          </ShopifyProvider>
        ),
      });

      expect(
        result.current.getShopifyDomain({storeDomain: 'test.myshopify.com'})
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
    storeDomain: config.storeDomain ?? 'notashop.myshopify.io',
    storefrontToken: config.storefrontToken ?? 'abc123',
    storefrontApiVersion: config.storefrontApiVersion ?? '2022-10',
  };
}
