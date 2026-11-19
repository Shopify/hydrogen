// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type * as StandardEventsModule from "../../../../vendor/standard-events";
import {
  COLLECTION_VIEW_TAG_NAME,
  defineCollectionView,
  getCollectionViewAttributes,
  type CollectionViewOptions,
} from "../collection-view";

const importStandardEventsFromCDN = vi.hoisted(() => vi.fn());
vi.mock("../../shopify-scripts/standard-events", () => ({ importStandardEventsFromCDN }));

const collection = {
  id: "gid://shopify/Collection/1",
  handle: "shirts",
  title: "Shirts",
  products: { nodes: [] },
};

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

function payload(options: CollectionViewOptions) {
  return JSON.parse(getCollectionViewAttributes(options)["view-event-payload"]);
}

describe("getCollectionViewAttributes", () => {
  it("accepts a full query type", () => {
    expectTypeOf<{
      collection: typeof collection;
      productsCount: number;
    }>().toMatchTypeOf<CollectionViewOptions>();
  });

  it("sends the collection ID, handle, and products count, and drops extra fields", () => {
    expect(payload({ collection, productsCount: 12 })).toEqual({
      collection: { id: collection.id, handle: "shirts", productsCount: 12 },
    });
  });

  it("sends a null ID for a page without a collection record", () => {
    expect(payload({ collection: { id: null, handle: "all" }, productsCount: 3 })).toEqual({
      collection: { id: null, handle: "all", productsCount: 3 },
    });
  });

  it("sends the event when the element connects", () => {
    expect(
      getCollectionViewAttributes({ collection, productsCount: 1 })["view-event-trigger"],
    ).toBe("connect");
  });
});

describe("defineCollectionView", () => {
  class FakeViewEventElement extends HTMLElement {
    connectedCallback() {
      if (this.getAttribute("view-event-trigger") === "connect") {
        setTimeout(() => this.dispatchViewEvent());
      }
    }

    dispatchViewEvent() {
      if (!this.isConnected) return;
      const detail: unknown = JSON.parse(this.getAttribute("view-event-payload") ?? "{}");
      this.dispatchEvent(new CustomEvent("shopify:collection:view", { bubbles: true, detail }));
    }
  }

  let events: CustomEvent[];
  const record = (event: Event) => events.push(event as CustomEvent);

  beforeEach(async () => {
    events = [];
    document.addEventListener("shopify:collection:view", record);
    if (!customElements.get(COLLECTION_VIEW_TAG_NAME)) {
      importStandardEventsFromCDN.mockResolvedValue({
        createViewEventElement: () => FakeViewEventElement,
      } as Partial<typeof StandardEventsModule>);
      defineCollectionView();
      await customElements.whenDefined(COLLECTION_VIEW_TAG_NAME);
    }
  });

  afterEach(() => {
    document.removeEventListener("shopify:collection:view", record);
    document.body.innerHTML = "";
  });

  it("keys re-sends on collection.handle so productsCount changes don't re-send and a new handle does", async () => {
    const element = document.createElement(COLLECTION_VIEW_TAG_NAME);
    for (const [name, value] of Object.entries(
      getCollectionViewAttributes({ collection, productsCount: 12 }),
    )) {
      element.setAttribute(name, value);
    }
    document.body.append(element);
    await nextTask();
    expect(events).toHaveLength(1);

    element.setAttribute(
      "view-event-payload",
      getCollectionViewAttributes({ collection, productsCount: 24 })["view-event-payload"],
    );
    await nextTask();
    expect(events).toHaveLength(1);

    element.setAttribute(
      "view-event-payload",
      getCollectionViewAttributes({ collection: { id: null, handle: "all" }, productsCount: 6 })[
        "view-event-payload"
      ],
    );
    await nextTask();
    expect(events).toHaveLength(2);
    expect(events[1]?.target).toBe(element);
    expect(events[1]?.detail).toEqual({
      collection: { id: null, handle: "all", productsCount: 6 },
    });
  });
});
