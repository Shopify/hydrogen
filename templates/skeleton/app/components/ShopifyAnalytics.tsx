import { AnalyticsEventName, ShopifyPageViewPayload, getClientBrowserParameters, sendShopifyAnalytics, useAnalyticsProvider, useShopifyCookies } from "@shopify/hydrogen";
import { CurrencyCode, LanguageCode } from "@shopify/hydrogen/storefront-api-types";
import { useEffect } from "react";

type ShopAnalytic = {
  shopId: string;
  acceptedLanguage: LanguageCode;
  currency: CurrencyCode;
  hydrogenSubchannelId: string;
};

export function ShopifyAnalytics({data}: {data: ShopAnalytic}) {
  const {subscribe, canTrack} = useAnalyticsProvider();
  const hasUserConsent = canTrack();
  useShopifyCookies({hasUserConsent});

  useEffect(() => {
    subscribe('page_viewed', (payload) => {
      console.log('ShopifyAnalytics - Page viewed:', payload);

      const eventPayload: ShopifyPageViewPayload = {
        ...data,
        hasUserConsent,
        ...getClientBrowserParameters(),
      };

      sendShopifyAnalytics({
        eventName: AnalyticsEventName.PAGE_VIEW,
        payload: eventPayload,
      });
    });
    subscribe('product_viewed', (payload) => {
      console.log('ShopifyAnalytics - Product viewed:', payload);
    });
    subscribe('collection_viewed', (payload) => {
      console.log('ShopifyAnalytics - Collection viewed:', payload);
    });
    subscribe('cart_viewed', (payload) => {
      console.log('ShopifyAnalytics - Cart viewed:', payload);
    });
    subscribe('product_added_to_cart', (payload) => {
      console.log('ShopifyAnalytics - Product added to cart:', payload);
    });
    subscribe('product_removed_from_cart', (payload) => {
      console.log('ShopifyAnalytics - Product removed from cart:', payload);
    });
  }, []);

  return null;
}
