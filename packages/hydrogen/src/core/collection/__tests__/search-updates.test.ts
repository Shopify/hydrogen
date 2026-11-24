// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { assert } from "../../test-utils";
import { createCollectionStore } from "../collection";
import { connectSearchUpdates } from "../search-updates";

vi.mock("../../shopify-scripts/standard-events", async () => {
  const { fakeStandardEvents } = await import("./fake-standard-events");
  return { importStandardEventsFromCDN: () => Promise.resolve(fakeStandardEvents) };
});

type UpdateEvent = Event & {
  search: { query: string; productFilters?: unknown; sortKey?: string };
  promise: Promise<{ totalCount: number }>;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const events: UpdateEvent[] = [];
const record = (event: Event) => events.push(event as UpdateEvent);

function eventAt(index: number): UpdateEvent {
  const event = events[index];
  assert(event, `expected search update event ${index}`);
  return event;
}

/** A search page with a store whose browse change callback calls `notify()`, like the bindings. */
async function setup(totalCount = 12) {
  const store = createCollectionStore({ data: { handle: "search:shirt", dataSearch: "" } });
  const target = document.createElement("div");
  document.body.append(target);
  const view = { query: "shirt", totalCount };
  const updates = connectSearchUpdates(store, { target, getView: () => view });
  store.setOnBrowseChange(() => updates.notify());
  await flush();
  return { store, target, view };
}

describe("connectSearchUpdates", () => {
  beforeEach(() => {
    document.addEventListener("shopify:search:update", record);
  });

  afterEach(() => {
    document.removeEventListener("shopify:search:update", record);
    events.length = 0;
    document.body.innerHTML = "";
  });

  it("sends the query and filters, and resolves with the total count when the store settles", async () => {
    const { store, target, view } = await setup(12);

    store.setFilters([{ productVendor: "Acme" }, { available: true }]);

    expect(events).toHaveLength(1);
    const event = eventAt(0);
    expect(event.target).toBe(target);
    expect(event.search).toEqual({
      query: "shirt",
      productFilters: [{ productVendor: "Acme" }, { available: true }],
    });

    view.totalCount = 0;
    store.settle();

    await expect(event.promise).resolves.toEqual({ totalCount: 0 });
  });

  it("maps price sorts to PRICE and other sorts to RELEVANCE, and omits the default sort", async () => {
    const { store } = await setup();

    store.setSortKey("PRICE", true);
    store.setSortKey("RELEVANCE");
    store.setSortKey("TITLE");
    store.reset();

    expect(events.map((event) => event.search)).toEqual([
      { query: "shirt", sortKey: "PRICE" },
      { query: "shirt", sortKey: "RELEVANCE" },
      { query: "shirt", sortKey: "RELEVANCE" },
      { query: "shirt" },
    ]);
  });

  it("rejects pending promises with an AbortError when the query changes", async () => {
    const { store, view } = await setup();

    store.setSortKey("PRICE");
    view.query = "pants";
    store.settle();

    const error = await eventAt(0).promise.catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(DOMException);
    expect(error).toMatchObject({ name: "AbortError" });
  });
});
