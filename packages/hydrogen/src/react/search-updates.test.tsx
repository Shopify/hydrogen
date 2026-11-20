// @vitest-environment happy-dom
import { act, render } from "@testing-library/react";
import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../vendor/standard-events";
import type { CollectionActions } from "../core/collection";
import { assert } from "../core/test-utils";
import { CollectionProvider, useCollectionActions } from "./collection";
import { SearchUpdates } from "./search-updates";

const importStandardEventsFromCDN = vi.hoisted(() => vi.fn());
vi.mock("../core/shopify-scripts/standard-events", () => ({ importStandardEventsFromCDN }));

type UpdateResult = { totalCount: number };
type UpdateEvent = Event & {
  search: { query: string; productFilters?: unknown; sortKey?: string };
  promise: Promise<UpdateResult>;
};

class FakeSearchUpdateEvent extends Event {
  static createPromise() {
    return Promise.withResolvers<UpdateResult>();
  }

  constructor(payload: Record<string, unknown>) {
    super("shopify:search:update", { bubbles: true });
    Object.assign(this, payload);
  }
}

type Loader = { term: string; dataSearch: string; totalCount: number };

let actions: CollectionActions | undefined;
function Controls() {
  actions = useCollectionActions();
  return null;
}

function getActions(): CollectionActions {
  assert(actions, "expected the collection actions");
  return actions;
}

function page(loader: Loader, urlSearch: string, strict = false) {
  const tree = createElement(
    CollectionProvider,
    {
      data: { handle: `search:${loader.term}`, dataSearch: loader.dataSearch },
      urlSearch,
      onChange: () => {},
    },
    createElement(
      SearchUpdates,
      { query: loader.term, totalCount: loader.totalCount, className: "results" },
      createElement(Controls),
    ),
  );
  return strict ? createElement(StrictMode, null, tree) : tree;
}

const events: UpdateEvent[] = [];
const record = (event: Event) => events.push(event as UpdateEvent);
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

async function rejection(promise: Promise<unknown> | undefined) {
  return promise?.catch((reason: unknown) => reason);
}

describe("SearchUpdates", () => {
  beforeEach(() => {
    importStandardEventsFromCDN.mockReset();
    importStandardEventsFromCDN.mockResolvedValue({
      SearchUpdateEvent: FakeSearchUpdateEvent,
    } as unknown as typeof StandardEventsModule);
    document.addEventListener("shopify:search:update", record);
  });

  afterEach(() => {
    document.removeEventListener("shopify:search:update", record);
    events.length = 0;
    actions = undefined;
  });

  it("sends one event per filter change and resolves with the total count of the new results", async () => {
    const { container, rerender } = render(
      page({ term: "shirt", dataSearch: "q=shirt", totalCount: 12 }, "q=shirt"),
    );
    await flush();

    act(() => getActions().toggleFilter({ productVendor: "Acme" }));

    expect(events).toHaveLength(1);
    expect(events[0]?.target).toBe(container.querySelector("div.results"));
    expect(events[0]?.search).toEqual({
      query: "shirt",
      productFilters: [{ productVendor: "Acme" }],
    });

    // The router moves to the new URL first, then the loader data arrives.
    const search = "q=shirt&filter.p.vendor=Acme";
    rerender(page({ term: "shirt", dataSearch: "q=shirt", totalCount: 12 }, search));
    rerender(page({ term: "shirt", dataSearch: search, totalCount: 0 }, search));

    await expect(events[0]?.promise).resolves.toEqual({ totalCount: 0 });
    expect(events).toHaveLength(1);
  });

  it("sends one event per change in StrictMode", async () => {
    const { rerender } = render(
      page({ term: "shirt", dataSearch: "q=shirt", totalCount: 12 }, "q=shirt", true),
    );
    await flush();

    act(() => getActions().setSortKey("PRICE"));
    const search = "q=shirt&sort_by=price-ascending";
    rerender(page({ term: "shirt", dataSearch: search, totalCount: 12 }, search, true));

    expect(events).toHaveLength(1);
    expect(events[0]?.search).toEqual({ query: "shirt", sortKey: "PRICE" });
    await expect(events[0]?.promise).resolves.toEqual({ totalCount: 12 });
  });

  it("rejects pending promises on a new search and sends the new query after", async () => {
    const { rerender } = render(
      page({ term: "shirt", dataSearch: "q=shirt", totalCount: 12 }, "q=shirt"),
    );
    await flush();

    act(() => getActions().setSortKey("PRICE"));
    rerender(page({ term: "pants", dataSearch: "q=pants", totalCount: 4 }, "q=pants"));

    expect(await rejection(events[0]?.promise)).toMatchObject({ name: "AbortError" });

    await flush();
    act(() => getActions().setSortKey("PRICE"));
    expect(events[1]?.search).toEqual({ query: "pants", sortKey: "PRICE" });
  });

  it("rejects pending promises with an AbortError on unmount", async () => {
    const { unmount } = render(
      page({ term: "shirt", dataSearch: "q=shirt", totalCount: 12 }, "q=shirt"),
    );
    await flush();

    act(() => getActions().setSortKey("PRICE"));
    unmount();

    expect(await rejection(events[0]?.promise)).toMatchObject({ name: "AbortError" });
  });

  it("throws outside a provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(createElement(SearchUpdates, { query: "shirt", totalCount: 1 }))).toThrow(
      "SearchUpdates must be used inside a <CollectionProvider>.",
    );
    vi.mocked(console.error).mockRestore();
  });

  it("renders the element and does nothing else on the server", () => {
    const html = renderToString(
      page({ term: "shirt", dataSearch: "q=shirt", totalCount: 12 }, "q=shirt"),
    );

    expect(html).toBe('<div class="results"></div>');
    expect(importStandardEventsFromCDN).not.toHaveBeenCalled();
  });
});
