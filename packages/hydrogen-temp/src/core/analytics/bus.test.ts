import {describe, it, expect, vi, beforeEach} from 'vitest';
import {createAnalyticsBus} from './bus';
import type {AnalyticsBusOptions, ShopAnalytics, AnalyticsCart} from './types';

/**
 * These tests mirror the assertions from the existing hydrogen
 * AnalyticsProvider.test.tsx to verify backward-compatible behavior.
 * Same test data, same payload shape expectations.
 */

const SHOP_DATA: ShopAnalytics = {
  shopId: 'gid://shopify/Shop/1',
  acceptedLanguage: 'EN',
  currency: 'USD',
  hydrogenSubchannelId: '0',
};

const CONSENT_DATA = {
  checkoutDomain: 'checkout.hydrogen.shop',
  storefrontAccessToken: '33ad0f277e864013b8e3c21d19432501',
};

const CART_DATA: AnalyticsCart = {
  updatedAt: '2024-03-26T21:49:07Z',
  id: 'gid://shopify/Cart/c1-123',
  lines: {
    nodes: [
      {
        id: 'gid://shopify/CartLine/373702e3-5b12-4ca8-83f1-e5c28150cc09?cart=c1-baf6e1a9669c049a865a469b564a1e44',
        quantity: 1,
        merchandise: {
          id: 'gid://shopify/ProductVariant/41007290548280',
          price: {
            currencyCode: 'USD',
            amount: '749.95',
          },
          title: '160cm / Syntax',
          product: {
            handle: 'the-full-stack',
            title: 'The Full Stack Snowboard',
            id: 'gid://shopify/Product/6730943823928',
            vendor: 'Snowdevil',
          },
        },
      },
    ],
  },
};

const CART_DATA_QUANTITY_INCREASED: AnalyticsCart = {
  updatedAt: '2024-03-27T21:49:07Z',
  id: 'gid://shopify/Cart/c1-123',
  lines: {
    nodes: [
      {
        id: 'gid://shopify/CartLine/373702e3-5b12-4ca8-83f1-e5c28150cc09?cart=c1-baf6e1a9669c049a865a469b564a1e44',
        quantity: 2,
        merchandise: {
          id: 'gid://shopify/ProductVariant/41007290548280',
          price: {
            currencyCode: 'USD',
            amount: '749.95',
          },
          title: '160cm / Syntax',
          product: {
            handle: 'the-full-stack',
            title: 'The Full Stack Snowboard',
            id: 'gid://shopify/Product/6730943823928',
            vendor: 'Snowdevil',
          },
        },
      },
    ],
  },
};

const CART_DATA_EMPTY: AnalyticsCart = {
  updatedAt: '2024-03-28T21:49:07Z',
  id: 'gid://shopify/Cart/c1-123',
  lines: {nodes: []},
};

function createTestBus(overrides: Partial<AnalyticsBusOptions> = {}) {
  return createAnalyticsBus({
    shop: SHOP_DATA,
    consent: CONSENT_DATA,
    canTrack: () => true,
    autoInit: false,
    ...overrides,
  });
}

