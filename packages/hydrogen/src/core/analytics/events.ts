/**
 * The names of the analytics events that Hydrogen supports.
 *
 * Pass a constant as the event name when you publish an event or subscribe a destination.
 * TypeScript narrows the payload to match the event name.
 *
 * @publicDocs
 */
export const AnalyticsEvent = {
  /** Publish when a customer views a page. Hydrogen fills in the current URL when the payload has none. */
  PAGE_VIEWED: "page_viewed" as const,
  /** Publish when a customer views a product. The payload lists the viewed products. */
  PRODUCT_VIEWED: "product_viewed" as const,
  /** Publish when a customer views a collection. The payload identifies the collection by ID and handle. */
  COLLECTION_VIEWED: "collection_viewed" as const,
  /** Publish when a customer views the cart. The payload carries the current cart. */
  CART_VIEWED: "cart_viewed" as const,
  /** Publish when a customer views search results. The payload carries the search term. */
  SEARCH_VIEWED: "search_viewed" as const,

  /** Cart tracking publishes this event when the cart changes. */
  CART_UPDATED: "cart_updated" as const,
  /** Cart tracking publishes this event when the customer adds a line or raises a line's quantity. */
  PRODUCT_ADD_TO_CART: "product_added_to_cart" as const,
  /** Cart tracking publishes this event when the customer removes a line or lowers a line's quantity. */
  PRODUCT_REMOVED_FROM_CART: "product_removed_from_cart" as const,
};

/** The analytics event constants, keyed by constant name. */
type AnalyticsEventMap = typeof AnalyticsEvent;

/**
 * The names of the analytics events that Hydrogen supports. Pass a value as the event name when you publish an event or subscribe a destination. TypeScript narrows the payload to match the event name.
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
