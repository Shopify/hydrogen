import {describe, beforeAll, beforeEach, expect, it, vi} from 'vitest';
import {render, act} from '@testing-library/react';
import {startTransition} from 'react';
import {
  CurrencyCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  Analytics,
  useAnalytics,
  type AnalyticsContextValue,
} from './AnalyticsProvider';
import {CartReturn} from '../cart/queries/cart-types';

/**
 * Regression coverage for #3838.
 *
 * Analytics.Provider sits above every route-level Suspense boundary. When it
 * applies an urgent state update while a streamed boundary below it is still
 * dehydrated, React abandons hydration for that boundary and client-renders it
 * (React error #418).
 *
 * Only the cart case asserts on startTransition call count. React fires its own
 * startTransition during mount when the deferred shop lands, so a spy cannot
 * separate our wrapper from React's in that window. The cart resolution has no
 * such interference and goes from 0 calls (unfixed) to 1 (fixed).
 */

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    startTransition: vi.fn(actual.startTransition),
  };
});

let pathCount = 1;
const revalidateMock = vi.fn<() => Promise<void>>(() => Promise.resolve());

vi.mock('react-router', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('react-router');

  return {
    ...actual,
    useLocation: () => ({
      pathname: `/example/path/${pathCount++}`,
      search: '',
      state: '',
      key: '',
      hash: '',
    }),
    useRevalidator: () => ({
      revalidate: revalidateMock,
      state: 'idle',
    }),
  };
});

vi.mock('./PerfKit', () => ({
  PerfKit: () => null,
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

function Probe({onValue}: {onValue: (value: AnalyticsContextValue) => void}) {
  const analytics = useAnalytics();
  onValue(analytics);
  return null;
}

describe('<Analytics.Provider /> post-hydration updates', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('')));
  });

  beforeEach(() => {
    vi.mocked(startTransition).mockClear();
    revalidateMock.mockClear();
    pathCount = 1;
  });

  it('resolves the deferred shop into context', async () => {
    let resolveShop: (value: typeof SHOP_DATA) => void = () => {};
    const shopPromise = new Promise<typeof SHOP_DATA>((resolve) => {
      resolveShop = resolve;
    });
    let latest: AnalyticsContextValue | undefined;

    render(
      <Analytics.Provider cart={null} shop={shopPromise} consent={CONSENT_DATA}>
        <Probe onValue={(value) => (latest = value)} />
      </Analytics.Provider>,
    );

    await act(async () => {});
    expect(latest?.shop).toBeNull();

    await act(async () => {
      resolveShop(SHOP_DATA);
    });

    expect(latest?.shop).toEqual(SHOP_DATA);
  });

  it('applies the deferred cart resolution as a transition', async () => {
    let resolveCart: (value: CartReturn) => void = () => {};
    const cartPromise = new Promise<CartReturn>((resolve) => {
      resolveCart = resolve;
    });
    let latest: AnalyticsContextValue | undefined;

    render(
      <Analytics.Provider
        cart={cartPromise}
        shop={SHOP_DATA}
        consent={CONSENT_DATA}
      >
        <Probe onValue={(value) => (latest = value)} />
      </Analytics.Provider>,
    );

    await act(async () => {});
    expect(latest?.cart).toBeNull();
    vi.mocked(startTransition).mockClear();

    await act(async () => {
      resolveCart(CART_DATA);
    });

    expect(startTransition).toHaveBeenCalledTimes(1);
    expect(latest?.cart).toEqual(CART_DATA);
  });
});
