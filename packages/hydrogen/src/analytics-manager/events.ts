export const AnalyticsEvent = {
  // Views
  PAGE_VIEWED: 'page_viewed' as const,
  PRODUCT_VIEWED: 'product_viewed' as const,
  COLLECTION_VIEWED: 'collection_viewed' as const,
  CART_VIEWED: 'cart_viewed' as const,
  SEARCH_VIEWED: 'search_viewed' as const,

  // Cart
  CART_UPDATED: 'cart_updated' as const,
  PRODUCT_ADD_TO_CART: 'product_added_to_cart' as const,
  PRODUCT_REMOVED_FROM_CART: 'product_removed_from_cart' as const,

  // Custom
  CUSTOM_EVENT: `custom_` as `custom_${string}`
}
