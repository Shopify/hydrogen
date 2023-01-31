import {useLocation} from '@remix-run/react';
import {
  useDataFromMatches,
  useDataFromFetchers,
  AnalyticsEventName,
  getClientBrowserParameters,
  sendShopifyAnalytics,
  ShopifyAddToCartPayload,
  ShopifyPageViewPayload,
  useShopifyCookies,
} from '@shopify/hydrogen';
import {useEffect} from 'react';
import {CartAction, I18nLocale} from '../lib/type';

export function useAnalytics(hasUserConsent: boolean, locale: I18nLocale) {
  useShopifyCookies({hasUserConsent});
  const location = useLocation();
  const pageAnalytics = useDataFromMatches(
    'analytics',
  ) as unknown as ShopifyPageViewPayload;

  // Page view analytics
  useEffect(() => {
    const payload: ShopifyPageViewPayload = {
      ...getClientBrowserParameters(),
      ...pageAnalytics,
      currency: locale.currency,
      acceptedLanguage: locale.language,
      hasUserConsent,
    };

    sendShopifyAnalytics({
      eventName: AnalyticsEventName.PAGE_VIEW,
      payload,
    });
  }, [location]);

  // Add to cart analytics
  const cartData = useDataFromFetchers({
    formDataKey: 'cartAction',
    formDataValue: CartAction.ADD_TO_CART,
    dataKey: 'analytics',
  }) as unknown as ShopifyAddToCartPayload;
  if (cartData) {
    const addToCartPayload: ShopifyAddToCartPayload = {
      ...getClientBrowserParameters(),
      ...pageAnalytics,
      ...cartData,
      currency: locale.currency,
      acceptedLanguage: locale.language,
      hasUserConsent,
    };

    sendShopifyAnalytics({
      eventName: AnalyticsEventName.ADD_TO_CART,
      payload: addToCartPayload,
    });
  }
}
