// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configureLogging } from "../../logging";
import { assert } from "../../test-utils";
import { createCollectionStore } from "../collection";
import { connectCollectionUpdates } from "../collection-updates";
import { createCollectionReconciler } from "../reconciler";
import { fakeStandardEvents } from "./fake-standard-events";

const importStandardEventsFromCDN = vi.hoisted(() => vi.fn());
vi.mock("../../shopify-scripts/standard-events", () => ({ importStandardEventsFromCDN }));

type UpdateResult = { productsCount: number };
type UpdateEvent = Event & {
  collection: { id: string | null; handle: string; productsCount: number };
  productFilters?: unknown;
  sortKey?: string;
  promise: Promise<UpdateResult>;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const rejection = (promise: Promise<unknown>) => promise.catch((reason: unknown) => reason);

const events: UpdateEvent[] = [];
const record = (event: Event) => events.push(event as UpdateEvent);

function eventAt(index: number): UpdateEvent {
  const event = events[index];
  assert(event, `expected update event ${index}`);
  return event;
}

/** A page with a store whose browse change callback calls `notify()`, like the bindings. */
function setup(productsCount = 8) {
  const store = createCollectionStore({ data: { handle: "shirts", dataSearch: "" } });
  const target = document.createElement("div");
  document.body.append(target);
  const view = {
    collection: { id: "gid://shopify/Collection/1", handle: "shirts" },
    productsCount,
  };
  const updates = connectCollectionUpdates(store, { target, getView: () => view });
  const navigate = vi.fn();
  store.setOnBrowseChange(() => {
    updates.notify();
    navigate();
  });
  return { store, target, view, updates, navigate };
}

describe("connectCollectionUpdates", () => {
  beforeEach(() => {
    importStandardEventsFromCDN.mockResolvedValue(fakeStandardEvents);
    document.addEventListener("shopify:collection:update", record);
  });

  afterEach(() => {
    document.removeEventListener("shopify:collection:update", record);
    events.length = 0;
    document.body.innerHTML = "";
    configureLogging({});
  });

  it("sends the change with the count before it, and resolves with the count when the store settles", async () => {
    const { store, target, view } = setup(8);
    await flush();

    store.setSortKey("PRICE", true);

    expect(events).toHaveLength(1);
    const event = eventAt(0);
    expect(event.target).toBe(target);
    expect(event.collection).toEqual({
      id: "gid://shopify/Collection/1",
      handle: "shirts",
      productsCount: 8,
    });
    expect(event.sortKey).toBe("PRICE");
    expect(event).not.toHaveProperty("productFilters");

    view.productsCount = 3;
    store.settle();

    await expect(event.promise).resolves.toEqual({ productsCount: 3 });
  });

  it("sends one event per change and resolves all of them with the final count", async () => {
    const { store, view } = setup(8);
    await flush();

    store.toggleFilter({ tag: "sale" });
    store.reset();
    view.productsCount = 5;
    store.settle();

    expect(events).toHaveLength(2);
    expect(eventAt(0).productFilters).toEqual([{ tag: "sale" }]);
    expect(eventAt(1)).not.toHaveProperty("productFilters");
    expect(eventAt(1)).not.toHaveProperty("sortKey");
    await expect(Promise.all(events.map((event) => event.promise))).resolves.toEqual([
      { productsCount: 5 },
      { productsCount: 5 },
    ]);
  });

  it("resolves when the store settles in the same step as the change", async () => {
    const { store } = setup(8);
    await flush();

    store.toggleFilter({ tag: "sale" });
    store.toggleFilter({ tag: "sale" });
    store.settle();

    await expect(Promise.all(events.map((event) => event.promise))).resolves.toEqual([
      { productsCount: 8 },
      { productsCount: 8 },
    ]);
  });

  it("sends nothing when the filters and sort didn't change, but still navigates", async () => {
    const { store, navigate } = setup();
    await flush();

    store.setFilters([]);
    store.reset();

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(events).toHaveLength(0);
  });

  it("rejects with an AbortError when the collection handle changes", async () => {
    const { store, view } = setup();
    await flush();

    store.setSortKey("PRICE");
    view.collection = { id: "gid://shopify/Collection/2", handle: "pants" };
    store.settle();

    const error = await rejection(eventAt(0).promise);
    expect(error).toBeInstanceOf(DOMException);
    expect(error).toMatchObject({ name: "AbortError" });
  });

  it("rejects pending updates on disconnect and ignores later changes", async () => {
    const { store, updates } = setup();
    await flush();

    store.setSortKey("PRICE");
    updates.disconnect();

    expect(await rejection(eventAt(0).promise)).toMatchObject({ name: "AbortError" });
    store.setSortKey("TITLE");
    expect(events).toHaveLength(1);
  });

  it("rejects pending updates on back navigation, and a later settle doesn't resolve them", async () => {
    const { store } = setup();
    await flush();

    store.setSortKey("PRICE");
    // The reconciler syncs the store from the URL of the previous page and settles in one step.
    store.syncFromParams(new URLSearchParams("sort_by=title-ascending"));
    store.settle();

    expect(events).toHaveLength(1);
    expect(await rejection(eventAt(0).promise)).toMatchObject({ name: "AbortError" });
  });

  it("resolves a change to a descending ID sort when the reconciler settles from the new URL", async () => {
    const initialSearch = "sort_by=title-ascending";
    const store = createCollectionStore({
      data: { handle: "shirts", dataSearch: initialSearch },
      urlSearch: initialSearch,
    });
    const target = document.createElement("div");
    document.body.append(target);
    const view = {
      collection: { id: "gid://shopify/Collection/1", handle: "shirts" },
      productsCount: 8,
    };
    const updates = connectCollectionUpdates(store, { target, getView: () => view });
    let urlSearch = initialSearch;
    const reconciler = createCollectionReconciler(
      {
        getStore: () => store,
        readUrlSearch: () => urlSearch,
        emitChange: (search) => {
          urlSearch = search;
        },
      },
      initialSearch,
    );
    store.setOnBrowseChange(() => {
      updates.notify();
      reconciler.handleBrowseChange();
    });
    await flush();

    store.setSortKey("ID", true);
    await flush();
    view.productsCount = 3;
    reconciler.reconcile(urlSearch, urlSearch);

    expect(store.getState().status).toBe("idle");
    expect(events).toHaveLength(1);
    await expect(eventAt(0).promise).resolves.toEqual({ productsCount: 3 });
  });

  it("rejects on back navigation after a change to the COLLECTION_DEFAULT sort", async () => {
    const { store } = setup(8);
    await flush();
    store.setSortKey("TITLE");
    store.settle();

    store.setSortKey("COLLECTION_DEFAULT");
    await flush();
    store.syncFromParams(new URLSearchParams("sort_by=title-ascending"));
    store.settle();

    expect(events).toHaveLength(2);
    expect(await rejection(eventAt(1).promise)).toMatchObject({ name: "AbortError" });
  });

  it("sends changes from before the module loads in order, each with its own payload", async () => {
    const load = Promise.withResolvers<unknown>();
    importStandardEventsFromCDN.mockReturnValue(load.promise);
    const { store, view } = setup(8);

    store.setSortKey("PRICE");
    view.productsCount = 4;
    store.settle();
    store.setSortKey("TITLE");
    expect(events).toHaveLength(0);

    load.resolve(fakeStandardEvents);
    await flush();

    expect(events.map((event) => [event.sortKey, event.collection.productsCount])).toEqual([
      ["PRICE", 8],
      ["TITLE", 4],
    ]);
    await expect(eventAt(0).promise).resolves.toEqual({ productsCount: 4 });

    view.productsCount = 2;
    store.settle();
    await expect(eventAt(1).promise).resolves.toEqual({ productsCount: 2 });
  });

  it("logs a failing event constructor and still navigates", async () => {
    const error = new Error("constructor failed");
    importStandardEventsFromCDN.mockResolvedValue({
      CollectionUpdateEvent: function CollectionUpdateEvent() {
        throw error;
      },
    });
    const logger = {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    };
    configureLogging({ logger });
    const { store, navigate } = setup();
    await flush();

    expect(() => store.setSortKey("PRICE")).not.toThrow();

    expect(navigate).toHaveBeenCalledOnce();
    expect(events).toHaveLength(0);
    expect(logger.error).toHaveBeenCalledWith("collection update event failed", {
      scope: "collection",
      error,
    });
  });
});
