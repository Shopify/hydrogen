import {expect, it, describe} from 'vitest';
import {expectType} from 'ts-expect';
import {ShopifySalesChannel} from './analytics-constants.js';
import {
  pageView,
  addToCart,
} from './analytics-schema-custom-storefront-customer-tracking.js';
import {
  BASE_PAYLOAD,
  BASE_PRODUCT_PAYLOAD,
} from './analytics-schema.test.helpers.js';
import type {
  ShopifyAnalyticsPayload,
  ShopifyMonorailPayload,
  ShopifyPageViewPayload,
} from './analytics-types.js';
import {version} from '../package.json';
import {getProductsValue, getProductValue} from './analytics-utils.js';

describe(`analytics schema - custom storefront customer tracking`, () => {
  describe('page view', () => {
    it(`base payload with default values`, () => {
      const pageViewPayload = BASE_PAYLOAD;
      const events = pageView(pageViewPayload);

      expectType<ShopifyMonorailPayload[]>(events);
      expect(events.length).toBe(1);
      expect(events[0]).toEqual(
        getExpectedPayload(pageViewPayload, {
          event_name: 'page_rendered',
          canonical_url: pageViewPayload.url,
        }),
      );
    });

    it(`base payload with non-default values`, () => {
      const pageViewPayload: ShopifyPageViewPayload = {
        ...BASE_PAYLOAD,
        shopId: 'gid://shopify/Shop/2',
        hasUserConsent: false,
        url: 'https://example.com/fr',
        shopifySalesChannel: ShopifySalesChannel.hydrogen,
        storefrontId: '1',
        acceptedLanguage: 'FR',
        customerId: 'gid://shopify/Customer/1',
        pageType: 'index',
        resourceId: 'gid://shopify/Product/1',
        canonicalUrl: 'https://example.com',
      };
      const events = pageView(pageViewPayload);

      expectType<ShopifyMonorailPayload[]>(events);
      expect(events.length).toBe(1);
      expect(events[0]).toEqual(
        getExpectedPayload(pageViewPayload, {
          source: 'hydrogen',
          shop_id: 2,
          event_name: 'page_rendered',
          hydrogenSubchannelId: '1',
          is_persistent_cookie: false,
          customer_id: 1,
          canonical_url: pageViewPayload.canonicalUrl,
        }),
      );
    });

    it(`base payload with non-default values using hydrogenSubchannelId`, () => {
      const pageViewPayload: ShopifyPageViewPayload = {
        ...BASE_PAYLOAD,
        shopId: 'gid://shopify/Shop/2',
        hasUserConsent: false,
        url: 'https://example.com/fr',
        shopifySalesChannel: ShopifySalesChannel.hydrogen,
        assetVersionId: '123',
        hydrogenSubchannelId: '1',
        acceptedLanguage: 'FR',
        customerId: 'gid://shopify/Customer/1',
        pageType: 'index',
        resourceId: 'gid://shopify/Product/1',
        canonicalUrl: 'https://example.com',
        ccpaEnforced: true,
        gdprEnforced: true,
        analyticsAllowed: true,
        marketingAllowed: true,
        saleOfDataAllowed: true,
      };
      const events = pageView(pageViewPayload);

      expectType<ShopifyMonorailPayload[]>(events);
      expect(events.length).toBe(1);
      expect(events[0]).toEqual(
        getExpectedPayload(pageViewPayload, {
          source: 'hydrogen',
          asset_version_id: '123',
          shop_id: 2,
          event_name: 'page_rendered',
          hydrogenSubchannelId: '1',
          is_persistent_cookie: false,
          customer_id: 1,
          canonical_url: pageViewPayload.canonicalUrl,
          ccpa_enforced: true,
          gdpr_enforced: true,
          gdpr_enforced_as_string: 'true',
          analytics_allowed: true,
          marketing_allowed: true,
          sale_of_data_allowed: true,
        }),
      );
    });

    describe('collection', () => {
      it(`with base payload`, () => {
        const pageViewPayload = {
          ...BASE_PAYLOAD,
          pageType: 'collection',
          collectionHandle: 'test',
          collectionId: 'gid://shopify/Collection/1',
        };
        const events = pageView(pageViewPayload);

        expectType<ShopifyMonorailPayload[]>(events);
        expect(events.length).toBe(2);
        expect(events[0]).toEqual(
          getExpectedPayload(pageViewPayload, {
            event_name: 'page_rendered',
            canonical_url: pageViewPayload.url,
          }),
        );
        expect(events[1]).toEqual(
          getExpectedPayload(pageViewPayload, {
            event_name: 'collection_page_rendered',
            collection_name: pageViewPayload.collectionHandle,
            collection_id: 1,
            canonical_url: pageViewPayload.url,
          }),
        );
      });
    });

    describe('product', () => {
      it(`with no product payload`, () => {
        const pageViewPayload = {
          ...BASE_PAYLOAD,
          pageType: 'product',
          totalValue: getProductsValue(BASE_PAYLOAD.products),
        };
        const events = pageView(pageViewPayload);

        expectType<ShopifyMonorailPayload[]>(events);
        expect(events.length).toBe(2);
        expect(events[0]).toEqual(
          getExpectedPayload(pageViewPayload, {
            event_name: 'page_rendered',
            canonical_url: pageViewPayload.url,
          }),
        );
        expect(events[1]).toEqual(
          getExpectedPayload(pageViewPayload, {
            event_name: 'product_page_rendered',
            total_value: pageViewPayload.totalValue,
            products: [],
            canonical_url: pageViewPayload.url,
          }),
        );
      });

      it(`with base product payload`, () => {
        const productPayload = BASE_PRODUCT_PAYLOAD;
        const pageViewPayload = {
          ...BASE_PAYLOAD,
          pageType: 'product',
          products: [productPayload],
          totalValue: getProductValue(productPayload),
        };
        const events = pageView(pageViewPayload);

        expectType<ShopifyMonorailPayload[]>(events);
        expect(events.length).toBe(2);
        expect(events[0]).toEqual(
          getExpectedPayload(pageViewPayload, {
            event_name: 'page_rendered',
            canonical_url: pageViewPayload.url,
          }),
        );
        expect(events[1]).toEqual(
          getExpectedPayload(pageViewPayload, {
            event_name: 'product_page_rendered',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            products: expect.anything(),
            canonical_url: pageViewPayload.url,
          }),
        );
        const productEventPayload = events[1].payload;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const product = JSON.parse(
          (productEventPayload.products && productEventPayload.products[0]) ||
            '{}',
        );
        expect(product).toEqual({
          ...getForwardedProductPayload(productPayload),
          variant: '',
          quantity: 0,
          product_id: 1,
          price: parseFloat(productPayload.price),
        });
      });
      it(`with non-default product payload`, () => {
        const productPayload = {
          ...BASE_PRODUCT_PAYLOAD,
          variantGid: 'gid://shopify/ProductVariant/2',
          variantName: 'test',
          category: 'test',
          sku: '123',
          quantity: 1,
        };
        const pageViewPayload = {
          ...BASE_PAYLOAD,
          pageType: 'product',
          products: [productPayload],
          totalValue: getProductValue(productPayload),
        };
        const events = pageView(pageViewPayload);

        expectType<ShopifyMonorailPayload[]>(events);
        expect(events.length).toBe(2);
        expect(events[0]).toEqual(
          getExpectedPayload(pageViewPayload, {
            event_name: 'page_rendered',
            canonical_url: pageViewPayload.url,
          }),
        );
        expect(events[1]).toEqual(
          getExpectedPayload(pageViewPayload, {
            event_name: 'product_page_rendered',
            total_value: pageViewPayload.totalValue,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            products: expect.anything(),
            canonical_url: pageViewPayload.url,
          }),
        );
        const productEventPayload = events[1].payload;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const product = JSON.parse(
          (productEventPayload.products && productEventPayload.products[0]) ||
            '{}',
        );
        expect(product).toEqual({
          ...getForwardedProductPayload(productPayload),
          variant: productPayload.variantName,
          quantity: 1,
          product_id: 1,
          category: productPayload.category,
          sku: productPayload.sku,
          variant_gid: productPayload.variantGid,
          variant_id: 2,
          price: parseFloat(productPayload.price),
        });
      });
    });

    describe('search', () => {
      it(`with base payload`, () => {
        const pageViewPayload = {
          ...BASE_PAYLOAD,
          pageType: 'search',
          searchString: 'test',
        };
        const events = pageView(pageViewPayload);

        expectType<ShopifyMonorailPayload[]>(events);
        expect(events.length).toBe(2);
        expect(events[0]).toEqual(
          getExpectedPayload(pageViewPayload, {
            event_name: 'page_rendered',
            canonical_url: pageViewPayload.url,
          }),
        );
        expect(events[1]).toEqual(
          getExpectedPayload(pageViewPayload, {
            event_name: 'search_submitted',
            search_string: pageViewPayload.searchString,
            canonical_url: pageViewPayload.url,
          }),
        );
      });
    });
  });

  describe('add to cart', () => {
    it(`with base product payload`, () => {
      const productPayload = BASE_PRODUCT_PAYLOAD;
      const addToCartPayload = {
        ...BASE_PAYLOAD,
        cartId: 'gid://shopify/Cart/abc123',
        products: [productPayload],
        totalValue: getProductValue(productPayload),
      };
      const events = addToCart(addToCartPayload);

      expectType<ShopifyMonorailPayload[]>(events);
      expect(events.length).toBe(1);
      expect(events[0]).toEqual(
        getExpectedPayload(addToCartPayload, {
          event_name: 'product_added_to_cart',
          cart_token: 'abc123',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          products: expect.anything(),
        }),
      );
      const productEventPayload = events[0].payload;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const product = JSON.parse(
        (productEventPayload.products && productEventPayload.products[0]) ||
          '{}',
      );
      expect(product).toEqual({
        ...getForwardedProductPayload(productPayload),
        variant: '',
        quantity: 0,
        product_id: 1,
        price: parseFloat(productPayload.price),
      });
    });

    it(`with base product payload quantity 1`, () => {
      const productPayload = {
        ...BASE_PRODUCT_PAYLOAD,
        quantity: 1,
      };
      const addToCartPayload = {
        ...BASE_PAYLOAD,
        cartId: 'gid://shopify/Cart/abc123',
        products: [productPayload],
        totalValue: getProductValue(productPayload),
      };
      const events = addToCart(addToCartPayload);

      expectType<ShopifyMonorailPayload[]>(events);
      expect(events.length).toBe(1);
      expect(events[0]).toEqual(
        getExpectedPayload(addToCartPayload, {
          event_name: 'product_added_to_cart',
          cart_token: 'abc123',
          total_value: addToCartPayload.totalValue,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          products: expect.anything(),
        }),
      );
      const productEventPayload = events[0].payload;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const product = JSON.parse(
        (productEventPayload.products && productEventPayload.products[0]) ||
          '{}',
      );
      expect(product).toEqual({
        ...getForwardedProductPayload(productPayload),
        variant: '',
        quantity: 1,
        product_id: 1,
        price: parseFloat(productPayload.price),
      });
    });
  });
});

