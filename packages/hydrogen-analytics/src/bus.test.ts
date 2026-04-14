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

    it('preserves all queued events including duplicates of the same type', () => {
      const bus = createTestBus();
      const callback = vi.fn();
      bus.subscribe('page_viewed', callback);

      const {ready} = bus.register('handler');

      bus.publish('page_viewed', {url: '/first', shop: SHOP_DATA});
      bus.publish('page_viewed', {url: '/second', shop: SHOP_DATA});

      ready();

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({url: '/first'}),
      );
      expect(callback).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({url: '/second'}),
      );
    });
  });

  describe('canTrack gate', () => {
    it('drops events when canTrack returns false (not queued for later)', () => {
      let trackingAllowed = false;
      const bus = createTestBus({canTrack: () => trackingAllowed});
      const callback = vi.fn();
      bus.subscribe('page_viewed', callback);

      // Publish while canTrack=false — event should be permanently dropped
      bus.publish('page_viewed', {url: '/blocked', shop: SHOP_DATA});
      expect(callback).not.toHaveBeenCalled();

      // Enable tracking and register — if the event was queued, drain would fire it
      trackingAllowed = true;
      const {ready} = bus.register('test');
      ready();

      // The dropped event should NOT appear — only events published after
      // canTrack=true should be deliverable
      expect(callback).not.toHaveBeenCalled();

      // New events with canTrack=true should work normally
      bus.publish('page_viewed', {url: '/allowed', shop: SHOP_DATA});
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({url: '/allowed'}),
      );
    });

    it('queues events only when registers are not ready (not canTrack)', () => {
      const bus = createTestBus({canTrack: () => true});
      const callback = vi.fn();
      bus.subscribe('page_viewed', callback);

      const {ready} = bus.register('handler');

      // canTrack=true but register not ready — should queue
      bus.publish('page_viewed', {url: '/queued', shop: SHOP_DATA});
      expect(callback).not.toHaveBeenCalled();

      ready();
      // Queue drains — event delivered
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({url: '/queued'}),
      );
    });

    it('drain does not re-check canTrack (queued events already passed the gate)', () => {
      let trackingAllowed = true;
      const bus = createTestBus({canTrack: () => trackingAllowed});
      const callback = vi.fn();
      bus.subscribe('page_viewed', callback);

      const {ready} = bus.register('handler');

      // Publish while canTrack=true, registers not ready — queued
      bus.publish('page_viewed', {url: '/queued', shop: SHOP_DATA});
      expect(callback).not.toHaveBeenCalled();

      // Revoke tracking before drain
      trackingAllowed = false;

      // Drain should still deliver — event already passed canTrack gate at publish time
      ready();
      expect(callback).toHaveBeenCalledOnce();
    });
  });

  describe('instance isolation', () => {
    // This test covers pub/sub isolation with autoInit: false
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

    // This test verifies that with autoInit: true, two bus instances maintain
    // separate internal state. The detailed viewPayload isolation tests live
    // in shopify-analytics.test.ts; this test confirms the bus wiring.
    //
    // With autoInit, initConsent creates an Internal_Shopify_Analytics register
    // that blocks delivery (consent script can't load in happy-dom). We verify
    // isolation by confirming each bus queues independently: destroying bus A
    // should not affect bus B's ability to queue and later deliver events.
    it('creates isolated internal state per bus instance (autoInit)', () => {
      const busA = createAnalyticsBus({
        shop: SHOP_DATA,
        consent: CONSENT_DATA,
        canTrack: () => true,
        autoInit: true,
      });
      const busB = createAnalyticsBus({
        shop: SHOP_DATA,
        consent: CONSENT_DATA,
        canTrack: () => true,
        autoInit: true,
      });

      const callbackB = vi.fn();
      busB.subscribe('page_viewed', callbackB);

      // Destroying bus A should have no effect on bus B
      busA.destroy();

      // Bus B should still be functional (events queued, not delivered yet,
      // because internal registers aren't ready — but not destroyed)
      busB.publish('page_viewed', {url: '/b', shop: SHOP_DATA});

      // Events are queued (internal register not ready), not dropped (not destroyed)
      // To verify: if we call destroy on B, events stop. But before destroy,
      // the bus is still alive and independent of A.
      expect(callbackB).not.toHaveBeenCalled(); // queued, not delivered

      // Add a manual register and ready it — this doesn't unblock Internal_Shopify_Analytics,
      // but proves bus B is still alive after bus A was destroyed
      const reg = busB.register('test-manual');
      reg.ready();

      // Still queued because Internal_Shopify_Analytics isn't ready
      expect(callbackB).not.toHaveBeenCalled();

      busB.destroy();

      // After destroy, bus B drops events
      busB.publish('page_viewed', {url: '/c', shop: SHOP_DATA});
      expect(callbackB).not.toHaveBeenCalled();
    });
  });

  describe('mock shop detection', () => {
    it('warns when mock shop ID is detected', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockShopData = {
        ...SHOP_DATA,
        shopId: 'gid://shopify/Shop/68817551382',
      };
      createAnalyticsBus({
        shop: mockShopData,
        consent: CONSENT_DATA,
        canTrack: () => true,
        autoInit: true,
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mock shop'),
      );
      warnSpy.mockRestore();
    });

    it('does not warn for normal shop IDs', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      createAnalyticsBus({
        shop: SHOP_DATA,
        consent: CONSENT_DATA,
        canTrack: () => true,
        autoInit: true,
      });
      expect(warnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Mock shop'),
      );
      warnSpy.mockRestore();
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

    it('deduplicates via localStorage across bus instances', () => {
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

  describe('lazy-init: shop provided after creation via updateShop', () => {
    it('does not initialize internal subscribers when shop is null at creation', () => {
      // autoInit: true (default), but shop is null — init should NOT run
      const bus = createAnalyticsBus({
        shop: null,
        consent: CONSENT_DATA,
        canTrack: () => true,
        // autoInit defaults to true
      });

      // The bus should still work for pub/sub (no internal subscribers blocking)
      const callback = vi.fn();
      bus.subscribe('page_viewed', callback);
      // No registers from internal subscribers, so the bus has no pending registers
      bus.publish('page_viewed', {url: '/test', shop: SHOP_DATA});
      // Event should be delivered since there are no pending registers
      expect(callback).toHaveBeenCalledOnce();

      bus.destroy();
    });

    it('initializes internal subscribers when updateShop provides a valid shop', () => {
      const bus = createAnalyticsBus({
        shop: null,
        consent: CONSENT_DATA,
        canTrack: () => true,
      });

      // Before updateShop: no internal registers exist
      const callbackBefore = vi.fn();
      bus.subscribe('page_viewed', callbackBefore);
      bus.publish('page_viewed', {url: '/before', shop: SHOP_DATA});
      expect(callbackBefore).toHaveBeenCalledOnce();

      // After updateShop: internal subscribers are initialized
      // (initShopifyAnalytics registers handlers, initConsent loads scripts, etc.)
      // In test environment (happy-dom), scripts won't actually load, but
      // the initialization path is exercised — internal registers are created
      bus._internal.updateShop(SHOP_DATA);

      // The bus now has internal registers (Internal_Shopify_Analytics, etc.)
      // that aren't ready yet, so new events will be queued
      const callbackAfter = vi.fn();
      bus.subscribe('page_viewed', callbackAfter);
      bus.publish('page_viewed', {url: '/after', shop: SHOP_DATA});
      // Events are queued because internal registers haven't called ready()
      expect(callbackAfter).not.toHaveBeenCalled();

      bus.destroy();
    });

    it('does not double-initialize on repeated updateShop calls', () => {
      const bus = createAnalyticsBus({
        shop: null,
        consent: CONSENT_DATA,
        canTrack: () => true,
      });

      // First updateShop triggers init
      bus._internal.updateShop(SHOP_DATA);

      // Subscribe and check that internal registers exist (events are queued)
      const callback = vi.fn();
      bus.subscribe('page_viewed', callback);
      bus.publish('page_viewed', {url: '/test', shop: SHOP_DATA});
      expect(callback).not.toHaveBeenCalled();

      // Second updateShop should NOT double-register
      bus._internal.updateShop({...SHOP_DATA, shopId: 'gid://shopify/Shop/2'});

      // Events are still queued (same registers, not duplicated)
      bus.publish('page_viewed', {url: '/test2', shop: SHOP_DATA});
      expect(callback).not.toHaveBeenCalled();

      bus.destroy();
    });

    it('does not initialize after destroy', () => {
      const bus = createAnalyticsBus({
        shop: null,
        consent: CONSENT_DATA,
        canTrack: () => true,
      });

      bus.destroy();
      // updateShop after destroy should not initialize anything
      bus._internal.updateShop(SHOP_DATA);

      const callback = vi.fn();
      bus.subscribe('page_viewed', callback);
      bus.publish('page_viewed', {url: '/test', shop: SHOP_DATA});
      expect(callback).not.toHaveBeenCalled();
    });
  });
});