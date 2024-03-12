export const AnalyticsEvent = {
  // Views
  PAGE_VIEWED: 'page_viewed' as const,
  PRODUCT_VIEWED: 'product_viewed' as const,
  COLLECTION_VIEWED: 'collection_viewed' as const,
  CART_VIEWED: 'cart_viewed' as const,

  // Cart
  CART_UPDATED: 'cart_updated' as const,

  // Custom
  CUSTOM_EVENT: `custom_` as `custom_${string}`
}
