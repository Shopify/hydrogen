import { useAnalyticsProvider } from "@shopify/hydrogen";
import { useEffect } from "react";

export function CustomAnalytics() {
  const {subscribe} = useAnalyticsProvider();

  useEffect(() => {
    subscribe('pageViewed', (payload) => {
      console.log('CustomAnalytics - Page viewed:', payload);
    });
    subscribe('productViewed', (payload) => {
      console.log('CustomAnalytics - Product viewed:', payload);
    });
    subscribe('collectionViewed', (payload) => {
      console.log('CustomAnalytics - Collection viewed:', payload);
    });
  }, []);

  return null;
}
