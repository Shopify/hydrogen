// @vitest-environment happy-dom
import { act, render } from "@testing-library/react";
import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../vendor/standard-events";
import type { CollectionActions } from "../core/collection";
import { COLLECTION_VIEW_TAG_NAME } from "../core/collection/collection-view";
import { assert } from "../core/test-utils";
import { CollectionProvider, useCollectionActions } from "./collection";
import { CollectionView } from "./collection-view";

const importStandardEventsFromCDN = vi.hoisted(() => vi.fn());
vi.mock("../core/shopify-scripts/standard-events", () => ({ importStandardEventsFromCDN }));

type UpdateResult = { productsCount: number };
type UpdateEvent = Event & {
  collection: { id: string | null; handle: string; productsCount: number };
  sortKey?: string;
  promise: Promise<UpdateResult>;
};

class FakeCollectionUpdateEvent extends Event {
  static createPromise() {
    return Promise.withResolvers<UpdateResult>();
  }

  constructor(payload: Record<string, unknown>) {
    super("shopify:collection:update", { bubbles: true });
    Object.assign(this, payload);
  }
}

type Loader = { handle: string; dataSearch: string; productsCount: number };

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
      data: { handle: loader.handle, dataSearch: loader.dataSearch },
      urlSearch,
      onChange: () => {},
    },
    createElement(
      CollectionView,
      {
        collection: { id: `gid://shopify/Collection/${loader.handle}`, handle: loader.handle },
        productsCount: loader.productsCount,
      },
      createElement(Controls),
    ),
  );
  return strict ? createElement(StrictMode, null, tree) : tree;
}

const events: UpdateEvent[] = [];
const record = (event: Event) => events.push(event as UpdateEvent);
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function element(container: HTMLElement) {
  const found = container.querySelector(COLLECTION_VIEW_TAG_NAME);
  assert(found, "expected a collection view element");
  return found;
}

async function rejection(promise: Promise<unknown> | undefined) {
  return promise?.catch((reason: unknown) => reason);
}

