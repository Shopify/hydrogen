import type { RouteLocationNormalizedLoaded } from "vue-router";

/**
 * Browse search string from the URL bar (no leading `?`).
 *
 * Do not build this from `route.query` — Vue Router nests keys that contain `.`
 * (e.g. `filter.v.option.color`), so URLSearchParams(route.query) disagrees with
 * the serialized string the collection store uses for settle.
 *
 * On the client, prefer `window.location.search` over `route.fullPath`: after
 * `navigateTo`, the address bar updates before Vue Router's reactive `route`
 * catches up. The collection store only clears loading when `dataSearch` and
 * `urlSearch` match — a stale `route` snapshot leaves filters stuck loading.
 */
export function collectionRouteSearch(route: RouteLocationNormalizedLoaded): string {
  if (import.meta.client && typeof window !== "undefined") {
    // Read fullPath so route-driven computeds/watchers re-run on NuxtLink and
    // back/forward even though the value comes from window.location.search.
    void route.fullPath;

    const fromLocation = window.location.search;
    if (fromLocation.length > 0) {
      return fromLocation.startsWith("?") ? fromLocation.slice(1) : fromLocation;
    }
    // Clearing the last filter: location.search is already "" but route.fullPath
    // can still carry the old query for a tick — falling through would disagree
    // with dataSearch="" and the collection store would never call settle().
    return "";
  }

  const index = route.fullPath.indexOf("?");
  return index === -1 ? "" : route.fullPath.slice(index + 1);
}
