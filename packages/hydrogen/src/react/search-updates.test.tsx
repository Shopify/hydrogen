// @vitest-environment happy-dom
import { act, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CollectionActions } from "../core/collection";
import { assert } from "../core/test-utils";
import { CollectionProvider, useCollectionActions } from "./collection";
import { SearchUpdates } from "./search-updates";

vi.mock("../core/shopify-scripts/standard-events", async () => {
  const { fakeStandardEvents } = await import("../core/collection/__tests__/fake-standard-events");
  return { importStandardEventsFromCDN: () => Promise.resolve(fakeStandardEvents) };
});

type UpdateEvent = Event & {
  search: { query: string; productFilters?: unknown; sortKey?: string };
  promise: Promise<{ totalCount: number }>;
};

let actions: CollectionActions | undefined;
function Controls() {
  actions = useCollectionActions();
  return null;
}

function getActions() {
  assert(actions, "expected the collection actions");
  return actions;
}

function page(urlSearch: string, dataSearch: string, totalCount: number) {
  return createElement(
    CollectionProvider,
    { data: { handle: "search:shirt", dataSearch }, urlSearch, onChange: () => {} },
    createElement(
      SearchUpdates,
      { query: "shirt", totalCount, className: "results" },
      createElement(Controls),
    ),
  );
}

const events: UpdateEvent[] = [];
const record = (event: Event) => events.push(event as UpdateEvent);
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

describe("SearchUpdates", () => {
  afterEach(() => {
    document.removeEventListener("shopify:search:update", record);
    events.length = 0;
    actions = undefined;
    vi.restoreAllMocks();
  });

  it("throws outside a CollectionProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(createElement(SearchUpdates, { query: "shirt", totalCount: 1 }))).toThrow(
      "SearchUpdates must be used inside a <CollectionProvider>.",
    );
  });

  it("sends an update from its div for a filter change and resolves with the new total count", async () => {
    document.addEventListener("shopify:search:update", record);
    const { container, rerender } = render(page("q=shirt", "q=shirt", 12));
    await flush();
    const element = container.querySelector("div.results");
    assert(element, "expected the search updates div");

    act(() => getActions().toggleFilter({ productVendor: "Acme" }));

    expect(events.map((event) => event.search)).toEqual([
      { query: "shirt", productFilters: [{ productVendor: "Acme" }] },
    ]);
    const [event] = events;
    assert(event, "expected a search update event");
    expect(event.target).toBe(element);

    // The router moves to the new URL first, then the loader data arrives.
    const search = "q=shirt&filter.p.vendor=Acme";
    rerender(page(search, "q=shirt", 12));
    rerender(page(search, search, 0));

    await expect(event.promise).resolves.toEqual({ totalCount: 0 });
  });
});
