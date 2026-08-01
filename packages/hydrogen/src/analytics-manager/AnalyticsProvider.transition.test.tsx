import {describe, beforeAll, beforeEach, expect, it, vi} from 'vitest';
import {render, act} from '@testing-library/react';
import {startTransition} from 'react';
import {
  CurrencyCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';
import {Analytics} from './AnalyticsProvider';
import {CartReturn} from '../cart/queries/cart-types';

/**
 * Regression coverage for #3838.
 *
 * `Analytics.Provider` sits above every route-level Suspense boundary. When it
 * applies an urgent state update while a streamed boundary below it is still
 * dehydrated, React abandons hydration for that boundary, throws away its
 * server HTML and client-renders it ("This Suspense boundary received an update
 * before it finished hydrating", React error #418).
 *
 * Reproducing the hydration interruption itself needs a streaming SSR harness
 * with a delayed tail, which is out of reach here. What we can pin down is the
 * property that prevents it: the deferred shop/cart resolutions and the
 * analytics `onReady` callback must be applied as transitions, never as urgent
 * updates. Unwrap any of them and these assertions fail.
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

describe('<Analytics.Provider /> post-hydration updates', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('')));
  });

  beforeEach(() => {
    vi.mocked(startTransition).mockClear();
    revalidateMock.mockClear();
    pathCount = 1;
  });

  it('applies the deferred shop resolution as a transition', async () => {
    let resolveShop: (value: typeof SHOP_DATA) => void = () => {};
    const shopPromise = new Promise<typeof SHOP_DATA>((resolve) => {
      resolveShop = resolve;
    });

    render(
      <Analytics.Provider cart={null} shop={shopPromise} consent={CONSENT_DATA}>
        <div>child</div>
      </Analytics.Provider>,
    );

    await act(async () => {});
    vi.mocked(startTransition).mockClear();

    await act(async () => {
      resolveShop(SHOP_DATA);
    });

    expect(startTransition).toHaveBeenCalled();
  });

  it('applies the deferred cart resolution as a transition', async () => {
    let resolveCart: (value: CartReturn) => void = () => {};
    const cartPromise = new Promise<CartReturn>((resolve) => {
      resolveCart = resolve;
    });

    render(
      <Analytics.Provider
        cart={cartPromise}
        shop={SHOP_DATA}
        consent={CONSENT_DATA}
      >
        <div>child</div>
      </Analytics.Provider>,
    );

    await act(async () => {});
    vi.mocked(startTransition).mockClear();

    await act(async () => {
      resolveCart(CART_DATA);
    });

    // `CartAnalytics` resolves the deferred cart and calls `setCarts`, which
    // updates state owned by the provider above every Suspense boundary.
    expect(startTransition).toHaveBeenCalled();
  });
});
