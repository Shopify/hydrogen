import { defineComponent, h, inject, shallowRef } from "vue";

import { connectSearchUpdates, type SearchUpdatesOptions } from "../core/collection/search-update";
import { CollectionUpdateSourceKey } from "./collection";
import { useUpdateEvents } from "./update-events";

/**
 * Props for the Vue `SearchUpdates` component.
 *
 * @publicDocs
 */
export type SearchUpdatesProps = SearchUpdatesOptions;

/**
 * Sends a `shopify:search:update` event for each filter or sort change that the customer makes on
 * the search page. Render the component inside the search page's `CollectionProvider`, and wrap the
 * filters, the results, and the empty state, so that the element stays on the page when a filter
 * matches no products. Attributes such as `class` go on the `div` element.
 *
 * The event has the search term, the active filters, and the sort key. Its promise resolves with
 * the `totalCount` of the new results, or rejects with an `AbortError` when the search term changes
 * or the element unmounts first. A new search, back and forward navigation, and pagination don't
 * send the event. The component throws outside `CollectionProvider`.
 *
 * @publicDocs
 */
export const SearchUpdates = defineComponent(
  (props: SearchUpdatesProps, { slots }) => {
    const source = inject(CollectionUpdateSourceKey, null);
    if (!source) throw new Error("SearchUpdates must be used inside a <CollectionProvider>.");
    const element = shallowRef<HTMLElement>();
    useUpdateEvents(
      source,
      element,
      () => ({ query: props.query, totalCount: props.totalCount }),
      connectSearchUpdates,
    );

    return () => h("div", { ref: element }, slots.default?.());
  },
  {
    name: "SearchUpdates",
    props: {
      query: { type: String, required: true },
      totalCount: { type: Number, required: true },
    },
  },
);
