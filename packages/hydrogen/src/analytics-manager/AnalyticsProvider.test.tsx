import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
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
  checkoutDomain: 'https://checkout.hydrogen.shop',
  storeDomain: 'https://hydrogen.shop',
  storefrontAccessToken: '33ad0f277e864013b8e3c21d19432501',
  withPrivacyBanner: true,
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
  it('renders its children', async () => {
    render(
      <Analytics.Provider cart={null} shop={SHOP_DATA} consent={CONSENT_DATA}>
        <div>child</div>;
      </Analytics.Provider>,
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  describe('useAnalytics()', () => {
    it('returns shop, cart, customData', () =>
      new Promise((done) => {
        renderAnalyticsProvider({
          cart: CART_DATA,
          customData: {test: 'test'},
          callback: (analytics: AnalyticsContextValue | null) => {
            expect(analytics?.canTrack()).toBe(true);
            expect(analytics?.shop).toBe(SHOP_DATA);
            expect(analytics?.cart).toBe(CART_DATA);
            expect(analytics?.customData).toEqual({test: 'test'});
            done(0);
          },
        });
      }));

    it('returns prevCart with an updated cart', () =>
      new Promise((done) => {
        triggerCartUpdate({
          cart: CART_DATA_2,
          callback: (analytics: AnalyticsContextValue | null) => {
            expect(analytics?.canTrack()).toBe(true);
            expect(analytics?.shop).toBe(SHOP_DATA);
            expect(analytics?.cart).toBe(CART_DATA_2);
            expect(analytics?.prevCart).toBe(CART_DATA);
            done(0);
          },
        });
      }));

    it('can subscribe and receive a page_viewed event', () =>
      new Promise((done) => {
        renderAnalyticsProvider({
          cart: CART_DATA,
          registerCallback: (analytics, ready) => {
            analytics.subscribe('page_viewed', (payload) => {
              expect(payload).not.toBe(null);
              done(0);
            });
            ready();
          },
          callback: (analytics: AnalyticsContextValue | null) => {
            expect(analytics?.canTrack()).toBe(true);
            expect(analytics?.shop).toBe(SHOP_DATA);
            expect(analytics?.cart).toBe(CART_DATA);
          },
        });
      }));

    it('can subscribe and receive a product_viewed event', () =>
      new Promise((done) => {
        renderAnalyticsProvider({
          cart: CART_DATA,
          registerCallback: (analytics, ready) => {
            analytics.subscribe('product_viewed', (payload) => {
              expect(payload).not.toBe(null);
              done(0);
            });
            ready();
          },
          callback: (analytics: AnalyticsContextValue | null) => {
            expect(analytics?.canTrack()).toBe(true);
            expect(analytics?.shop).toBe(SHOP_DATA);
            expect(analytics?.cart).toBe(CART_DATA);
          },
          children: (
            <Analytics.ProductView
              data={{
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
              }}
            />
          ),
        });
      }));

    it('can subscribe and receive a product_added_to_cart event', () =>
      new Promise((done) => {
        triggerCartUpdate({
          cart: CART_DATA_2,
          registerCallback: (analytics, ready) => {
            analytics.subscribe('product_added_to_cart', (payload) => {
              expect(payload).not.toBe(null);
              done(0);
            });
            ready();
          },
          callback: (analytics: AnalyticsContextValue | null) => {
            expect(analytics?.canTrack()).toBe(true);
          },
        });
      }));

    it('can subscribe and receive a product_removed_from_cart event', () =>
      new Promise((done) => {
        triggerCartUpdate({
          cart: CART_DATA_3,
          registerCallback: (analytics, ready) => {
            analytics.subscribe('product_removed_from_cart', (payload) => {
              expect(payload).not.toBe(null);
              done(0);
            });
            ready();
          },
          callback: (analytics: AnalyticsContextValue | null) => {
            expect(analytics?.canTrack()).toBe(true);
          },
        });
      }));
  });
});

type RenderAnalyticsProviderProps = {
  cart: CartReturn | null;
  customData?: Record<string, unknown>;
  callback: (analytics: AnalyticsContextValue | null) => void;
  registerCallback?: (
    analytics: AnalyticsContextValue,
    ready: () => void,
  ) => void;
  children?: ReactNode;
};

function renderAnalyticsProvider({
  cart,
  customData,
  callback,
  registerCallback,
  children,
}: RenderAnalyticsProviderProps) {
  let analytics: AnalyticsContextValue | null = null;
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
  } = {}) => (
    <Analytics.Provider
      cart={updateCart || cart}
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

  const {rerender} = render(<AnalyticsProvider />);

  // First timeout - shop, customData available in context
  setTimeout(() => {
    rerender(<AnalyticsProvider />);

    // Second timeout - cart available in context
    setTimeout(() => {
      rerender(<AnalyticsProvider />);

      callback(analytics);
    });
  });

  return {rerender, AnalyticsProvider};
}

function triggerCartUpdate({
  cart,
  customData,
  callback,
  registerCallback,
}: RenderAnalyticsProviderProps) {
  const {rerender, AnalyticsProvider} = renderAnalyticsProvider({
    cart: CART_DATA,
    customData,
    callback,
    registerCallback,
  });

  // Triggers a cart update
  setTimeout(() => {
    rerender(<AnalyticsProvider updateCart={cart || CART_DATA} />);
  });
}

function customerPrivacyReady() {
  const event = new CustomEvent('visitorConsentCollected');
  document.dispatchEvent(event);
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

  useEffect(() => {
    if (registerCallback) {
      registerCallback(analytics, ready);
    } else {
      ready();
    }
  });

  customerPrivacyReady();

  return (
    <div>{typeof children === 'function' ? children(analytics) : children}</div>
  );
}
