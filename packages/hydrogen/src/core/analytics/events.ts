/**
 * Canonical event names for the Hydrogen analytics bus.
 *
 * Pass the constants as the event name when you publish an event or subscribe a destination.
 * TypeScript checks string literal names and narrows the payload the same way. The constants add
 * autocomplete and a single place to rename an event.
 *
 * @publicDocs
 */
export const AnalyticsEvent = {
  /** Publish when a customer views a page. The bus fills in the current URL when the payload omits it. */
  PAGE_VIEWED: "page_viewed" as const,
  /** Publish when a customer views a product. The payload lists the viewed products. */
  PRODUCT_VIEWED: "product_viewed" as const,
  /** Publish when a customer views a collection. The payload identifies the collection by ID and handle. */
  COLLECTION_VIEWED: "collection_viewed" as const,
  /** Publish when a customer views the cart. The payload carries the current cart. */
  CART_VIEWED: "cart_viewed" as const,
  /** Publish when a customer views search results. The payload carries the search term. */
  SEARCH_VIEWED: "search_viewed" as const,

  /** Cart tracking publishes the event when the confirmed cart's update time changes. */
  CART_UPDATED: "cart_updated" as const,
  /** Cart tracking publishes the event when the cart gains a line or a line's quantity increases. */
  PRODUCT_ADD_TO_CART: "product_added_to_cart" as const,
  /** Cart tracking publishes the event when the cart loses a line or a line's quantity decreases. */
  PRODUCT_REMOVED_FROM_CART: "product_removed_from_cart" as const,
};

/** The analytics event constants, keyed by constant name. */
type AnalyticsEventMap = typeof AnalyticsEvent;

/**
 * Pass these values as the event name when you publish an event or subscribe a destination. TypeScript type-checks string literal event names and narrows the payload the same way.
 *
 * @publicDocs
 */
export interface AnalyticsEventForDocs extends AnalyticsEventMap {}

/**
 * The name of a supported analytics event, such as `"page_viewed"`.
 *
 * @publicDocs
 */
export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];
