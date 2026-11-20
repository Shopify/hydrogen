import type * as StandardEvents from "../../../vendor/standard-events";
import type { CollectionUpdateSource } from "./collection-update";
import type { CollectionState } from "./state";
import { connectUpdateEvents, type UpdateEventConnection } from "./update-events";

/** The search term that the page shows results for, and the total number of results. */
export interface SearchUpdatesOptions {
  /** Search term of the results. The search update events send it as `search.query`. */
  query: string;
  /** Total number of results, from the `totalCount` field of the Storefront API `search` query. */
  totalCount: number;
}

/** @internal */
export type SearchUpdateConnection = UpdateEventConnection<SearchUpdatesOptions>;

type UpdatePayload = Omit<StandardEvents.SearchUpdatePayload, "promise">;

/**
 * Sends a `shopify:search:update` event from the element for each customer filter or sort change
 * in the source's store. Each event's promise resolves with the total count of the first render
 * after the store settles. A new query rejects pending promises.
 *
 * @internal
 */
export function connectSearchUpdates(
  source: CollectionUpdateSource,
  element: HTMLElement,
  initialView: SearchUpdatesOptions,
): SearchUpdateConnection {
  return connectUpdateEvents(source, element, initialView, {
    getEventClass: (module) => module.SearchUpdateEvent,
    createPayload,
    getResult: ({ totalCount }) => ({ totalCount }),
    getKey: ({ query }) => query,
    abortMessage: "The search changed or its view disconnected before the update finished.",
  });
}

function createPayload({ query }: SearchUpdatesOptions, state: CollectionState): UpdatePayload {
  const search: UpdatePayload["search"] = { query };
  if (state.filters.length > 0) search.productFilters = state.filters;
  // Search sorts only by relevance or price. Standard Events' `getSortKey` maps sort values the same way.
  if (state.sortKey) search.sortKey = state.sortKey === "PRICE" ? "PRICE" : "RELEVANCE";
  return { search };
}
