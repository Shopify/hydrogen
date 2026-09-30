import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, render, screen} from '@testing-library/react';
import {Suspense, startTransition, useEffect} from 'react';
import {
  CurrencyCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  Analytics,
  useAnalytics,
  type AnalyticsContextValue,
} from './AnalyticsProvider';
import type {PageViewPayload} from './AnalyticsView';
import {CartReturn} from '../cart/queries/cart-types';

/**
 * Regression coverage for #3838.
 *
 * Analytics.Provider sits above every route-level Suspense boundary. When it
 * applies an urgent state update while a streamed boundary below it is still
 * dehydrated, React abandons hydration for that boundary and client-renders it
 * (React error #421). The provider therefore schedules its post-hydration
 * updates through `startTransition`.
 */
const transitions = vi.hoisted(() => ({
  hold: false,
  held: [] as Array<() => void>,
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    startTransition: (scope: () => void) => {
      if (transitions.hold) {
        transitions.held.push(scope);
        return;
      }
      actual.startTransition(scope);
    },
  };
});

vi.mock('react-router', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('react-router');
  return {
    ...actual,
    useLocation: () => ({
      pathname: '/example/path',
      search: '',
      state: '',
      key: '',
      hash: '',
    }),
  };
});

vi.mock('./PerfKit', () => ({
  PerfKit: () => null,
}));

// Stand in for the customer privacy API so tests fire the consent callback
// directly instead of loading the CTA script.
const consent = vi.hoisted(() => ({
  onChange: (): void => {
    throw new Error('ShopifyAnalytics has not mounted');
  },
}));

vi.mock('./ShopifyAnalytics', () => ({
  ShopifyAnalytics: ({onConsentChange}: {onConsentChange: () => void}) => {
    consent.onChange = onConsentChange;
    return null;
  },
}));

const SHOP_DATA = {
  shopId: 'gid://shopify/Shop/1',
  acceptedLanguage: 'EN' as LanguageCode,
  currency: 'USD' as CurrencyCode,
  hydrogenSubchannelId: '0',
};

const CONSENT_DATA = {
  checkoutDomain: 'checkout.hydrogen.shop',
  storefrontAccessToken: '33ad0f277e864013b8e3c21d19432501',
};

const CART_DATA = {
  updatedAt: '2024-03-26T21:49:07Z',
  id: 'gid://shopify/Cart/c1-123',
  lines: {nodes: []},
} as unknown as CartReturn;

function CommittedValue({
  onCommit,
}: {
  onCommit: (value: AnalyticsContextValue) => void;
}) {
  const analytics = useAnalytics();
  useEffect(() => {
    onCommit(analytics);
  });
  return null;
}

function PageViewSubscriber({
  onPageViewed,
}: {
  onPageViewed: (payload: PageViewPayload) => void;
}) {
  const {subscribe} = useAnalytics();
  useEffect(() => {
    subscribe('page_viewed', onPageViewed);
  }, [subscribe, onPageViewed]);
  return null;
}

/** Inside a transition React keeps the committed tree on screen, not the Suspense fallback. */
function SuspendWhileDenied() {
  const {canTrack} = useAnalytics();
  if (!canTrack()) throw new Promise<never>(() => {});
  return <span>tracked content</span>;
}

async function settle() {
  await act(async () => {});
}

async function runHeldTransitions() {
  transitions.hold = false;
  await act(async () => {
    transitions.held.splice(0).forEach((scope) => startTransition(scope));
  });
}

