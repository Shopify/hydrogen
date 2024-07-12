import {describe, beforeAll, expect, it, vi} from 'vitest';
import {render, screen, act} from '@testing-library/react';
import {
  Analytics,
  AnalyticsContextValue,
  useAnalytics,
} from './AnalyticsProvider';
import {
  CurrencyCode,
  LanguageCode,
} from '@shopify/hydrogen-react/storefront-api-types';
import {ReactNode, useEffect} from 'react';
import {CartReturn} from '../cart/queries/cart-types';

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
          requiresShipping: true,
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
} as CartReturn;

const CART_DATA_2 = {
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
          requiresShipping: true,
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
} as CartReturn;

const CART_DATA_3 = {
  updatedAt: '2024-03-27T21:49:07Z',
  id: 'gid://shopify/Cart/c1-123',
  lines: {
    nodes: [{}],
  },
} as CartReturn;

// Mock the useLocation hook to return a different path each time to simulate page navigation
let pathCount = 1;
vi.mock('@remix-run/react', () => ({
  useLocation: () => ({
    pathname: `/example/path/${pathCount++}`,
    search: '',
  }),
}));

describe('<Analytics.Provider />', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'fetch',
      function mockFetch(input: URL | RequestInfo): Promise<Response> {
        const MONORAIL_ENDPOINT =
          'https://monorail-edge.shopifysvc.com/unstable/produce_batch';
        const CHECKOUT_ENDPOINT =
          'https://checkout.hydrogen.shop/api/unstable/graphql.json';

        if (input === MONORAIL_ENDPOINT || input === CHECKOUT_ENDPOINT) {
          return Promise.resolve(
            new Response('', {
              status: 200,
            }),
          );
        }

        throw new Error('Analytics fetch mock - request not handled');
      },
    );

    vi.stubGlobal('PerfKit', () => ({
      navigate: () => {},
      setPageType: () => {},
    }));

    const perfkit = document.createElement('script');
    perfkit.setAttribute('data-application', 'hydrogen');
    perfkit.setAttribute('data-shop-id', '1');
    perfkit.setAttribute('data-storefront-id', '0');
    perfkit.setAttribute('data-monorail-region', 'global');
    perfkit.setAttribute('data-spa-mode', 'true');

    // Defining `document.currentScript` to avoid errors in tests
    Object.defineProperty(document, 'currentScript', {
      value: perfkit, //document.createElement('script'),
    });
  });

  it('renders its children', async () => {
    render(
      <Analytics.Provider cart={null} shop={SHOP_DATA} consent={CONSENT_DATA}>
        <div>child</div>;
      </Analytics.Provider>,
    );

    // Wait until idle
    await act(async () => {});

    expect(screen.getByText('child')).toBeInTheDocument();
  });

  describe('useAnalytics()', () => {
    it('returns shop, cart, customData', async () => {
      const {analytics} = await renderAnalyticsProvider({
        initialCart: CART_DATA,
        customData: {test: 'test'},
      });

      expect(analytics?.canTrack()).toBe(true);
      expect(analytics?.shop).toBe(SHOP_DATA);
      expect(analytics?.cart).toBe(CART_DATA);
      expect(analytics?.customData).toEqual({test: 'test'});
    });

    it('returns prevCart with an updated cart', async () => {
      const {analytics} = await triggerCartUpdate({
        initialCart: CART_DATA,
        updateCart: CART_DATA_2,
      });

      expect(analytics?.canTrack()).toBe(true);
      expect(analytics?.shop).toBe(SHOP_DATA);
      expect(analytics?.cart).toBe(CART_DATA_2);
      expect(analytics?.prevCart).toBe(CART_DATA);
    });

    it('can subscribe and receive a page_viewed event', async () => {
      const pageViewedEvent = vi.fn();

      const {analytics} = await renderAnalyticsProvider({
        initialCart: CART_DATA,
        registerCallback: (analytics, ready) => {
          analytics.subscribe('page_viewed', pageViewedEvent);
          ready();
        },
      });

      expect(analytics?.canTrack()).toBe(true);
      expect(analytics?.shop).toBe(SHOP_DATA);
      expect(analytics?.cart).toBe(CART_DATA);

      expect(pageViewedEvent).toHaveBeenCalled();
      expect(pageViewedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          cart: expect.any(Object),
          shop: SHOP_DATA,
          url: expect.any(String),
        }),
      );
    });

    it('can subscribe and receive a product_viewed event', async () => {
      const productViewedEvent = vi.fn();
      const productsData = {
        products: [
          {
            id: 'gid://shopify/Product/6730943823928',
            title: 'The Full Stack Snowboard',
            price: '749.95',
            vendor: 'Snowdevil',
            variantId: 'gid://shopify/ProductVariant/41007290548280',
            variantTitle: '160cm / Syntax',
            quantity: 1,
          },
        ],
      };

      const {analytics} = await renderAnalyticsProvider({
        initialCart: CART_DATA,
        children: <Analytics.ProductView data={productsData} />,
        registerCallback: (analytics, ready) => {
          analytics.subscribe('product_viewed', productViewedEvent);
          ready();
        },
      });

      expect(analytics?.canTrack()).toBe(true);
      expect(analytics?.shop).toBe(SHOP_DATA);
      expect(analytics?.cart).toBe(CART_DATA);

      expect(productViewedEvent).toHaveBeenCalled();
      expect(productViewedEvent).toHaveBeenCalledWith(
        expect.objectContaining(productsData),
      );
    });

    it('can subscribe and receive a product_added_to_cart event', async () => {
      const productAddedToCartEvent = vi.fn();

      const {analytics} = await triggerCartUpdate({
        initialCart: CART_DATA,
        updateCart: CART_DATA_2,
        registerCallback: (analytics, ready) => {
          analytics.subscribe('product_added_to_cart', productAddedToCartEvent);
          ready();
        },
      });

      expect(analytics?.canTrack()).toBe(true);

      expect(productAddedToCartEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          cart: expect.any(Object),
          shop: SHOP_DATA,
        }),
      );
    });

    it('can subscribe and receive a product_removed_from_cart event', async () => {
      const productRemovedFromCartEvent = vi.fn();

      const {analytics} = await triggerCartUpdate({
        initialCart: CART_DATA,
        updateCart: CART_DATA_3,
        registerCallback: (analytics, ready) => {
          analytics.subscribe(
            'product_removed_from_cart',
            productRemovedFromCartEvent,
          );
          ready();
        },
      });

      expect(analytics?.canTrack()).toBe(true);

      expect(productRemovedFromCartEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          cart: expect.any(Object),
          shop: SHOP_DATA,
        }),
      );
    });
  });
});

