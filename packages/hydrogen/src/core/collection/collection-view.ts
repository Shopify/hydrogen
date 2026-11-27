import type * as StandardEvents from "../../../vendor/standard-events";

/**
 * Collection fields that the collection view event needs from your Storefront API query.
 *
 * Pass your full query type, which can include more fields.
 */
export interface CollectionViewCollection {
  /** Collection ID, or `null` for a page without a collection record, such as an all-products page. */
  id: string | null;
  /** Collection handle. The bindings send the event again when it changes. */
  handle: string;
}

/**
 * The collection that the page shows, the number of its products that the page loaded, and when
 * the element sends the event.
 */
export interface CollectionViewOptions {
  /** Collection fields from your Storefront API query. */
  collection: CollectionViewCollection;
  /**
   * The Storefront API has no product total for a collection, so pass the number of products that
   * the page loaded.
   */
  productsCount: number;
  /**
   * When the element sends the event. Defaults to `connect`. Set it when the page needs another
   * trigger, such as `intersect`, or `manual` to send the event yourself with the element's
   * `dispatchViewEvent()`.
   */
  trigger?: StandardEvents.ViewEventTrigger;
}

/**
 * Returns the attributes of the collection view element. Render the attributes on a
 * `VIEW_EVENT_TAG_NAME` element on a framework without a Hydrogen binding.
 *
 * The element sends the `shopify:collection:view` event on connect. Set `trigger` to change when
 * the element sends the event. The element sends the event once per connection. To send it again
 * when the collection changes, re-key the element on the collection handle with your framework's
 * primitive, such as `{#key collection.handle}` on Svelte or `<Show when={collection.handle} keyed>`
 * on Solid. Set the values as HTML attributes, such as with `attr:` on Solid, because the element
 * doesn't read properties.
 *
 * @param options - The collection, the number of products that the page loaded, and the trigger.
 * @returns The `view-event-trigger` and `view-event-payload` attributes.
 * @publicDocs
 */
export function getCollectionViewAttributes({
  collection,
  productsCount,
  trigger,
}: CollectionViewOptions): Record<"view-event-trigger" | "view-event-payload", string> {
  const payload: StandardEvents.CollectionViewPayload = {
    collection: { id: collection.id, handle: collection.handle, productsCount },
  };

  return {
    "view-event-trigger": trigger ?? "connect",
    "view-event-payload": JSON.stringify(payload),
  };
}
