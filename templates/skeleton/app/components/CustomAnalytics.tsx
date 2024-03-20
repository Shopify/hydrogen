import {useAnalytics} from '@shopify/hydrogen';
import {useEffect} from 'react';

export function CustomAnalytics() {
  const {subscribe} = useAnalytics();

  useEffect(() => {
    subscribe('page_viewed', (data) => {
      console.log('CustomAnalytics - Page viewed:', data);
    });
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
  }, []);

  return null;
}
