import { defineComponent, h, nextTick, shallowRef, watch } from "vue";

import { connectSearchUpdates, type SearchUpdatesView } from "../core/collection/search-updates";
import { useRegisterBrowseChangeListener, useRequiredStoreRef } from "./collection";

/**
 * Props for the Vue `SearchUpdates` component.
 *
 * @publicDocs
 */
export type SearchUpdatesProps = SearchUpdatesView;

/**
 * Sends the `shopify:search:update` event for each filter or sort change that the customer makes on
 * the search page. Render it inside the search page's collection provider. It throws outside a
 * provider.
 *
 * The component renders a `div`, and the events start at it. Wrap the filters, the results, and
 * the empty state, so the `div` stays on the page when a filter matches no products. Attributes
 * such as `class` go on the `div`.
 *
 * The event has the search term, the active filters, and the sort key (`PRICE` or `RELEVANCE`). Its
 * promise resolves with the `totalCount` that the component renders after the provider settles,
 * and rejects with an `AbortError` when the search term changes or the component unmounts first.
 * Pass the `totalCount` of the Storefront API `search` query, from the same data as the results.
 * Back and forward navigation send no update event.
 *
 * @publicDocs
 */
export const SearchUpdates = defineComponent(
  (props: SearchUpdatesProps, { slots }) => {
    const storeRef = useRequiredStoreRef("SearchUpdates");
    const registerBrowseChangeListener = useRegisterBrowseChangeListener("SearchUpdates");
    const elementRef = shallowRef<HTMLElement | null>(null);

    watch(
      [elementRef, storeRef],
      ([target, store], _, onCleanup) => {
        if (!target) return;
        const updates = connectSearchUpdates(store, {
          target,
          getView: () => ({ query: props.query, totalCount: props.totalCount }),
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

    return () => h("div", { ref: elementRef }, slots.default?.());
  },
  {
    name: "SearchUpdates",
    props: {
      query: { type: null, required: true },
      totalCount: { type: null, required: true },
    },
  },
);
