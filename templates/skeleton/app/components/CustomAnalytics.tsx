import { useAnalyticsProvider } from "@shopify/hydrogen";
import { useEffect } from "react";

export function CustomAnalytics() {
  const {subscribe} = useAnalyticsProvider();

  useEffect(() => {
    subscribe('page_viewed', (payload) => {
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
    subscribe('product_added_to_cart', (payload) => {
      console.log('CustomAnalytics - Product added to cart:', payload);
    });
    subscribe('product_removed_from_cart', (payload) => {
      console.log('CustomAnalytics - Product removed from cart:', payload);
    });
  }, []);

  return null;
}
