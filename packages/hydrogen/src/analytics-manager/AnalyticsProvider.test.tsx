import {describe, expect, it, vi, afterAll, beforeEach, afterEach} from 'vitest';
import {render, screen, renderHook} from '@testing-library/react';
import {Analytics, AnalyticsContextValue, useAnalytics} from './AnalyticsProvider';
import { CurrencyCode, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';
import { ReactNode, useEffect, useRef } from 'react';
import { CartReturn } from '../cart/queries/cart-types';
import { FetcherWithComponents } from '@remix-run/react';

const SHOP_DATA = {
  shopId: 'gid://shopify/Shop/1',
  acceptedLanguage: 'EN' as LanguageCode,
  currency: 'USD' as CurrencyCode,
  hydrogenSubchannelId: '0',
}

const CONSENT_DATA = {
  checkoutRootDomain: 'https://checkout.hydrogen.shop',
  shopDomain: 'https://hydrogen.shop',
  storefrontAccessToken: '33ad0f277e864013b8e3c21d19432501',
  withPrivacyBanner: true,
}

const CART_DATA = {
  updatedAt: '2024-03-26T21:49:07Z',
  id: 'gid://shopify/Cart/c1-123',
  lines: {
    nodes: [{
      "id": "gid://shopify/CartLine/373702e3-5b12-4ca8-83f1-e5c28150cc09?cart=c1-baf6e1a9669c049a865a469b564a1e44",
      "quantity": 1,
      "merchandise": {
        "id": "gid://shopify/ProductVariant/41007290548280",
        "price": {
          "currencyCode": "USD",
          "amount": "749.95"
        },
        "requiresShipping": true,
        "title": "160cm / Syntax",
        "product": {
          "handle": "the-full-stack",
          "title": "The Full Stack Snowboard",
          "id": "gid://shopify/Product/6730943823928",
          "vendor": "Snowdevil"
        },
      }
    }],
  },
} as CartReturn;

vi.mock("@remix-run/react", () => ({
  useLocation: () => ({
    pathname: "localhost:3000/example/path"
  })
}));

describe('<Analytics.Provider />', () => {
  it('renders its children', async () => {
    render(
      <Analytics.Provider
        cart={null}
        shop={SHOP_DATA}
        consent={CONSENT_DATA}
      >
        <div>child</div>;
      </Analytics.Provider>,
    );
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  describe('useAnalytics()', () => {
    it('returns shop, cart, customData', () => new Promise(done => {
      renderAnalyticsProvider({
        cart: CART_DATA,
        shop: SHOP_DATA,
        consent: CONSENT_DATA,
        customData: {test: 'test'},
        callback: (analytics: AnalyticsContextValue | null) => {
          console.log('analytics', analytics);
          expect(analytics?.canTrack()).toBe(true);
          expect(analytics?.shop).toBe(SHOP_DATA);
          expect(analytics?.cart).toBe(CART_DATA);
          expect(analytics?.customData).toEqual({test: 'test'});
          done(0);
        }
      });
    }));
  });
});

function renderAnalyticsProvider({
  cart,
  shop,
  consent,
  customData,
  callback,
}: {
  cart: CartReturn | null;
  shop: typeof SHOP_DATA;
  consent: typeof CONSENT_DATA;
  customData?: Record<string, unknown>;
  callback: (analytics: AnalyticsContextValue | null) => void;
}) {
  let analytics: AnalyticsContextValue | null = null;
  const {rerender} = render(
    <Analytics.Provider
      cart={cart}
      shop={shop}
      consent={consent}
      customData={customData}
    >
      <LoopAnalytics>
        {(analyticsInstance) => {
          analytics = analyticsInstance;

          return null;
        }}
      </LoopAnalytics>
    </Analytics.Provider>
  );

  // First timeout - shop, customData available in context
  setTimeout(() => {
    rerender(
      <Analytics.Provider
        cart={cart}
        shop={shop}
        consent={consent}
        customData={customData}
      >
        <LoopAnalytics>
          {(analyticsInstance) => {
            analytics = analyticsInstance;

            return null;
          }}
        </LoopAnalytics>
      </Analytics.Provider>
    );

    // Second timeout - cart available in context
    setTimeout(() => {
      rerender(
        <Analytics.Provider
          cart={cart}
          shop={shop}
          consent={consent}
          customData={customData}
        >
          <LoopAnalytics>
            {(analyticsInstance) => {
              analytics = analyticsInstance;

              return null;
            }}
          </LoopAnalytics>
        </Analytics.Provider>
      );

      callback(analytics);
    });
    return analytics;
  });
}

function LoopAnalytics({children}: {
  children: ReactNode | ((analytics: AnalyticsContextValue) => ReactNode);
}): JSX.Element {
  const analytics = useAnalytics();

  return (<div>
    {typeof children === 'function' ? children(analytics) : children}
  </div>);
}
