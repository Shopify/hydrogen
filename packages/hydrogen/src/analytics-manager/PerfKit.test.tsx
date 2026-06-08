import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render} from '@testing-library/react';
import type {ShopAnalytics} from './AnalyticsProvider';
import {AnalyticsEvent} from './events';

// Control the simulated script load state per test without downloading the
// real PerfKit script. `parseGid` stays the real implementation.
let mockScriptStatus: 'loading' | 'done' | 'error' = 'loading';
const useLoadScriptMock = vi.fn(
  (_url: string, _options?: unknown) => mockScriptStatus,
);

vi.mock('@shopify/hydrogen-react', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@shopify/hydrogen-react')>();
  return {
    ...actual,
    useLoadScript: (url: string, options?: unknown) =>
      useLoadScriptMock(url, options),
  };
});

// Mock the analytics context so we can directly inspect registration,
// readiness, and subscriptions.
const subscribeMock = vi.fn();
const readyMock = vi.fn();
const registerMock = vi.fn(() => ({ready: readyMock}));

vi.mock('./AnalyticsProvider', () => ({
  useAnalytics: () => ({
    subscribe: subscribeMock,
    register: registerMock,
  }),
}));

// Imported after the mocks above are declared.
import {PerfKit, PERF_KIT_URL} from './PerfKit';

const SHOP: ShopAnalytics = {
  shopId: 'gid://shopify/Shop/12345',
  acceptedLanguage: 'EN' as ShopAnalytics['acceptedLanguage'],
  currency: 'USD' as ShopAnalytics['currency'],
  hydrogenSubchannelId: 'storefront-67890',
};

function getSubscribedCallback(event: string): (() => void) | undefined {
  const call = (subscribeMock.mock.calls as Array<[string, () => void]>).find(
    ([subscribedEvent]) => subscribedEvent === event,
  );
  return call?.[1];
}

function getLoadScriptAttributes(): Record<string, string> {
  const lastCall =
    useLoadScriptMock.mock.calls[useLoadScriptMock.mock.calls.length - 1];
  return (lastCall?.[1] as {attributes: Record<string, string>}).attributes;
}

