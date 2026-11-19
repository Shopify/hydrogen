import { getCollectionViewAttributes, type CollectionViewOptions } from "@shopify/hydrogen";
import type { JSX } from "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "shopify-collection-view": HTMLAttributes<HTMLElement>;
    }
  }
}

/**
 * Renders Hydrogen's collection view element, which sends `shopify:collection:view`.
 * The element sends the event again when the collection handle in its payload changes.
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
    <shopify-collection-view
      attr:view-event-trigger={attributes()["view-event-trigger"]}
      attr:view-event-payload={attributes()["view-event-payload"]}
      class={props.class}
    >
      {props.children}
    </shopify-collection-view>
  );
}
