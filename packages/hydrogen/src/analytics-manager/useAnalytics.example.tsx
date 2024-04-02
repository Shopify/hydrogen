import {
  type PageViewPayload,
  type ProductViewPayload,
  type CollectionViewPayload,
  type CartViewPayload,
  type CartUpdatePayload,
  useUnstable__Analytics,
  SearchViewPayload,
} from '@shopify/hydrogen';
import {useEffect} from 'react';
import {CartLineUpdatePayload} from './AnalyticsView';

export function CustomAnalytics() {
  const {subscribe, register} = useUnstable__Analytics();
  const {ready} = register('CustomAnalytics'); // unique string identifier

  useEffect(() => {
    // Triggers on every page navigation
    subscribe('page_viewed', (data: PageViewPayload) => {
      console.log('CustomAnalytics - Page viewed:', data);
    });

    // Triggers on a page that uses `<Analytics.ProductView>`
    subscribe('product_viewed', (data: ProductViewPayload) => {
      console.log('CustomAnalytics - Product viewed:', data);
    });

    // Triggers on a page that uses `<Analytics.CollectionView>`
    subscribe('collection_viewed', (data: CollectionViewPayload) => {
      console.log('CustomAnalytics - Collection viewed:', data);
    });

    // Triggers on a page that uses `<Analytics.CartView>`
    subscribe('cart_viewed', (data: CartViewPayload) => {
      console.log('CustomAnalytics - Cart viewed:', data);
    });

    // Triggers on a page that uses `<Analytics.SearchView>`
    subscribe('search_viewed', (data: SearchViewPayload) => {
      console.log('CustomAnalytics - Search viewed:', data);
    });

    // Triggers on a page that uses `<Analytics.CustomView type="custom_promotion_viewed">`
    subscribe('custom_promotion_viewed', (data: unknown) => {
      console.log('CustomAnalytics - Promotion viewed:', data);
    });

    // Triggers when the cart is updated
    subscribe('cart_updated', (data: CartUpdatePayload) => {
      console.log('CustomAnalytics - Cart updated:', data);
    });

    // Triggers when an existing cart line increases in quantity or a new cart line is added
    subscribe('product_added_to_cart', (data: CartLineUpdatePayload) => {
      console.log('CustomAnalytics - Product added to cart:', data);
    });

    // Triggers when an existing cart line decreases in quantity or a cart line is removed
    subscribe('product_removed_from_cart', (data: CartLineUpdatePayload) => {
      console.log('CustomAnalytics - Product removed from cart:', data);
    });

    // Register the CustomAnalytics component as ready
    ready();
  }, []);

  return null;
}
