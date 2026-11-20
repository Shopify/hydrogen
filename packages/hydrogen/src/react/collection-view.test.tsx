// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../vendor/standard-events";
import { COLLECTION_VIEW_TAG_NAME, defineCollectionView } from "../core/collection/collection-view";
import { assert } from "../core/test-utils";
import { CollectionView, type CollectionViewProps } from "./collection-view";

vi.mock("../core/shopify-scripts/standard-events", () => ({
  importStandardEventsFromCDN: () =>
    Promise.resolve({
      createViewEventElement: () => FakeViewEventElement,
    } as Partial<typeof StandardEventsModule>),
}));

// Records the props that the component gives React, so the `class` test does not depend on how
// the installed React version maps `className` on custom elements.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return { ...react, createElement: vi.fn(react.createElement) };
});

// Mirrors the CDN element: `connect` sends the event after connecting, and each send re-reads the payload.
class FakeViewEventElement extends HTMLElement {
  connectedCallback() {
    if (this.getAttribute("view-event-trigger") === "connect") {
      setTimeout(() => this.dispatchViewEvent());
    }
  }

  dispatchViewEvent() {
    if (!this.isConnected) return;
    const detail = JSON.parse(this.getAttribute("view-event-payload") ?? "{}");
    this.dispatchEvent(new CustomEvent("shopify:collection:view", { bubbles: true, detail }));
  }
}

const collection = { id: "gid://shopify/Collection/1", handle: "shirts", title: "Shirts" };
const otherCollection = { id: "gid://shopify/Collection/2", handle: "pants", title: "Pants" };

function getElement(container: HTMLElement) {
  const element = container.querySelector(COLLECTION_VIEW_TAG_NAME);
  assert(element, "expected a collection view element");
  return element;
}

function payloadOf(element: Element) {
  return JSON.parse(element.getAttribute("view-event-payload") ?? "null");
}

describe("CollectionView", () => {
  beforeAll(async () => {
    defineCollectionView();
    await customElements.whenDefined(COLLECTION_VIEW_TAG_NAME);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the element with the view attributes, children, and HTML attributes", () => {
    const { container } = render(
      createElement(
        CollectionView,
        {
          collection,
          productsCount: 8,
          className: "grid",
          id: "results",
          "data-testid": "x",
        } as CollectionViewProps,
        createElement("span", null, "Products"),
      ),
    );

    const element = getElement(container);
    expect(element.getAttribute("class")).toBe("grid");
    expect(element.id).toBe("results");
    expect(element.getAttribute("data-testid")).toBe("x");
    expect(element.getAttribute("view-event-trigger")).toBe("connect");
    expect(payloadOf(element)).toEqual({
      collection: { id: collection.id, handle: "shirts", productsCount: 8 },
    });
    expect(element.textContent).toBe("Products");
  });

  it("passes className as class before React renders the custom element", () => {
    vi.mocked(createElement).mockClear();
    render(createElement(CollectionView, { collection, productsCount: 8, className: "grid" }));

    const props = vi
      .mocked(createElement)
      .mock.calls.find(([type]) => type === COLLECTION_VIEW_TAG_NAME)?.[1];
    expect(props).toMatchObject({ class: "grid" });
    expect(props).not.toHaveProperty("className");
  });

  it("renders the element and payload on the server", () => {
    const html = renderToString(
      createElement(CollectionView, { collection, productsCount: 8, className: "grid" }),
    );

    expect(html).toContain(`<${COLLECTION_VIEW_TAG_NAME}`);
    expect(html).toContain('class="grid"');
    expect(html).toContain('view-event-trigger="connect"');
    expect(html).toContain("view-event-payload=");
    expect(html).toContain("gid://shopify/Collection/1");
  });

  it("sends the event to the document from the element on mount", async () => {
    const events: Event[] = [];
    const listener = (event: Event) => events.push(event);
    document.addEventListener("shopify:collection:view", listener);

    const { container } = render(createElement(CollectionView, { collection, productsCount: 8 }));
    await vi.waitFor(() => expect(events).toHaveLength(1));
    document.removeEventListener("shopify:collection:view", listener);

    expect(events[0]?.target).toBe(getElement(container));
    expect((events[0] as CustomEvent).detail).toEqual({
      collection: { id: collection.id, handle: "shirts", productsCount: 8 },
    });
  });

  it("lets the element send the event again only when the collection handle changes", async () => {
    const events: CustomEvent[] = [];
    const listener = (event: Event) => events.push(event as CustomEvent);
    document.addEventListener("shopify:collection:view", listener);
    const view = (props: CollectionViewProps) =>
      createElement(StrictMode, null, createElement(CollectionView, props));

    const { container, rerender } = render(view({ collection, productsCount: 8 }));
    await vi.waitFor(() => expect(events).toHaveLength(1));
    const element = getElement(container);

    rerender(view({ collection: { ...collection }, productsCount: 16 }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toHaveLength(1);
    expect(payloadOf(element).collection.productsCount).toBe(16);

    rerender(view({ collection: otherCollection, productsCount: 4 }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.removeEventListener("shopify:collection:view", listener);

    expect(events).toHaveLength(2);
    expect(getElement(container)).toBe(element);
    expect(events[1]?.target).toBe(element);
    expect(events[1]?.detail).toEqual({
      collection: { id: otherCollection.id, handle: "pants", productsCount: 4 },
    });
  });
});
