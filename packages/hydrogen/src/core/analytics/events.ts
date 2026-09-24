/**
 * Canonical event names for the Hydrogen analytics bus.
 *
 * Use these as the `event` argument to `publish()` and `subscribe()`. Raw string
 * literals are type-checked and narrow the payload the same way; the constants add
 * autocomplete and a single place to rename.
 */
export const AnalyticsEvent = {
  PAGE_VIEWED: "page_viewed" as const,
  PRODUCT_VIEWED: "product_viewed" as const,
  COLLECTION_VIEWED: "collection_viewed" as const,
  CART_VIEWED: "cart_viewed" as const,
  SEARCH_VIEWED: "search_viewed" as const,

  CART_UPDATED: "cart_updated" as const,
  PRODUCT_ADD_TO_CART: "product_added_to_cart" as const,
  PRODUCT_REMOVED_FROM_CART: "product_removed_from_cart" as const,
};

/** Union of all supported analytics event name literals. */
export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];
