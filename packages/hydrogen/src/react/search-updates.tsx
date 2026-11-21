import { createElement, useRef, type HTMLAttributes, type ReactElement } from "react";

import { connectSearchUpdates, type SearchUpdatesOptions } from "../core/collection/search-update";
import { useCollectionUpdateSource } from "./collection";
import { useUpdateEvents } from "./update-events";

/**
 * Props for the `SearchUpdates` component: the search term, the total number of results, and HTML
 * attributes such as `className` for the element.
 *
 * @publicDocs
 */
export type SearchUpdatesProps = SearchUpdatesOptions & HTMLAttributes<HTMLDivElement>;

/**
 * Sends a `shopify:search:update` event for each filter or sort change that the customer makes on
 * the search page. Render the component inside the search page's `CollectionProvider`, and wrap the
 * filters, the results, and the empty state, so that the element stays on the page when a filter
 * matches no products.
 *
 * The event has the search term, the active filters, and the sort key. Its promise resolves with
 * the `totalCount` of the new results, or rejects with an `AbortError` when the search term changes
 * or the element unmounts first. A new search, back and forward navigation, and pagination don't
 * send the event. The component throws outside `CollectionProvider`.
 *
 * @param props - The search term, the total number of results, the children, and HTML attributes for the element.
 * @returns A `div` element that sends the events.
 * @publicDocs
 */
export function SearchUpdates({
  query,
  totalCount,
  children,
  ...rest
}: SearchUpdatesProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const source = useCollectionUpdateSource();
  useUpdateEvents(source, ref, { query, totalCount }, connectSearchUpdates);
  if (!source) throw new Error("SearchUpdates must be used inside a <CollectionProvider>.");

  return createElement("div", { ...rest, ref }, children);
}
