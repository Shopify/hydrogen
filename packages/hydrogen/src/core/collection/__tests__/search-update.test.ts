// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../../../vendor/standard-events";
import { assert } from "../../test-utils";
import { createCollectionStore } from "../collection";
import { createCollectionUpdateSource } from "../collection-update";
import { connectSearchUpdates } from "../search-update";

const importStandardEventsFromCDN = vi.hoisted(() => vi.fn());
vi.mock("../../shopify-scripts/standard-events", () => ({ importStandardEventsFromCDN }));

type UpdateResult = { totalCount: number };

/** Mirrors the CDN event: a bubbling event that carries the payload fields. */
class FakeSearchUpdateEvent extends Event {
  static createPromise() {
    return Promise.withResolvers<UpdateResult>();
  }

  constructor(payload: Record<string, unknown>) {
    super("shopify:search:update", { bubbles: true, composed: true });
    Object.assign(this, payload);
  }
}

type UpdateEvent = Event & {
  search: { query: string; productFilters?: unknown; sortKey?: string };
  promise: Promise<UpdateResult>;
};

const cleanups: Array<() => void> = [];
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function setup() {
  const store = createCollectionStore({
    data: { handle: "search:shirt", dataSearch: "" },
    urlSearch: "",
  });
  const source = createCollectionUpdateSource(store);
  store.setOnBrowseChange(source.notify);
  const element = document.createElement("div");
  document.body.append(element);
  const events: UpdateEvent[] = [];
  const listener = (event: Event) => events.push(event as UpdateEvent);
  document.addEventListener("shopify:search:update", listener);
  cleanups.push(() => document.removeEventListener("shopify:search:update", listener));
  const connection = connectSearchUpdates(source, element, { query: "shirt", totalCount: 12 });
  await flush();
  return { store, element, events, connection };
}

describe("connectSearchUpdates", () => {
  beforeEach(() => {
    importStandardEventsFromCDN.mockReset();
    importStandardEventsFromCDN.mockResolvedValue({
      SearchUpdateEvent: FakeSearchUpdateEvent,
    } as unknown as typeof StandardEventsModule);
  });

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup();
    document.body.innerHTML = "";
  });

  it("sends the query and filters from the element and resolves with the new total count", async () => {
    const { store, element, events, connection } = await setup();

    store.setFilters([{ productVendor: "Acme" }, { available: true }]);

    expect(events).toHaveLength(1);
    const [event] = events;
    assert(event, "expected a search update event");
    expect(event.target).toBe(element);
    expect(event.search).toEqual({
      query: "shirt",
      productFilters: [{ productVendor: "Acme" }, { available: true }],
    });

    store.settle();
    connection.update({ query: "shirt", totalCount: 0 });

    await expect(event.promise).resolves.toEqual({ totalCount: 0 });
  });

  it("maps price sorts to PRICE and other sorts to RELEVANCE, and omits the default sort", async () => {
    const { store, events } = await setup();

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
    const { store, events, connection } = await setup();

    store.setSortKey("PRICE");
    store.settle();
    connection.update({ query: "pants", totalCount: 3 });

    expect(await events[0]?.promise.catch((reason: unknown) => reason)).toMatchObject({
      name: "AbortError",
    });
  });
});
