// @vitest-environment happy-dom
import { act, render } from "@testing-library/react";
import { Activity, type ActivityProps, createElement, createRef, StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../vendor/standard-events";
import type { ViewEventElement } from "../../vendor/standard-events";
import {
  defineViewEventElement,
  VIEW_EVENT_TAG_NAME,
} from "../core/shopify-scripts/view-event-element";
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

// Mirrors the CDN element: `connect` sends the event after connecting, `manual` sends only on
// `dispatchViewEvent()`, and each send re-reads the payload.
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

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

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

  let events: CustomEvent[];
  const record = (event: Event) => events.push(event as CustomEvent);

  beforeEach(() => {
    events = [];
    document.addEventListener("shopify:collection:view", record);
  });

  afterEach(() => {
    document.removeEventListener("shopify:collection:view", record);
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
    expect(element.getAttribute("view-event-trigger")).toBe("manual");
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
      .mock.calls.find(([type]) => type === VIEW_EVENT_TAG_NAME)?.[1];
    expect(props).toMatchObject({ class: "grid" });
    expect(props).not.toHaveProperty("className");
  });

  it("renders a manual element and its payload on the server", () => {
    const html = renderToString(
      createElement(CollectionView, { collection, productsCount: 8, className: "grid" }),
    );

    expect(html).toContain(`<${VIEW_EVENT_TAG_NAME}`);
    expect(html).toContain('class="grid"');
    expect(html).toContain('view-event-trigger="manual"');
    expect(html).toContain("view-event-payload=");
    expect(html).toContain("gid://shopify/Collection/1");
  });

  it("sends the view once on mount, again for a new handle, and not for a new productsCount", async () => {
    const { container, rerender } = render(
      createElement(CollectionView, { collection, productsCount: 8 }),
    );
    await settle();
    expect(events).toHaveLength(1);
    const element = getElement(container);

    rerender(createElement(CollectionView, { collection: { ...collection }, productsCount: 16 }));
    await settle();
    expect(events).toHaveLength(1);
    expect(payloadOf(element).collection.productsCount).toBe(16);

    rerender(createElement(CollectionView, { collection: otherCollection, productsCount: 4 }));
    await settle();

    expect(events).toHaveLength(2);
    expect(getElement(container)).toBe(element);
    expect(events[1]?.target).toBe(element);
    expect(events[1]?.detail).toEqual({
      collection: { id: otherCollection.id, handle: "pants", productsCount: 4 },
    });
  });

  it("sends the view once in StrictMode", async () => {
    render(
      createElement(
        StrictMode,
        null,
        createElement(CollectionView, { collection, productsCount: 8 }),
      ),
    );
    await settle();

    expect(events).toHaveLength(1);
  });

  it("sends the view only while an <Activity> shows it, and again each time it is shown", async () => {
    const view = (mode: "hidden" | "visible") =>
      createElement(
        Activity,
        { mode } as ActivityProps,
        createElement(CollectionView, { collection, productsCount: 8 }),
      );

    const { rerender } = render(view("hidden"));
    await settle();
    expect(events).toHaveLength(0);

    rerender(view("visible"));
    await settle();
    expect(events).toHaveLength(1);

    rerender(view("hidden"));
    await settle();
    expect(events).toHaveLength(1);

    rerender(view("visible"));
    await settle();
    expect(events).toHaveLength(2);
  });

  it("remounts the element with the intersect trigger for a new handle", () => {
    const { container, rerender } = render(
      createElement(CollectionView, { collection, productsCount: 8, trigger: "intersect" }),
    );
    const element = getElement(container);
    expect(element.getAttribute("view-event-trigger")).toBe("intersect");

    rerender(
      createElement(CollectionView, {
        collection: otherCollection,
        productsCount: 4,
        trigger: "intersect",
      }),
    );

    expect(getElement(container)).not.toBe(element);
  });

  it("sends nothing by itself with the manual trigger, and elementRef sends the view", async () => {
    const elementRef = createRef<HTMLElement & ViewEventElement>();
    const { container } = render(
      createElement(CollectionView, {
        collection,
        productsCount: 8,
        trigger: "manual",
        elementRef,
      }),
    );
    await settle();
    const element = getElement(container);
    expect(element.getAttribute("view-event-trigger")).toBe("manual");
    expect(events).toHaveLength(0);

    assert(elementRef.current, "expected elementRef to hold the element");
    expect(elementRef.current).toBe(element);
    elementRef.current.dispatchViewEvent();
    expect(events).toHaveLength(1);
  });
});
