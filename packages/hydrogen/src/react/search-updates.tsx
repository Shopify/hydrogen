"use client";

import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type ReactElement,
} from "react";

import { connectSearchUpdates, type SearchUpdatesView } from "../core/collection/search-updates";
import { useRegisterBrowseChangeListener, useRequiredStore } from "./collection";

/**
 * Props for the `SearchUpdates` component: the search term, the total number of results, and HTML
 * attributes such as `className` for the `div`.
 *
 * @publicDocs
 */
export type SearchUpdatesProps = SearchUpdatesView & HTMLAttributes<HTMLDivElement>;

/**
 * Sends the `shopify:search:update` event for each filter or sort change that the customer makes on
 * the search page. Render it inside the search page's `CollectionProvider`. It throws outside a
 * provider.
 *
 * The component renders a `div`, and the events start at it. Wrap the filters, the results, and
 * the empty state, so the `div` stays on the page when a filter matches no products.
 *
 * The event has the search term, the active filters, and the sort key (`PRICE` or `RELEVANCE`). Its
 * promise resolves with the `totalCount` that the component renders after the provider settles,
 * and rejects with an `AbortError` when the search term changes or the component unmounts first.
 * Pass the `totalCount` of the Storefront API `search` query, from the same data as the results.
 * Back and forward navigation send no update event.
 *
 * @param props - The search term, the total number of results, the children, and HTML attributes for the `div`.
 * @returns The `div` that wraps the children.
 * @publicDocs
 */
export function SearchUpdates({
  query,
  totalCount,
  children,
  ...rest
}: SearchUpdatesProps): ReactElement {
  const store = useRequiredStore("SearchUpdates");
  const registerBrowseChangeListener = useRegisterBrowseChangeListener("SearchUpdates");
  const elementRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SearchUpdatesView>({ query, totalCount });

  // A child's layout effect runs before the provider's layout effect that settles the store, so
  // the update promises resolve with the new count.
  useLayoutEffect(() => {
    viewRef.current = { query, totalCount };
  });

  useEffect(() => {
    const target = elementRef.current;
    if (!target) return;
    const updates = connectSearchUpdates(store, {
      target,
      getView: () => viewRef.current,
    });
    const unregister = registerBrowseChangeListener(updates.notify);
    return () => {
      unregister();
      updates.disconnect();
    };
  }, [store, registerBrowseChangeListener]);

  return createElement("div", { ...rest, ref: elementRef }, children);
}
