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
 * handle changes, but not when filters, sorting, or pagination change the products. Attributes
 * such as `class` go on the element.
 *
 * @publicDocs
 */
export const CollectionView = defineComponent(
  (props: CollectionViewProps, { slots }) =>
    () =>
      h(VIEW_EVENT_TAG_NAME, getCollectionViewAttributes(props), slots.default?.()),
  {
    name: "CollectionView",
    props: {
      collection: { type: null, required: true },
      productsCount: { type: null, required: true },
    },
  },
);
