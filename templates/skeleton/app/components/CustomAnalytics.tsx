import { useAnalyticsProvider } from "@shopify/hydrogen";
import { useEffect } from "react";

export function CustomAnalytics() {
  const {subscribe} = useAnalyticsProvider();

  useEffect(() => {
    subscribe('pageViewed', (payload) => {
      console.log('CustomAnalytics - Page viewed:', payload);
    });
    subscribe('product_viewed', (payload) => {
      console.log('CustomAnalytics - Product viewed:', payload);
    });
    subscribe('collection_viewed', (payload) => {
      console.log('CustomAnalytics - Collection viewed:', payload);
    });
    subscribe('cart_viewed', (payload) => {
      console.log('CustomAnalytics - Cart viewed:', payload);
    });
  }, []);

  return null;
}
