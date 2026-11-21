import { defineComponent, h, inject, shallowRef, watch } from "vue";

import { connectCollectionUpdates } from "../core/collection/collection-update";
import {
  COLLECTION_VIEW_TAG_NAME,
  getCollectionViewAttributes,
  type CollectionViewOptions,
} from "../core/collection/collection-view";
import { CollectionUpdateSourceKey } from "./collection";

/**
 * Props for the Vue `CollectionView` component.
 *
 * @publicDocs
 */
export type CollectionViewProps = CollectionViewOptions;

/**
 * Sends the `shopify:collection:view` event when the collection page renders. `ShopifyScripts`
 * registers the element.
 *
 * The Storefront API has no product total for a collection, so pass the number of products that
 * the page loaded as `productsCount`. The element sends the event again when the collection
 * handle changes, but not when filters, sorting, or pagination change the products. Attributes
 * such as `class` go on the element.
 *
 * Inside a `CollectionProvider`, the component also sends a `shopify:collection:update` event for
 * each filter or sort change that the customer makes. The event's `productsCount` is the count
 * before the change, and its promise resolves with the count of the new results. Wrap the filters
 * and the product grid of the collection page, so that the element contains the filter controls.
 * Back and forward navigation and pagination don't send the event.
 *
 * @publicDocs
 */
export const CollectionView = defineComponent(
  (props: CollectionViewProps, { slots }) => {
    const element = shallowRef<HTMLElement>();
    const source = inject(CollectionUpdateSourceKey, null);
    const status = shallowRef<string>();
    const view = () => ({ collection: props.collection, productsCount: props.productsCount });

    watch(
      () => [source?.value, element.value] as const,
      ([current, target], _, onCleanup) => {
        if (!current || !target) return;
        const connection = connectCollectionUpdates(current, target, view());
        // Updates after each render, so the update promises resolve with the rendered count.
        const stopUpdates = watch(
          () => [props.collection.id, props.collection.handle, props.productsCount, status.value],
          () => connection.update(view()),
          { flush: "post", immediate: true },
        );
        const unsubscribe = current.store.subscribe((state) => {
          status.value = state.status;
        });
        onCleanup(() => {
          unsubscribe();
          stopUpdates();
          connection.disconnect();
        });
      },
      { flush: "post" },
    );

    return () =>
      h(
        COLLECTION_VIEW_TAG_NAME,
        { ...getCollectionViewAttributes(props), ref: element },
        slots.default?.(),
      );
  },
  {
    name: "CollectionView",
    props: {
      collection: { type: null, required: true },
      productsCount: { type: null, required: true },
    },
  },
);