type RenderAnalyticsProviderProps = {
  initialCart: CartReturn;
  customData?: Record<string, unknown>;
  registerCallback?: (
    analytics: AnalyticsContextValue,
    ready: () => void,
  ) => void;
  children?: ReactNode;
};

async function renderAnalyticsProvider({
  initialCart,
  customData,
  registerCallback,
  children,
}: RenderAnalyticsProviderProps) {
  let analytics: AnalyticsContextValue | null = null;
  const getUpdatedAnalytics = () => analytics;
  const loopAnalyticsFn = (analyticsInstance: AnalyticsContextValue) => {
    analytics = analyticsInstance;
    return null;
  };

  const AnalyticsProvider = ({
    updateCart,
    updateCustomData,
  }: {
    updateCart?: CartReturn;
    updateCustomData?: Record<string, unknown>;
  } = {}) => {
    return (
      <Analytics.Provider
        cart={updateCart || initialCart}
        shop={SHOP_DATA}
        consent={CONSENT_DATA}
        customData={updateCustomData || customData}
      >
        <LoopAnalytics registerCallback={registerCallback}>
          {loopAnalyticsFn}
        </LoopAnalytics>
        {children}
      </Analytics.Provider>
    );
  };

  const {rerender} = render(<AnalyticsProvider />);

  // The previous rendering updates the cart asynchronously in a
  // `Promise.resolve(cart).then(...)`. Therefore, we need to
  // await for the next tick to ensure React state is updated.
  await act(async () => {});

  return {
    rerender,
    AnalyticsProvider,
    getUpdatedAnalytics,
    analytics: getUpdatedAnalytics(),
  };
}

async function triggerCartUpdate({
  initialCart,
  updateCart,
  customData,
  registerCallback,
}: RenderAnalyticsProviderProps & {
  updateCart: RenderAnalyticsProviderProps['initialCart'];
}) {
  const {rerender, AnalyticsProvider, getUpdatedAnalytics} =
    await renderAnalyticsProvider({
      initialCart,
      customData,
      registerCallback,
    });

  // Triggers a cart update
  rerender(<AnalyticsProvider updateCart={updateCart} />);

  // The previous rendering updates the cart asynchronously in a
  // `Promise.resolve(cart).then(...)`. Therefore, we need to
  // await for the next tick to ensure React state is updated.
  await act(async () => {});

  // Only call this after the previous `act` has finished. Otherwise
  // we don't get updated values from the useAnalytics() context.
  return {analytics: getUpdatedAnalytics()};
}

function LoopAnalytics({
  children,
  registerCallback,
}: {
  children: ReactNode | ((analytics: AnalyticsContextValue) => ReactNode);
  registerCallback?: (
    analytics: AnalyticsContextValue,
    ready: () => void,
  ) => void;
}): JSX.Element {
  const analytics = useAnalytics();
  const {ready} = analytics.register('loopAnalytics');
  const {ready: customerPrivacyReady} = analytics.register(
    'Internal_Shopify_CustomerPrivacy',
  );
  const {ready: perfKitReady} = analytics.register('Internal_Shopify_Perf_Kit');

  useEffect(() => {
    if (registerCallback) {
      registerCallback(analytics, ready);
    } else {
      ready();
    }
  });

  customerPrivacyReady();
  perfKitReady();

  return (
    <div>{typeof children === 'function' ? children(analytics) : children}</div>
  );
}