describe('<PerfKit />', () => {
  beforeEach(() => {
    mockScriptStatus = 'loading';
    subscribeMock.mockClear();
    readyMock.mockClear();
    registerMock.mockClear();
    useLoadScriptMock.mockClear();
    // @ts-expect-error - reset injected global between tests
    delete window.PerfKit;
  });

  afterEach(() => {
    cleanup();
  });

  describe('script contract', () => {
    it('requests the pinned PerfKit SPA script URL', () => {
      mockScriptStatus = 'done';
      render(<PerfKit shop={SHOP} />);

      expect(useLoadScriptMock).toHaveBeenCalled();
      expect(useLoadScriptMock.mock.calls[0][0]).toBe(PERF_KIT_URL);
      // Pinned exactly — bumping PerfKit's URL/version must be a deliberate,
      // reviewed change that updates this assertion.
      expect(PERF_KIT_URL).toBe(
        'https://cdn.shopify.com/shopifycloud/perf-kit/shopify-perf-kit-spa.min.js',
      );
    });

    it('passes the required data-* attributes exactly', () => {
      render(<PerfKit shop={SHOP} />);

      expect(getLoadScriptAttributes()).toEqual({
        id: 'perfkit',
        'data-application': 'hydrogen',
        'data-shop-id': '12345',
        'data-storefront-id': 'storefront-67890',
        'data-monorail-region': 'global',
        'data-spa-mode': 'true',
        'data-resource-timing-sampling-rate': '100',
      });
    });

    it('parses the shop id from the gid', () => {
      render(<PerfKit shop={SHOP} />);
      expect(getLoadScriptAttributes()['data-shop-id']).toBe('12345');
    });

    it('uses shop.hydrogenSubchannelId for the storefront id', () => {
      render(<PerfKit shop={SHOP} />);
      expect(getLoadScriptAttributes()['data-storefront-id']).toBe(
        'storefront-67890',
      );
    });
  });

  describe('subscription wiring', () => {
    it('registers Internal_Shopify_Perf_Kit', () => {
      render(<PerfKit shop={SHOP} />);
      expect(registerMock).toHaveBeenCalledWith('Internal_Shopify_Perf_Kit');
    });

    it('does not wire subscriptions while the script status is loading', () => {
      mockScriptStatus = 'loading';
      render(<PerfKit shop={SHOP} />);

      expect(subscribeMock).not.toHaveBeenCalled();
      expect(readyMock).not.toHaveBeenCalled();
    });

    it('does not wire subscriptions when the script status is error', () => {
      mockScriptStatus = 'error';
      render(<PerfKit shop={SHOP} />);

      expect(subscribeMock).not.toHaveBeenCalled();
      expect(readyMock).not.toHaveBeenCalled();
    });

    it('wires all five view subscriptions only after the script is done', () => {
      mockScriptStatus = 'done';
      render(<PerfKit shop={SHOP} />);

      const subscribedEvents = (
        subscribeMock.mock.calls as Array<[string, () => void]>
      ).map(([event]) => event);

      expect(subscribedEvents).toEqual(
        expect.arrayContaining([
          AnalyticsEvent.PAGE_VIEWED,
          AnalyticsEvent.PRODUCT_VIEWED,
          AnalyticsEvent.COLLECTION_VIEWED,
          AnalyticsEvent.SEARCH_VIEWED,
          AnalyticsEvent.CART_VIEWED,
        ]),
      );
      expect(subscribedEvents).toHaveLength(5);
    });

    it('calls ready() once, after subscriptions are wired', () => {
      mockScriptStatus = 'done';
      render(<PerfKit shop={SHOP} />);

      expect(readyMock).toHaveBeenCalledTimes(1);
    });

    it('wires once across a loading->done transition and does not re-wire', () => {
      // Start at loading: nothing wired yet.
      mockScriptStatus = 'loading';
      const {rerender} = render(<PerfKit shop={SHOP} />);
      expect(subscribeMock).not.toHaveBeenCalled();

      // Transition to done: the effect re-runs (scriptStatus dep changed) and
      // wires exactly once, setting the loadedEvent guard.
      mockScriptStatus = 'done';
      rerender(<PerfKit shop={SHOP} />);
      expect(subscribeMock).toHaveBeenCalledTimes(5);
      expect(readyMock).toHaveBeenCalledTimes(1);

      // A subsequent re-render must not re-wire — the loadedEvent.current guard
      // is what prevents it once deps stop changing.
      rerender(<PerfKit shop={SHOP} />);
      expect(subscribeMock).toHaveBeenCalledTimes(5);
      expect(readyMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('event -> PerfKit calls', () => {
    it('calls window.PerfKit.navigate() on page_viewed', () => {
      mockScriptStatus = 'done';
      const navigate = vi.fn();
      const setPageType = vi.fn();
      window.PerfKit = {navigate, setPageType};

      render(<PerfKit shop={SHOP} />);
      getSubscribedCallback(AnalyticsEvent.PAGE_VIEWED)?.();

      expect(navigate).toHaveBeenCalledTimes(1);
    });

    it.each([
      [AnalyticsEvent.PRODUCT_VIEWED, 'product'],
      [AnalyticsEvent.COLLECTION_VIEWED, 'collection'],
      [AnalyticsEvent.SEARCH_VIEWED, 'search'],
      [AnalyticsEvent.CART_VIEWED, 'cart'],
    ])('calls setPageType for %s', (event, pageType) => {
      mockScriptStatus = 'done';
      const navigate = vi.fn();
      const setPageType = vi.fn();
      window.PerfKit = {navigate, setPageType};

      render(<PerfKit shop={SHOP} />);
      getSubscribedCallback(event)?.();

      expect(setPageType).toHaveBeenCalledWith(pageType);
    });

    it('does not throw when window.PerfKit is absent (script-load race)', () => {
      mockScriptStatus = 'done';
      // Intentionally do not assign window.PerfKit.
      render(<PerfKit shop={SHOP} />);

      expect(() =>
        getSubscribedCallback(AnalyticsEvent.PAGE_VIEWED)?.(),
      ).not.toThrow();
    });
  });
});
