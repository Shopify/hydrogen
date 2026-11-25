// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../../../vendor/standard-events";
import {
  defineViewEventElement,
  VIEW_EVENT_TAG_NAME,
} from "../../shopify-scripts/view-event-element";
import { getCollectionViewAttributes, type CollectionViewOptions } from "../collection-view";

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

  it("uses the collection handle as the view event key", () => {
    expect(getCollectionViewAttributes({ collection, productsCount: 1 })["view-event-key"]).toBe(
      "shirts",
    );
  });
});

describe("the view event element with collection view attributes", () => {
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
    if (!customElements.get(VIEW_EVENT_TAG_NAME)) {
      importStandardEventsFromCDN.mockResolvedValue({
        createViewEventElement: () => FakeViewEventElement,
      } as Partial<typeof StandardEventsModule>);
      defineViewEventElement();
      await customElements.whenDefined(VIEW_EVENT_TAG_NAME);
    }
  });

  afterEach(() => {
    document.removeEventListener("shopify:collection:view", record);
    document.body.innerHTML = "";
  });

  function setAttributes(element: Element, options: CollectionViewOptions) {
    for (const [name, value] of Object.entries(getCollectionViewAttributes(options))) {
      element.setAttribute(name, value);
    }
  }

  it("keys re-sends on collection.handle so productsCount changes don't re-send and a new handle does", async () => {
    const element = document.createElement(VIEW_EVENT_TAG_NAME);
    setAttributes(element, { collection, productsCount: 12 });
    document.body.append(element);
    await nextTask();
    expect(events).toHaveLength(1);

    setAttributes(element, { collection, productsCount: 24 });
    await nextTask();
    expect(events).toHaveLength(1);

    setAttributes(element, { collection: { id: null, handle: "all" }, productsCount: 6 });
    await nextTask();
    expect(events).toHaveLength(2);
    expect(events[1]?.target).toBe(element);
    expect(events[1]?.detail).toEqual({
      collection: { id: null, handle: "all", productsCount: 6 },
    });
  });
});
