import { getCollectionViewAttributes, type CollectionViewOptions } from "@shopify/hydrogen";
import type { JSX } from "solid-js";

/**
 * Renders Hydrogen's view event element, which sends `shopify:collection:view`.
 * The element sends the event once each time it connects. Key it on the collection handle, such
 * as with `<Show when={collection.handle} keyed>`, where one component shows different collections.
 */
export function CollectionView(
  props: CollectionViewOptions & {
    class?: string;
    ref?: (element: HTMLElement) => void;
    children: JSX.Element;
  },
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
      class={props.class}
      ref={props.ref}
    >
      {props.children}
    </shopify-view-event>
  );
}