describe('createAnalyticsBus', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('pub/sub', () => {
    it('delivers events to subscribers', () => {
      const bus = createTestBus();
      const callback = vi.fn();

      bus.subscribe('page_viewed', callback);
      const {ready} = bus.register('test');
      ready();

      bus.publish('page_viewed', {url: '/test', shop: SHOP_DATA});

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({url: '/test'}),
      );
    });

    it('returns an unsubscribe function', () => {
      const bus = createTestBus();
      const callback = vi.fn();

      const unsubscribe = bus.subscribe('page_viewed', callback);
      const {ready} = bus.register('test');
      ready();

      bus.publish('page_viewed', {url: '/first', shop: SHOP_DATA});
      expect(callback).toHaveBeenCalledOnce();

      unsubscribe();

      bus.publish('page_viewed', {url: '/second', shop: SHOP_DATA});
      expect(callback).toHaveBeenCalledOnce();
    });

    it('supports multiple subscribers for the same event', () => {
      const bus = createTestBus();
      const callbackA = vi.fn();
      const callbackB = vi.fn();

      bus.subscribe('page_viewed', callbackA);
      bus.subscribe('page_viewed', callbackB);

      const {ready} = bus.register('test');
      ready();

      bus.publish('page_viewed', {url: '/test', shop: SHOP_DATA});

      expect(callbackA).toHaveBeenCalledOnce();
      expect(callbackB).toHaveBeenCalledOnce();
    });

    it('isolates events by name', () => {
      const bus = createTestBus();
      const pageCallback = vi.fn();
      const productCallback = vi.fn();

      bus.subscribe('page_viewed', pageCallback);
      bus.subscribe('product_viewed', productCallback);

      const {ready} = bus.register('test');
      ready();

      bus.publish('page_viewed', {url: '/test', shop: SHOP_DATA});

      expect(pageCallback).toHaveBeenCalledOnce();
      expect(productCallback).not.toHaveBeenCalled();
    });

    it('catches subscriber errors without breaking other subscribers', () => {
      const bus = createTestBus();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      bus.subscribe('page_viewed', () => {
        throw new Error('subscriber failed');
      });
      const healthyCallback = vi.fn();
      bus.subscribe('page_viewed', healthyCallback);

      const {ready} = bus.register('test');
      ready();

      bus.publish('page_viewed', {url: '/test', shop: SHOP_DATA});

      expect(healthyCallback).toHaveBeenCalledOnce();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('register/ready coordination', () => {
    it('queues events until all registers are ready', () => {
      const bus = createTestBus();
      const callback = vi.fn();
      bus.subscribe('page_viewed', callback);

      const reg1 = bus.register('handler_a');
      const reg2 = bus.register('handler_b');

      bus.publish('page_viewed', {url: '/queued', shop: SHOP_DATA});
      expect(callback).not.toHaveBeenCalled();

      reg1.ready();
      expect(callback).not.toHaveBeenCalled();

      reg2.ready();
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({url: '/queued'}),
      );
    });

    it('uses last-write-wins for queued events with the same name', () => {
      const bus = createTestBus();
      const callback = vi.fn();
      bus.subscribe('page_viewed', callback);

      const {ready} = bus.register('handler');

      bus.publish('page_viewed', {url: '/first', shop: SHOP_DATA});
      bus.publish('page_viewed', {url: '/second', shop: SHOP_DATA});

      ready();

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({url: '/second'}),
      );
    });
  });

  describe('canTrack gate', () => {
    it('drops events when canTrack returns false', () => {
      const bus = createTestBus({canTrack: () => false});
      const callback = vi.fn();
      bus.subscribe('page_viewed', callback);

      const {ready} = bus.register('test');
      ready();

      bus.publish('page_viewed', {url: '/blocked', shop: SHOP_DATA});
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('instance isolation', () => {
    it('creates independent bus instances with no shared state', () => {
      const busA = createTestBus();
      const busB = createTestBus();

      const callbackA = vi.fn();
      const callbackB = vi.fn();

      busA.subscribe('page_viewed', callbackA);
      busB.subscribe('page_viewed', callbackB);

      busA.register('test').ready();
      busB.register('test').ready();

      busA.publish('page_viewed', {url: '/a', shop: SHOP_DATA});

      expect(callbackA).toHaveBeenCalledOnce();
      expect(callbackB).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('stops delivering events after destroy', () => {
      const bus = createTestBus();
      const callback = vi.fn();
      bus.subscribe('page_viewed', callback);
      bus.register('test').ready();

      bus.publish('page_viewed', {url: '/before', shop: SHOP_DATA});
      expect(callback).toHaveBeenCalledOnce();

      bus.destroy();

      bus.publish('page_viewed', {url: '/after', shop: SHOP_DATA});
      expect(callback).toHaveBeenCalledOnce();
    });
  });

  /**
   * The following tests mirror the existing hydrogen AnalyticsProvider.test.tsx
   * assertions to verify backward-compatible event payload shapes.
   */
  describe('backward-compat: page_viewed payload shape', () => {
    it('publishes page_viewed with shop, cart, and url', () => {
      const bus = createTestBus();
      const pageViewedEvent = vi.fn();

      bus.subscribe('page_viewed', pageViewedEvent);
      bus.register('test').ready();

      bus.publish('page_viewed', {
        shop: SHOP_DATA,
        cart: CART_DATA,
        prevCart: null,
        url: 'http://localhost/example/path/1',
        customData: {},
      });

      expect(pageViewedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          cart: expect.any(Object),
          shop: SHOP_DATA,
          url: expect.any(String),
        }),
      );
    });
  });

  describe('backward-compat: cart events via updateCart', () => {
    it('publishes product_added_to_cart with cart and shop when quantity increases', () => {
      const bus = createTestBus();
      const productAddedToCartEvent = vi.fn();
      bus.subscribe('cart_updated', vi.fn());
      bus.subscribe('product_added_to_cart', productAddedToCartEvent);
      bus.register('test').ready();

      bus.updateCart(CART_DATA);

      // Clear the initial "added" event from first cart load
      productAddedToCartEvent.mockClear();

      bus.updateCart(CART_DATA_QUANTITY_INCREASED);

      expect(productAddedToCartEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          cart: expect.any(Object),
          shop: SHOP_DATA,
        }),
      );
    });

    it('publishes product_removed_from_cart with cart and shop when line removed', () => {
      const bus = createTestBus();
      const productRemovedFromCartEvent = vi.fn();
      bus.subscribe('cart_updated', vi.fn());
      bus.subscribe('product_added_to_cart', vi.fn());
      bus.subscribe('product_removed_from_cart', productRemovedFromCartEvent);
      bus.register('test').ready();

      bus.updateCart(CART_DATA);
      bus.updateCart(CART_DATA_EMPTY);

      expect(productRemovedFromCartEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          cart: expect.any(Object),
          shop: SHOP_DATA,
        }),
      );
    });

    it('includes prevCart in cart_updated payload', () => {
      const bus = createTestBus();
      const cartUpdatedEvent = vi.fn();
      bus.subscribe('cart_updated', cartUpdatedEvent);
      bus.register('test').ready();

      bus.updateCart(CART_DATA);
      bus.updateCart(CART_DATA_QUANTITY_INCREASED);

      const secondCall = cartUpdatedEvent.mock.calls[1][0];
      expect(secondCall.cart).toBe(CART_DATA_QUANTITY_INCREASED);
      expect(secondCall.prevCart).toBe(CART_DATA);
    });

    it('does not duplicate cart_updated on same updatedAt', () => {
      const bus = createTestBus();
      const cartUpdatedEvent = vi.fn();
      bus.subscribe('cart_updated', cartUpdatedEvent);
      bus.register('test').ready();

      bus.updateCart(CART_DATA);
      bus.updateCart(CART_DATA);

      expect(cartUpdatedEvent).toHaveBeenCalledOnce();
    });

    it('deduplicates via localStorage on page reload', () => {
      const bus = createTestBus();
      const cartUpdatedEvent = vi.fn();
      bus.subscribe('cart_updated', cartUpdatedEvent);
      bus.register('test').ready();

      bus.updateCart(CART_DATA);
      expect(cartUpdatedEvent).toHaveBeenCalledOnce();

      // Simulate page reload: new bus instance, same localStorage
      const bus2 = createTestBus();
      const cartUpdatedEvent2 = vi.fn();
      bus2.subscribe('cart_updated', cartUpdatedEvent2);
      bus2.register('test').ready();

      bus2.updateCart(CART_DATA);
      expect(cartUpdatedEvent2).not.toHaveBeenCalled();
    });
  });
});