describe("CollectionView collection update events", () => {
  beforeEach(() => {
    importStandardEventsFromCDN.mockReset();
    importStandardEventsFromCDN.mockResolvedValue({
      CollectionUpdateEvent: FakeCollectionUpdateEvent,
    } as unknown as typeof StandardEventsModule);
    document.addEventListener("shopify:collection:update", record);
  });

  afterEach(() => {
    document.removeEventListener("shopify:collection:update", record);
    events.length = 0;
    actions = undefined;
  });

  it("sends one event per sort change and resolves with the count of the new results", async () => {
    const { container, rerender } = render(
      page({ handle: "shirts", dataSearch: "", productsCount: 8 }, ""),
    );
    await flush();

    act(() => getActions().setSortKey("PRICE", true));

    expect(events).toHaveLength(1);
    expect(events[0]?.target).toBe(element(container));
    expect(events[0]?.collection).toEqual({
      id: "gid://shopify/Collection/shirts",
      handle: "shirts",
      productsCount: 8,
    });
    expect(events[0]?.sortKey).toBe("PRICE");

    // The router moves to the new URL first, then the loader data arrives.
    rerender(
      page({ handle: "shirts", dataSearch: "", productsCount: 8 }, "sort_by=price-descending"),
    );
    rerender(
      page(
        { handle: "shirts", dataSearch: "sort_by=price-descending", productsCount: 3 },
        "sort_by=price-descending",
      ),
    );

    await expect(events[0]?.promise).resolves.toEqual({ productsCount: 3 });
    expect(events).toHaveLength(1);
  });

  it("resolves when the new results have the same count", async () => {
    const { rerender } = render(page({ handle: "shirts", dataSearch: "", productsCount: 8 }, ""));
    await flush();

    act(() => getActions().setSortKey("TITLE"));
    rerender(
      page(
        { handle: "shirts", dataSearch: "sort_by=title-ascending", productsCount: 8 },
        "sort_by=title-ascending",
      ),
    );

    await expect(events[0]?.promise).resolves.toEqual({ productsCount: 8 });
  });

  it("resolves every event of fast changes with the final count", async () => {
    const { rerender } = render(page({ handle: "shirts", dataSearch: "", productsCount: 8 }, ""));
    await flush();

    act(() => getActions().setSortKey("TITLE"));
    act(() => getActions().setSortKey("PRICE"));
    rerender(
      page(
        { handle: "shirts", dataSearch: "sort_by=price-ascending", productsCount: 6 },
        "sort_by=price-ascending",
      ),
    );

    expect(events).toHaveLength(2);
    await expect(Promise.all(events.map((event) => event.promise))).resolves.toEqual([
      { productsCount: 6 },
      { productsCount: 6 },
    ]);
  });

  it("sends no event for back and forward navigation or for pagination", async () => {
    const { rerender } = render(page({ handle: "shirts", dataSearch: "", productsCount: 8 }, ""));
    await flush();

    rerender(
      page({ handle: "shirts", dataSearch: "", productsCount: 8 }, "sort_by=price-ascending"),
    );
    rerender(
      page(
        { handle: "shirts", dataSearch: "sort_by=price-ascending", productsCount: 8 },
        "sort_by=price-ascending",
      ),
    );
    rerender(
      page(
        { handle: "shirts", dataSearch: "sort_by=price-ascending", productsCount: 16 },
        "sort_by=price-ascending",
      ),
    );
    act(() => getActions().setSortKey("PRICE"));

    expect(events).toHaveLength(0);
  });

  it("rejects pending promises with an AbortError on unmount", async () => {
    const { unmount } = render(page({ handle: "shirts", dataSearch: "", productsCount: 8 }, ""));
    await flush();

    act(() => getActions().setSortKey("PRICE"));
    unmount();

    const error = await rejection(events[0]?.promise);
    expect(error).toBeInstanceOf(DOMException);
    expect(error).toMatchObject({ name: "AbortError" });
  });

  it("rejects pending promises when the collection changes and follows the new collection", async () => {
    const { rerender } = render(page({ handle: "shirts", dataSearch: "", productsCount: 8 }, ""));
    await flush();

    act(() => getActions().setSortKey("PRICE"));
    rerender(page({ handle: "pants", dataSearch: "", productsCount: 4 }, ""));

    expect(await rejection(events[0]?.promise)).toMatchObject({ name: "AbortError" });

    await flush();
    act(() => getActions().setSortKey("TITLE"));
    expect(events[1]?.collection).toEqual({
      id: "gid://shopify/Collection/pants",
      handle: "pants",
      productsCount: 4,
    });
  });

  it("sends one event per change in StrictMode", async () => {
    const { rerender } = render(
      page({ handle: "shirts", dataSearch: "", productsCount: 8 }, "", true),
    );
    await flush();

    act(() => getActions().setSortKey("PRICE"));
    rerender(
      page(
        { handle: "shirts", dataSearch: "sort_by=price-ascending", productsCount: 2 },
        "sort_by=price-ascending",
        true,
      ),
    );

    expect(events).toHaveLength(1);
    await expect(events[0]?.promise).resolves.toEqual({ productsCount: 2 });
  });

  it("sends only the view event outside a provider", async () => {
    expect(() =>
      render(
        createElement(CollectionView, {
          collection: { id: null, handle: "shirts" },
          productsCount: 1,
        }),
      ),
    ).not.toThrow();
    await flush();

    expect(importStandardEventsFromCDN).not.toHaveBeenCalled();
  });

  it("does nothing on the server", () => {
    const html = renderToString(page({ handle: "shirts", dataSearch: "", productsCount: 8 }, ""));

    expect(html).toContain(COLLECTION_VIEW_TAG_NAME);
    expect(importStandardEventsFromCDN).not.toHaveBeenCalled();
  });
});
