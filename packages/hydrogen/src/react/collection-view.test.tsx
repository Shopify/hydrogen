// @vitest-environment happy-dom
import { act, render } from "@testing-library/react";
import { createElement, StrictMode, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { CollectionActions } from "../core/collection";
import {
  defineViewEventElement,
  VIEW_EVENT_TAG_NAME,
} from "../core/shopify-scripts/view-event-element";
import { assert } from "../core/test-utils";
import { CollectionProvider, useCollectionActions } from "./collection";
import { CollectionView, type CollectionViewProps } from "./collection-view";

vi.mock("../core/shopify-scripts/standard-events", async () => {
  const { fakeStandardEvents } = await import("../core/collection/__tests__/fake-standard-events");
  return {
    importStandardEventsFromCDN: () =>
      Promise.resolve({
        ...fakeStandardEvents,
        createViewEventElement: () => FakeViewEventElement,
      }),
  };
});

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

function inProvider(children: ReactNode, handle = "shirts", urlSearch = "", dataSearch = "") {
  return createElement(
    CollectionProvider,
    { data: { handle, dataSearch }, urlSearch, onChange: () => {} },
    children,
  );
}

function view(props: CollectionViewProps, children?: ReactNode) {
  return inProvider(createElement(CollectionView, props, children), props.collection.handle);
}

function getElement(container: HTMLElement) {
  const element = container.querySelector(VIEW_EVENT_TAG_NAME);
  assert(element, "expected a collection view element");
  return element;
}

function payloadOf(element: Element) {
  return JSON.parse(element.getAttribute("view-event-payload") ?? "null");
}

describe("CollectionView", () => {
  beforeAll(async () => {
    defineViewEventElement();
    await customElements.whenDefined(VIEW_EVENT_TAG_NAME);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the element with the view attributes, children, and HTML attributes", () => {
    const { container } = render(
      view(
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
    expect(element.getAttribute("view-event-key")).toBe("shirts");
    expect(payloadOf(element)).toEqual({
      collection: { id: collection.id, handle: "shirts", productsCount: 8 },
    });
    expect(element.textContent).toBe("Products");
  });

  it("passes className as class before React renders the custom element", () => {
    vi.mocked(createElement).mockClear();
    render(view({ collection, productsCount: 8, className: "grid" }));

    const props = vi
      .mocked(createElement)
      .mock.calls.find(([type]) => type === VIEW_EVENT_TAG_NAME)?.[1];
    expect(props).toMatchObject({ class: "grid" });
    expect(props).not.toHaveProperty("className");
  });

  it("renders the element and payload on the server", () => {
    const html = renderToString(view({ collection, productsCount: 8, className: "grid" }));

    expect(html).toContain(`<${VIEW_EVENT_TAG_NAME}`);
    expect(html).toContain('class="grid"');
    expect(html).toContain('view-event-trigger="connect"');
    expect(html).toContain('view-event-key="shirts"');
    expect(html).toContain("view-event-payload=");
    expect(html).toContain("gid://shopify/Collection/1");
  });

  it("lets the element send the event again only when the collection handle changes", async () => {
    const events: CustomEvent[] = [];
    const listener = (event: Event) => events.push(event as CustomEvent);
    document.addEventListener("shopify:collection:view", listener);
    const strictView = (props: CollectionViewProps) => createElement(StrictMode, null, view(props));

    const { container, rerender } = render(strictView({ collection, productsCount: 8 }));
    await vi.waitFor(() => expect(events).toHaveLength(1));
    const element = getElement(container);

    rerender(strictView({ collection: { ...collection }, productsCount: 16 }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toHaveLength(1);
    expect(payloadOf(element).collection.productsCount).toBe(16);

    rerender(strictView({ collection: otherCollection, productsCount: 4 }));
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

type UpdateEvent = Event & {
  collection: { productsCount: number };
  promise: Promise<{ productsCount: number }>;
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

function page(urlSearch: string, dataSearch: string, productsCount: number) {
  return inProvider(
    createElement(CollectionView, { collection, productsCount }, createElement(Controls)),
    "shirts",
    urlSearch,
    dataSearch,
  );
}

describe("CollectionView updates", () => {
  const events: UpdateEvent[] = [];
  const record = (event: Event) => events.push(event as UpdateEvent);
  const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

  beforeAll(async () => {
    defineViewEventElement();
    await customElements.whenDefined(VIEW_EVENT_TAG_NAME);
  });

  afterEach(() => {
    document.removeEventListener("shopify:collection:update", record);
    events.length = 0;
    actions = undefined;
    vi.restoreAllMocks();
  });

  it("throws outside a CollectionProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(createElement(CollectionView, { collection, productsCount: 1 }))).toThrow(
      "CollectionView must be used inside a <CollectionProvider>.",
    );
  });

  it("sends an update from the element for a sort change and resolves with the new count", async () => {
    document.addEventListener("shopify:collection:update", record);
    const { container, rerender } = render(page("", "", 8));
    await flush();

    act(() => getActions().setSortKey("PRICE"));

    expect(events.map((event) => event.collection.productsCount)).toEqual([8]);
    const event = events[0];
    assert(event, "expected an update event");
    expect(event.target).toBe(getElement(container));

    // The router moves to the new URL first, then the loader data arrives.
    rerender(page("sort_by=price-ascending", "", 8));
    rerender(page("sort_by=price-ascending", "sort_by=price-ascending", 3));

    await expect(event.promise).resolves.toEqual({ productsCount: 3 });
  });

  it("resolves both updates when a filter is turned on and off before the URL changes", async () => {
    document.addEventListener("shopify:collection:update", record);
    render(page("", "", 8));
    await flush();

    act(() => getActions().toggleFilter({ available: true }));
    act(() => getActions().toggleFilter({ available: true }));

    expect(events).toHaveLength(2);
    await expect(Promise.all(events.map((event) => event.promise))).resolves.toEqual([
      { productsCount: 8 },
      { productsCount: 8 },
    ]);
  });

  it("rejects a pending update with an AbortError on unmount", async () => {
    document.addEventListener("shopify:collection:update", record);
    const { unmount } = render(page("", "", 8));
    await flush();

    act(() => getActions().setSortKey("PRICE"));
    unmount();

    const event = events[0];
    assert(event, "expected an update event");
    await expect(event.promise).rejects.toMatchObject({ name: "AbortError" });
  });
});
