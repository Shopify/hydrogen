import {
  type PageViewPayload,
  type ProductViewPayload,
  type CollectionViewPayload,
  type CartViewPayload,
  type CartUpdatePayload,
  useUnstable__Analytics,
} from '@shopify/hydrogen';
import {useEffect} from 'react';

export function CustomAnalytics() {
  const {subscribe, register} = useUnstable__Analytics();
  const {ready} = register('CustomAnalytics'); // unique string identifier

  useEffect(() => {
    // Standard events
    subscribe('page_viewed', (data: PageViewPayload) => {
      console.log('CustomAnalytics - Page viewed:', data);
    });
    subscribe('product_viewed', (data: ProductViewPayload) => {
      console.log('CustomAnalytics - Product viewed:', data);
    });
    subscribe('collection_viewed', (data: CollectionViewPayload) => {
      console.log('CustomAnalytics - Collection viewed:', data);
    });
    subscribe('cart_viewed', (data: CartViewPayload) => {
      console.log('CustomAnalytics - Cart viewed:', data);
    });
    subscribe('cart_updated', (data: CartUpdatePayload) => {
      console.log('CustomAnalytics - Cart updated:', data);
    });

    // Custom events
    subscribe('custom_sidecart_viewed', (data: unknown) => {
      console.log('CustomAnalytics - Custom sidecart opened:', data);
    });

    // Register the CustomAnalytics component as ready
    ready();
  }, []);

  return null;
}
