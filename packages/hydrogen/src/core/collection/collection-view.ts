import type * as StandardEvents from "../../../vendor/standard-events";

/**
 * Collection fields that the collection view event needs from your Storefront API query.
 *
 * Pass your full query type, which can include more fields.
 */
export interface CollectionViewCollection {
  /** Collection ID, or `null` for a page without a collection record, such as an all-products page. */
  id: string | null;
  /** Collection handle. The element sends the event again when it changes. */
  handle: string;
}

/** The collection that the page shows, and the number of its products that the page loaded. */
export interface CollectionViewOptions {
  /** Collection fields from your Storefront API query. */
  collection: CollectionViewCollection;
  /**
   * The Storefront API has no product total for a collection, so pass the number of products that
   * the page loaded.
   */
  productsCount: number;
}

/**
 * Returns the attributes of the collection view element. Render the attributes on a
 * `VIEW_EVENT_TAG_NAME` element on a framework without a Hydrogen binding.
 *
 * The element sends the `shopify:collection:view` event when it connects. The `view-event-key`
 * attribute is the collection handle. The element sends the event again when the key changes, but
 * not when only `productsCount` changes. Set the values as HTML attributes, such as with `attr:` on
 * Solid, because the element doesn't read properties.
 *
 * @param options - The collection and the number of products that the page loaded.
 * @returns The `view-event-trigger`, `view-event-payload`, and `view-event-key` attributes.
 * @publicDocs
 */
export function getCollectionViewAttributes({
  collection,
  productsCount,
}: CollectionViewOptions): Record<
  "view-event-trigger" | "view-event-payload" | "view-event-key",
  string
> {
  const payload: StandardEvents.CollectionViewPayload = {
    collection: { id: collection.id, handle: collection.handle, productsCount },
  };

  return {
    "view-event-trigger": "connect",
    "view-event-payload": JSON.stringify(payload),
    "view-event-key": collection.handle,
  };
}
