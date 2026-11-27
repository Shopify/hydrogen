import { defineComponent, h } from "vue";

import {
  getCollectionViewAttributes,
  type CollectionViewOptions,
} from "../core/collection/collection-view";
import { VIEW_EVENT_TAG_NAME } from "../core/shopify-scripts/view-event-element";

/**
 * Props for the Vue `CollectionView` component.
 *
 * @publicDocs
 */
export type CollectionViewProps = CollectionViewOptions;

/**
 * Sends the `shopify:collection:view` event when the collection page renders. Wrap the product
 * grid of the collection page. It renders a `VIEW_EVENT_TAG_NAME` element, which `ShopifyScripts`
 * registers.
 *
 * The Storefront API has no product total for a collection, so pass the number of products that
 * the page loaded as `productsCount`. The element sends the event again when the collection
 * handle changes, but not when filters, sorting, or pagination change the products.
 * `<KeepAlive>` removes the element from the document and adds it again, so the element sends
 * again when it is shown again. Attributes such as `class` go on the element.
 *
 * Set `trigger` when the page needs another trigger, such as `intersect`. With
 * `trigger="manual"`, the component doesn't send the event: call `dispatchViewEvent()` on the
 * element, which is the component's `$el`.
 *
 * @publicDocs
 */
export const CollectionView = defineComponent(
  (props: CollectionViewProps, { slots }) =>
    () =>
      // The key remounts the element for a new collection, so the element's trigger runs again.
      h(
        VIEW_EVENT_TAG_NAME,
        { key: props.collection.handle, ...getCollectionViewAttributes(props) },
        slots.default?.(),
      ),
  {
    name: "CollectionView",
    props: {
      collection: { type: null, required: true },
      productsCount: { type: null, required: true },
      trigger: { type: null, required: false },
    },
  },
);
