// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../../../vendor/standard-events";
import { assert } from "../../test-utils";
import { createCollectionStore } from "../collection";
import {
  connectCollectionUpdates,
  createCollectionUpdateSource,
  type CollectionUpdateSource,
} from "../collection-update";

const importStandardEventsFromCDN = vi.hoisted(() => vi.fn());
vi.mock("../../shopify-scripts/standard-events", () => ({ importStandardEventsFromCDN }));

type UpdateResult = { productsCount: number };

/** Mirrors the CDN event: a bubbling event that carries the payload fields. */
class FakeCollectionUpdateEvent extends Event {
  static createPromise() {
    return Promise.withResolvers<UpdateResult>();
  }

  constructor(payload: Record<string, unknown>) {
    super("shopify:collection:update", { bubbles: true, composed: true });
    Object.assign(this, payload);
  }
}

type UpdateEvent = Event & {
  collection: { id: string | null; handle: string; productsCount: number };
  productFilters?: unknown;
  sortKey?: string;
  promise: Promise<UpdateResult>;
};

const collection = { id: "gid://shopify/Collection/1", handle: "shirts" };

function setup({ urlSearch = "" } = {}) {
  const store = createCollectionStore({ data: { handle: "shirts", dataSearch: "" }, urlSearch });
  const source = createCollectionUpdateSource(store);
  store.setOnBrowseChange(source.notify);
  const element = document.createElement("div");
  document.body.append(element);
  const events: UpdateEvent[] = [];
  const listener = (event: Event) => events.push(event as UpdateEvent);
  document.addEventListener("shopify:collection:update", listener);
  cleanups.push(() => document.removeEventListener("shopify:collection:update", listener));
  return { store, source, element, events };
}

function connect(source: CollectionUpdateSource, element: HTMLElement, productsCount = 8) {
  return connectCollectionUpdates(source, element, { collection, productsCount });
}

const cleanups: Array<() => void> = [];
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("connectCollectionUpdates", () => {
  beforeEach(() => {
    importStandardEventsFromCDN.mockReset();
    importStandardEventsFromCDN.mockResolvedValue({
      CollectionUpdateEvent: FakeCollectionUpdateEvent,
    } as unknown as typeof StandardEventsModule);
  });

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup();
    document.body.innerHTML = "";
  });

  it("sends one event from the element for a sort change and resolves with the new count", async () => {
    const { store, source, element, events } = setup();
    const connection = connect(source, element);
    await flush();

    store.setSortKey("PRICE", true);

    expect(events).toHaveLength(1);
    const [event] = events;
    assert(event, "expected an update event");
    expect(event.target).toBe(element);
    expect(event.collection).toEqual({ id: collection.id, handle: "shirts", productsCount: 8 });
    expect(event.sortKey).toBe("PRICE");
    expect(event).not.toHaveProperty("productFilters");

    connection.update({ collection, productsCount: 8 });
    store.settle();
    connection.update({ collection, productsCount: 3 });

    await expect(event.promise).resolves.toEqual({ productsCount: 3 });
  });

  it("sends the active filters and omits the default sort", async () => {
    const { store, source, element, events } = setup();
    connect(source, element);
    await flush();

    store.setFilters([{ tag: "sale" }, { price: { min: 10 } }]);

    expect(events[0]?.productFilters).toEqual([{ tag: "sale" }, { price: { min: 10 } }]);
    expect(events[0]).not.toHaveProperty("sortKey");
  });

  it("sends a null ID for a page without a collection record", async () => {
    const { store, source, element, events } = setup();
    connectCollectionUpdates(source, element, {
      collection: { id: null, handle: "all" },
      productsCount: 2,
    });
    await flush();

    store.toggleFilter({ tag: "sale" });

    expect(events[0]?.collection).toEqual({ id: null, handle: "all", productsCount: 2 });
  });

  it("sends no event for URL syncs, no-op changes, or count changes", async () => {
    const { store, source, element, events } = setup({ urlSearch: "sort_by=price-ascending" });
    const connection = connect(source, element);
    await flush();

    store.syncFromParams(new URLSearchParams("filter.p.tag=sale"));
    store.settle();
    store.setFilters([{ tag: "sale" }]);
    store.toggleFilterInput("not json");
    connection.update({ collection, productsCount: 20 });

    expect(events).toHaveLength(0);

    // The no-op detection compares against the synced state, not the state at connect time.
    store.setFilters([]);
    expect(events).toHaveLength(1);
  });

  it("resolves every pending promise with the final count", async () => {
    const { store, source, element, events } = setup();
    const connection = connect(source, element);
    await flush();

    store.setSortKey("PRICE");
    connection.update({ collection, productsCount: 8 });
    store.setSortKey("TITLE");
    store.reset();
    store.settle();
    connection.update({ collection, productsCount: 5 });

    expect(events).toHaveLength(3);
    expect(events[1]?.sortKey).toBe("TITLE");
    expect(events[2]).not.toHaveProperty("sortKey");
    await expect(Promise.all(events.map((event) => event.promise))).resolves.toEqual([
      { productsCount: 5 },
      { productsCount: 5 },
      { productsCount: 5 },
    ]);
  });

  it("rejects pending promises with an AbortError on disconnect and then stops", async () => {
    const { store, source, element, events } = setup();
    const connection = connect(source, element);
    await flush();

    store.setSortKey("PRICE");
    connection.disconnect();

    const error = await events[0]?.promise.catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(DOMException);
    expect(error).toMatchObject({ name: "AbortError" });

    store.setSortKey("TITLE");
    expect(events).toHaveLength(1);
  });

  it("rejects pending promises with an AbortError when the collection handle changes", async () => {
    const { store, source, element, events } = setup();
    const connection = connect(source, element);
    await flush();

    store.setSortKey("PRICE");
    store.settle();
    connection.update({ collection: { id: null, handle: "pants" }, productsCount: 2 });

    expect(await events[0]?.promise.catch((reason: unknown) => reason)).toMatchObject({
      name: "AbortError",
    });
  });

  it("sends the event when the module loads, and resolves right away if the store settled", async () => {
    const load = Promise.withResolvers<unknown>();
    importStandardEventsFromCDN.mockReturnValue(load.promise);
    const finishLoad = () => load.resolve({ CollectionUpdateEvent: FakeCollectionUpdateEvent });
    const { store, source, element, events } = setup();
    const connection = connect(source, element);

    store.setSortKey("PRICE");
    store.settle();
    connection.update({ collection, productsCount: 4 });
    expect(events).toHaveLength(0);

    finishLoad();
    await flush();

    expect(events).toHaveLength(1);
    expect(events[0]?.collection.productsCount).toBe(8);
    await expect(events[0]?.promise).resolves.toEqual({ productsCount: 4 });
  });

  it("drops a queued event when the connection closes before the module loads", async () => {
    const load = Promise.withResolvers<unknown>();
    importStandardEventsFromCDN.mockReturnValue(load.promise);
    const finishLoad = () => load.resolve({ CollectionUpdateEvent: FakeCollectionUpdateEvent });
    const { store, source, element, events } = setup();
    const connection = connect(source, element);

    store.setSortKey("PRICE");
    connection.disconnect();
    finishLoad();
    await flush();

    expect(events).toHaveLength(0);
  });

  it("sends nothing when the module fails to load", async () => {
    importStandardEventsFromCDN.mockRejectedValue(new Error("offline"));
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    const { store, source, element, events } = setup();
    connect(source, element);

    store.setSortKey("PRICE");
    await flush();
    process.off("unhandledRejection", unhandled);

    expect(events).toHaveLength(0);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
