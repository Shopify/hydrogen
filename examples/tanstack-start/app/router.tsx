import { createRouter } from "@tanstack/react-router";

import { searchParamsToRecord } from "./lib/search-params";
import { routeTree } from "./routeTree.gen";

export function parseSearch(searchString: string): Record<string, string | string[]> {
  return searchParamsToRecord(new URLSearchParams(searchString));
}

export function stringifySearch(search: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(search)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item != null) searchParams.append(key, String(item));
    }
  }

  const searchString = searchParams.toString();
  return searchString ? `?${searchString}` : "";
}

export function getRouter() {
  return createRouter({
    routeTree,
    parseSearch,
    stringifySearch,
    scrollRestoration: true,
    defaultPreload: "intent",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