function getExpectedPayload(
  initPayload: ShopifyAnalyticsPayload,
  extraPayload: ShopifyMonorailPayload,
) {
  return {
    schema_id: 'custom_storefront_customer_tracking/1.2',
    payload: {
      ...getForwardedPayload(initPayload),
      ...extraPayload,
    },
    metadata: {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      event_created_at_ms: expect.any(Number),
    },
  };
}

function getForwardedPayload(initPayload: ShopifyAnalyticsPayload) {
  return {
    shop_id: 1,
    source: 'headless',
    asset_version_id: version,
    hydrogenSubchannelId: '0',
    is_persistent_cookie: true,
    user_agent: initPayload.userAgent,
    unique_token: initPayload.uniqueToken,
    deprecated_visit_token: initPayload.visitToken,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    event_id: expect.any(String),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    event_time: expect.any(Number),
    event_source_url: initPayload.url,
    referrer: initPayload.referrer,
    currency: initPayload.currency,
    ccpa_enforced: false,
    gdpr_enforced: false,
    gdpr_enforced_as_string: 'false',
    navigation_api: initPayload.navigationApi,
    navigation_type: initPayload.navigationType,
    analytics_allowed: false,
    marketing_allowed: false,
    sale_of_data_allowed: false,
  };
}

function getForwardedProductPayload(initPayload: ShopifyMonorailPayload) {
  return {
    product_gid: initPayload.productGid,
    name: initPayload.name,
    brand: initPayload.brand,
    price: initPayload.price,
  };
}
