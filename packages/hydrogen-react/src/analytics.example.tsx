import * as React from 'react';
import {useEffect} from 'react';
import {
  sendShopifyAnalytics,
  getClientBrowserParameters,
  AnalyticsEventName,
  useShopifyCookies,
} from '@shopify/hydrogen-react';
import {useRouter} from 'next/router';

function sendPageView(analyticsPageData) {
  const payload = {
    ...getClientBrowserParameters(),
    ...analyticsPageData,
  };
  sendShopifyAnalytics({
    eventName: AnalyticsEventName.PAGE_VIEW,
    payload,
  });
}

// Hook into your router's page change events to fire this analytics event:
// for example, in NextJS:

const analyticsShopData = {
  shopId: 'gid://shopify/Shop/{your-shop-id}',
  currency: 'USD',
  acceptedLanguage: 'en',
};

export default function App({Component, pageProps}) {
  const router = useRouter();

  // @ts-expect-error - this is an example, you should implement this function
  const hasUserConsent = yourFunctionToDetermineIfUserHasConsent();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const analytics = {
    hasUserConsent,
    ...analyticsShopData,
    ...pageProps.analytics,
  };
  const pagePropsWithAppAnalytics = {
    ...pageProps,
    analytics,
  };

  useEffect(() => {
    const handleRouteChange = () => {
      sendPageView(analytics);
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [analytics, router.events]);

  useShopifyCookies();

  return <Component {...pagePropsWithAppAnalytics} />;
}
