// [START import]
import {unstable_useAnalytics as useAnalytics} from '@shopify/hydrogen';
// [END import]
import {useEffect} from 'react';

// [START export]
export function CustomAnalytics() {
  // [START use]
  const {subscribe} = useAnalytics();
  // [END use]

  useEffect(() => {
    // [START subscribe]
    // Standard events
    subscribe('page_viewed', (data) => {
      console.log('CustomAnalytics - Page viewed:', data);
    });
    // [END subscribe]
    subscribe('product_viewed', (data) => {
      console.log('CustomAnalytics - Product viewed:', data);
    });
    subscribe('collection_viewed', (data) => {
      console.log('CustomAnalytics - Collection viewed:', data);
    });
    subscribe('cart_viewed', (data) => {
      console.log('CustomAnalytics - Cart viewed:', data);
    });
    subscribe('cart_updated', (data) => {
      console.log('CustomAnalytics - Cart updated:', data);
    });

    // Custom events
    subscribe('custom_sidecart_viewed', (data) => {
      console.log('CustomAnalytics - Custom sidecart opened:', data);
    });
  }, []);

  return null;
}
// [END export]
