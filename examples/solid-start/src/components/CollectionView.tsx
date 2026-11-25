import { getCollectionViewAttributes, type CollectionViewOptions } from "@shopify/hydrogen";
import type { JSX } from "solid-js";

/**
 * Renders Hydrogen's view event element, which sends `shopify:collection:view`.
 * The element sends the event again when its `view-event-key`, the collection handle, changes.
 */
export function CollectionView(
  props: CollectionViewOptions & { class?: string; children: JSX.Element },
) {
  const attributes = () =>
    getCollectionViewAttributes({
      collection: props.collection,
      productsCount: props.productsCount,
    });
  // `attr:` sets HTML attributes. Without it, Solid sets properties on custom elements in the
  // browser, and the element only reads attributes.
  return (
    <shopify-view-event
      attr:view-event-trigger={attributes()["view-event-trigger"]}
      attr:view-event-payload={attributes()["view-event-payload"]}
      attr:view-event-key={attributes()["view-event-key"]}
      class={props.class}
    >
      {props.children}
    </shopify-view-event>
  );
}