describe('<Analytics.Provider /> post-hydration updates', () => {
  beforeEach(() => {
    transitions.hold = false;
    transitions.held.length = 0;
    consent.onChange = () => {
      throw new Error('ShopifyAnalytics has not mounted');
    };
  });

  afterEach(cleanup);

  it('defers the resolved shop until React runs the transition', async () => {
    let resolveShop: (value: typeof SHOP_DATA) => void = () => {};
    const shopPromise = new Promise<typeof SHOP_DATA>((resolve) => {
      resolveShop = resolve;
    });
    let committed!: AnalyticsContextValue;

    render(
      <Analytics.Provider cart={null} shop={shopPromise} consent={CONSENT_DATA}>
        <CommittedValue onCommit={(value) => (committed = value)} />
      </Analytics.Provider>,
    );
    await settle();
    expect(committed.shop).toBeNull();

    transitions.hold = true;
    await act(async () => {
      resolveShop(SHOP_DATA);
    });
    expect(committed.shop).toBeNull();

    await runHeldTransitions();
    expect(committed.shop).toEqual(SHOP_DATA);
  });

  it('defers the resolved cart until React runs the transition', async () => {
    let resolveCart: (value: CartReturn) => void = () => {};
    const cartPromise = new Promise<CartReturn>((resolve) => {
      resolveCart = resolve;
    });
    let committed!: AnalyticsContextValue;

    render(
      <Analytics.Provider
        cart={cartPromise}
        shop={SHOP_DATA}
        consent={CONSENT_DATA}
      >
        <CommittedValue onCommit={(value) => (committed = value)} />
      </Analytics.Provider>,
    );
    await settle();
    expect(committed.shop).toEqual(SHOP_DATA);
    expect(committed.cart).toBeNull();

    transitions.hold = true;
    await act(async () => {
      resolveCart(CART_DATA);
    });
    expect(committed.cart).toBeNull();

    await runHeldTransitions();
    expect(committed.cart).toEqual(CART_DATA);
  });

  it('defers the consent change until React runs the transition', async () => {
    let allowed = false;
    const received: unknown[] = [];
    let committed!: AnalyticsContextValue;

    render(
      <Analytics.Provider
        cart={null}
        shop={SHOP_DATA}
        consent={CONSENT_DATA}
        canTrack={() => allowed}
      >
        <CommittedValue onCommit={(value) => (committed = value)} />
      </Analytics.Provider>,
    );
    await settle();
    committed.subscribe('custom_probe', (payload) => received.push(payload));

    allowed = true;
    transitions.hold = true;
    await act(async () => {
      consent.onChange();
    });
    committed.publish('custom_probe', {});
    expect(received).toHaveLength(0);

    await runHeldTransitions();
    committed.publish('custom_probe', {});
    expect(received).toHaveLength(1);
  });

  it('stops publishing when consent is revoked while React holds the suspended transition', async () => {
    let allowed = true;
    const received: unknown[] = [];
    let committed!: AnalyticsContextValue;

    render(
      <Analytics.Provider
        cart={null}
        shop={SHOP_DATA}
        consent={CONSENT_DATA}
        canTrack={() => allowed}
      >
        <CommittedValue onCommit={(value) => (committed = value)} />
        <Suspense fallback={<span>fallback</span>}>
          <SuspendWhileDenied />
        </Suspense>
      </Analytics.Provider>,
    );
    await settle();
    committed.subscribe('custom_probe', (payload) => received.push(payload));
    committed.publish('custom_probe', {});
    expect(received).toHaveLength(1);

    allowed = false;
    await act(async () => {
      consent.onChange();
    });
    expect(screen.getByText('tracked content')).toBeInTheDocument();
    expect(screen.queryByText('fallback')).not.toBeInTheDocument();

    committed.publish('custom_probe', {});
    expect(received).toHaveLength(1);
  });

  it('publishes the first page_viewed once consent is granted late', async () => {
    let allowed = false;
    const pageViews: PageViewPayload[] = [];

    render(
      <Analytics.Provider
        cart={null}
        shop={SHOP_DATA}
        consent={CONSENT_DATA}
        canTrack={() => allowed}
      >
        <PageViewSubscriber
          onPageViewed={(payload) => pageViews.push(payload)}
        />
      </Analytics.Provider>,
    );
    await settle();
    expect(pageViews).toHaveLength(0);

    allowed = true;
    await act(async () => {
      consent.onChange();
    });
    expect(pageViews).toHaveLength(1);
  });

  it('publishes page_viewed once when the provider re-renders with consent unchanged', async () => {
    const pageViews: PageViewPayload[] = [];
    let committed!: AnalyticsContextValue;
    const tree = (cart: CartReturn | null) => (
      <Analytics.Provider
        cart={cart}
        shop={SHOP_DATA}
        consent={CONSENT_DATA}
        canTrack={() => true}
      >
        <PageViewSubscriber
          onPageViewed={(payload) => pageViews.push(payload)}
        />
        <CommittedValue onCommit={(value) => (committed = value)} />
      </Analytics.Provider>
    );

    const {rerender} = render(tree(null));
    await settle();
    expect(pageViews).toHaveLength(1);

    rerender(tree(CART_DATA));
    await settle();
    expect(committed.cart).toEqual(CART_DATA);
    expect(pageViews).toHaveLength(1);
  });
});
