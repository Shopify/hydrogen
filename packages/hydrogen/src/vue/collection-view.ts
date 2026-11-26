import { defineComponent, h, nextTick, shallowRef, watch } from "vue";

import { connectCollectionUpdates } from "../core/collection/collection-updates";
import {
  getCollectionViewAttributes,
  type CollectionViewOptions,
} from "../core/collection/collection-view";
import { VIEW_EVENT_TAG_NAME } from "../core/shopify-scripts/view-event-element";
import { useRegisterBrowseChangeListener, useRequiredStoreRef } from "./collection";

/**
 * Props for the Vue `CollectionView` component.
 *
 * @publicDocs
 */
export type CollectionViewProps = CollectionViewOptions;

/**
 * Sends the `shopify:collection:view` event when the collection page renders, and the
 * `shopify:collection:update` event for each filter or sort change that the customer makes.
 * Render it inside the collection provider, around the filter and sort controls, the results, and
 * the empty state. It renders a `VIEW_EVENT_TAG_NAME` element, which `ShopifyScripts` registers.
 * The component throws outside the collection provider.
 *
 * The Storefront API has no product total for a collection, so pass the number of products that
 * the page loaded as `productsCount`. The view event is sent again when the collection handle
 * changes, but not when filters, sorting, or pagination change the products. Each update event has
 * the products count before the change. Its promise resolves with the new `productsCount` when the
 * new results render, and rejects with an `AbortError` when the collection changes, when back or
 * forward navigation leaves the change, or when the component unmounts first. Back and forward
 * navigation send no update event. `<KeepAlive>` removes the element from the document and adds it
 * again, so the view event is sent again when it is shown again. Attributes such as `class` go on
 * the element.
 *
 * On a page without filters and without the collection provider, render `VIEW_EVENT_TAG_NAME`
 * with the attributes from `getCollectionViewAttributes` from `@shopify/hydrogen` instead.
 *
 * @publicDocs
 */
export const CollectionView = defineComponent(
  (props: CollectionViewProps, { slots }) => {
    const storeRef = useRequiredStoreRef("CollectionView");
    const registerBrowseChangeListener = useRegisterBrowseChangeListener("CollectionView");
    const elementRef = shallowRef<HTMLElement | null>(null);

    // The key below gives a new collection a new element, so this reconnects to it.
    watch(
      [elementRef, storeRef],
      ([target, store], _, onCleanup) => {
        if (!target) return;
        const updates = connectCollectionUpdates(store, {
          target,
          getView: () => ({ collection: props.collection, productsCount: props.productsCount }),
          // The provider settles the store while it gets its new props, before this component
          // gets the new count.
          afterRender: (callback) => void nextTick(callback),
        });
        const unregister = registerBrowseChangeListener(updates.notify);
        onCleanup(() => {
          unregister();
          updates.disconnect();
        });
      },
      { flush: "post" },
    );

    return () =>
      h(
        VIEW_EVENT_TAG_NAME,
        // The key remounts the element for a new collection, so the element sends the view again.
        { key: props.collection.handle, ...getCollectionViewAttributes(props), ref: elementRef },
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
