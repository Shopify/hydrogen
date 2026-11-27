import type { RouteLocationNormalizedLoaded } from "vue-router";

/** The search term in the URL. `?q=a&q=b` gives an array, so this takes the first value. */
export function routeSearchTerm(route: RouteLocationNormalizedLoaded): string {
  const q = route.query.q;
  const first = Array.isArray(q) ? q[0] : q;
  return first?.trim() ?? "";
}
