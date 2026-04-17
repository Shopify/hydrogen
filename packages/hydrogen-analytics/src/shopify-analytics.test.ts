import {describe, it, expect, vi, beforeEach} from 'vitest';
import {initShopifyAnalytics} from './shopify-analytics';
import {AnalyticsEvent} from './events';
import {sendShopifyAnalytics, MonorailEventName} from './utils';
import type {ShopAnalytics} from './types';

vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils')>();
  return {
    ...actual,
    sendShopifyAnalytics: vi.fn(),
    getClientBrowserParameters: vi.fn(() => ({
      uniqueToken: 'unique-token',
      visitToken: 'visit-token',
      url: 'http://localhost/',
      path: '/',
      search: '',
      referrer: '',
      title: 'Test',
      userAgent: 'vitest',
      navigationType: 'navigate',
      navigationApi: 'PerformanceNavigationTiming',
    })),
  };
});

const sendAnalyticsMock = vi.mocked(sendShopifyAnalytics);

const SHOP: ShopAnalytics = {
  shopId: 'gid://shopify/Shop/1',
  acceptedLanguage: 'EN',
  currency: 'USD',
  hydrogenSubchannelId: '0',
};

const PRODUCT = {
  id: 'gid://shopify/Product/1',
  variantId: 'gid://shopify/ProductVariant/1',
  title: 'Test Product',
  variantTitle: 'Default',
  vendor: 'TestVendor',
  price: '10.00',
  quantity: 1,
  productType: 'Snowboard',
};

function mockCustomerPrivacy() {
  (window as any).Shopify = {
    customerPrivacy: {
      analyticsProcessingAllowed: () => true,
      marketingAllowed: () => true,
      saleOfDataAllowed: () => true,
    },
  };
}

type SubscriberMap = Map<string, Array<(payload: any) => void>>;

function createMockDeps() {
  const subscriberMap: SubscriberMap = new Map();
  return {
    deps: {
      subscribe: (event: string, callback: (payload: any) => void) => {
        if (!subscriberMap.has(event)) subscriberMap.set(event, []);
        subscriberMap.get(event)!.push(callback);
        return () => {};
      },
      register: (_key: string) => ({ready: () => {}}),
      publish: (_event: string, _payload: any) => {},
    },
    fire(event: string, payload: any) {
      const handlers = subscriberMap.get(event) ?? [];
      for (const handler of handlers) {
        handler(payload);
      }
    },
  };
}

describe('validateProducts error messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomerPrivacy();
  });

  it('logs error when products array is empty', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const {deps, fire} = createMockDeps();
    initShopifyAnalytics(deps);

    fire(AnalyticsEvent.PRODUCT_VIEWED, {
      shop: SHOP,
      products: [],
      url: 'http://localhost/products/test',
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('data.products'),
    );
    errorSpy.mockRestore();
  });

  it('logs error for missing product field with specific field name', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const {deps, fire} = createMockDeps();
    initShopifyAnalytics(deps);

    fire(AnalyticsEvent.PRODUCT_VIEWED, {
      shop: SHOP,
      products: [{id: 'gid://shopify/Product/1'}], // missing title, price, vendor, etc.
      url: 'http://localhost/products/test',
    });

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('title'));
    errorSpy.mockRestore();
  });

  it('logs error for missing cart line field with merchandise path', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const {deps, fire} = createMockDeps();
    initShopifyAnalytics(deps);

    fire(AnalyticsEvent.PRODUCT_ADD_TO_CART, {
      shop: SHOP,
      cart: {id: 'gid://shopify/Cart/1'},
      currentLine: {
        id: 'gid://shopify/CartLine/1',
        quantity: 1,
        merchandise: {
          id: 'gid://shopify/ProductVariant/1',
          title: 'Default',
          price: {amount: '10.00'},
          product: {
            id: 'gid://shopify/Product/1',
            title: 'Test Product',
            vendor: '', // empty vendor
          },
        },
      },
    });

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('vendor'));
    errorSpy.mockRestore();
  });
});

describe('initShopifyAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomerPrivacy();
  });

  it('viewPayload is isolated between instances', () => {
    const instanceA = createMockDeps();
    const instanceB = createMockDeps();

    initShopifyAnalytics(instanceA.deps);
    initShopifyAnalytics(instanceB.deps);

    // Fire product_viewed on instance A — sets A's viewPayload
    instanceA.fire(AnalyticsEvent.PRODUCT_VIEWED, {
      shop: SHOP,
      products: [PRODUCT],
      url: 'http://localhost/products/test',
    });

    sendAnalyticsMock.mockClear();

    // Fire page_viewed on instance B — should NOT contain A's product data
    instanceB.fire(AnalyticsEvent.PAGE_VIEWED, {
      shop: SHOP,
      url: 'http://localhost/',
    });

    expect(sendShopifyAnalytics).toHaveBeenCalledOnce();
    const pageViewCall = sendAnalyticsMock.mock.calls[0][0];
    expect(pageViewCall.eventName).toBe(MonorailEventName.PAGE_VIEW_2);
    expect(pageViewCall.payload).not.toHaveProperty('pageType');
    expect(pageViewCall.payload).not.toHaveProperty('resourceId');
  });

  it('pageViewHandler merges viewPayload from prior view handler within same instance', () => {
    const {deps, fire} = createMockDeps();
    initShopifyAnalytics(deps);

    fire(AnalyticsEvent.PRODUCT_VIEWED, {
      shop: SHOP,
      products: [PRODUCT],
      url: 'http://localhost/products/test',
    });

    sendAnalyticsMock.mockClear();

    fire(AnalyticsEvent.PAGE_VIEWED, {
      shop: SHOP,
      url: 'http://localhost/products/test',
    });

    expect(sendShopifyAnalytics).toHaveBeenCalledOnce();
    const pageViewCall = sendAnalyticsMock.mock.calls[0][0];
    expect(pageViewCall.eventName).toBe(MonorailEventName.PAGE_VIEW_2);
    expect(pageViewCall.payload.pageType).toBe('product');
    expect(pageViewCall.payload.resourceId).toBe('gid://shopify/Product/1');
  });

  it('viewPayload resets after pageViewHandler fires', () => {
    const {deps, fire} = createMockDeps();
    initShopifyAnalytics(deps);

    // product_viewed sets viewPayload
    fire(AnalyticsEvent.PRODUCT_VIEWED, {
      shop: SHOP,
      products: [PRODUCT],
      url: 'http://localhost/products/test',
    });

    // First page_viewed consumes and resets viewPayload
    fire(AnalyticsEvent.PAGE_VIEWED, {
      shop: SHOP,
      url: 'http://localhost/products/test',
    });

    sendAnalyticsMock.mockClear();

    // Second page_viewed should NOT have product data
    fire(AnalyticsEvent.PAGE_VIEWED, {
      shop: SHOP,
      url: 'http://localhost/',
    });

    expect(sendShopifyAnalytics).toHaveBeenCalledOnce();
    const secondPageViewCall = sendAnalyticsMock.mock.calls[0][0];
    expect(secondPageViewCall.payload).not.toHaveProperty('pageType');
    expect(secondPageViewCall.payload).not.toHaveProperty('resourceId');
  });
});