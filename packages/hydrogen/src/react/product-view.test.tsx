// @vitest-environment happy-dom
import { act, render } from "@testing-library/react";
import { Activity, type ActivityProps, createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../vendor/standard-events";
import {
  defineViewEventElement,
  VIEW_EVENT_TAG_NAME,
} from "../core/shopify-scripts/view-event-element";
import { assert } from "../core/test-utils";
import { ProductView, type ProductViewProps } from "./product-view";

vi.mock("../core/shopify-scripts/standard-events", () => ({
  importStandardEventsFromCDN: () =>
    Promise.resolve({
      createViewEventElement: () => FakeViewEventElement,
    } as Partial<typeof StandardEventsModule>),
}));

const connected: Element[] = [];

// Mirrors the CDN element: `connect` sends the event after connecting, `manual` sends only on
// `dispatchViewEvent()`, and each send re-reads the payload. It records each connect.
class FakeViewEventElement extends HTMLElement {
  connectedCallback() {
    connected.push(this);
    if (this.getAttribute("view-event-trigger") === "connect") {
      setTimeout(() => this.dispatchViewEvent());
    }
  }

  dispatchViewEvent() {
    if (!this.isConnected) return;
    const detail = JSON.parse(this.getAttribute("view-event-payload") ?? "{}");
    this.dispatchEvent(new CustomEvent("shopify:product:view", { bubbles: true, detail }));
  }
}

const variant = {
  id: "gid://shopify/ProductVariant/1",
  title: "Red",
  availableForSale: true,
  price: { amount: "10.0", currencyCode: "USD" },
  selectedOptions: [{ name: "Color", value: "Red" }],
};
const product = {
  id: "gid://shopify/Product/1",
  title: "Shirt",
  handle: "shirt",
  selectedOrFirstAvailableVariant: variant,
};
const otherVariantProduct = {
  ...product,
  selectedOrFirstAvailableVariant: { ...variant, id: "gid://shopify/ProductVariant/2" },
};
const otherProduct = { ...product, id: "gid://shopify/Product/2", handle: "pants" };

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function getElement(container: HTMLElement) {
  const element = container.querySelector(VIEW_EVENT_TAG_NAME);
  assert(element, "expected a product view element");
  return element;
}

function payloadOf(element: Element) {
  return JSON.parse(element.getAttribute("view-event-payload") ?? "null");
}

describe("ProductView", () => {
  let events: CustomEvent[];
  const record = (event: Event) => events.push(event as CustomEvent);

  beforeAll(async () => {
    defineViewEventElement();
    await customElements.whenDefined(VIEW_EVENT_TAG_NAME);
  });

  beforeEach(() => {
    events = [];
    connected.length = 0;
    document.addEventListener("shopify:product:view", record);
  });

  afterEach(() => {
    document.removeEventListener("shopify:product:view", record);
    vi.restoreAllMocks();
  });

  it("renders the element with the view attributes, children, and HTML attributes", () => {
    const { container } = render(
      createElement(
        ProductView,
        {
          product,
          context: "collection",
          className: "card",
          id: "card-1",
          "data-testid": "x",
        } as ProductViewProps,
        createElement("span", null, "Shirt"),
      ),
    );

    const element = getElement(container);
    expect(element.getAttribute("class")).toBe("card");
    expect(element.id).toBe("card-1");
    expect(element.getAttribute("data-testid")).toBe("x");
    expect(element.getAttribute("view-event-trigger")).toBe("intersect");
    expect(payloadOf(element)).toMatchObject({
      context: "collection",
      product: { id: product.id },
    });
    expect(element.textContent).toBe("Shirt");
  });

  it("updates and removes the class when className changes", () => {
    const { container, rerender } = render(
      createElement(ProductView, { product, context: "collection", className: "card" }),
    );
    const element = getElement(container);

    rerender(createElement(ProductView, { product, context: "collection", className: "tile" }));
    expect(element.getAttribute("class")).toBe("tile");

    rerender(createElement(ProductView, { product, context: "collection" }));
    expect(element.hasAttribute("class")).toBe(false);
  });

  it("renders a manual page element and its payload on the server", () => {
    const html = renderToString(
      createElement(ProductView, { product, context: "page", className: "pdp" }),
    );

    expect(html).toContain(`<${VIEW_EVENT_TAG_NAME}`);
    expect(html).toContain('class="pdp"');
    expect(html).toContain('view-event-trigger="manual"');
    expect(html).toContain("view-event-payload=");
  });

  it("sends the page view once on mount, again for a new product ID, and not for a new variant", async () => {
    const { container, rerender } = render(
      createElement(ProductView, { product, context: "page" }),
    );
    await settle();
    expect(events).toHaveLength(1);
    const element = getElement(container);
    expect(element.getAttribute("view-event-trigger")).toBe("manual");

    rerender(createElement(ProductView, { product: otherVariantProduct, context: "page" }));
    await settle();
    expect(events).toHaveLength(1);

    rerender(createElement(ProductView, { product: otherProduct, context: "page" }));
    await settle();

    expect(events).toHaveLength(2);
    expect(getElement(container)).toBe(element);
    expect(events[1]?.target).toBe(element);
    expect(events[1]?.detail).toMatchObject({ product: { id: otherProduct.id, handle: "pants" } });
  });

  it("sends the page view once in StrictMode", async () => {
    render(
      createElement(StrictMode, null, createElement(ProductView, { product, context: "page" })),
    );
    await settle();

    expect(events).toHaveLength(1);
  });

  it("sends the page view only while an <Activity> shows it, and again each time it is shown", async () => {
    const view = (mode: "hidden" | "visible") =>
      createElement(
        Activity,
        { mode } as ActivityProps,
        createElement(ProductView, { product, context: "page" }),
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

  it("remounts a card element for a new product ID, but not for a new variant", () => {
    const { container, rerender } = render(
      createElement(ProductView, { product, context: "collection", className: "card" }),
    );
    const element = getElement(container);
    expect(element.getAttribute("view-event-trigger")).toBe("intersect");
    expect(connected).toEqual([element]);

    rerender(
      createElement(ProductView, {
        product: otherVariantProduct,
        context: "collection",
        className: "card",
      }),
    );
    expect(getElement(container)).toBe(element);
    expect(connected).toEqual([element]);

    rerender(
      createElement(ProductView, {
        product: otherProduct,
        context: "collection",
        className: "card",
      }),
    );
    const next = getElement(container);
    expect(next).not.toBe(element);
    expect(connected).toEqual([element, next]);
    expect(next.getAttribute("class")).toBe("card");
    expect(payloadOf(next)).toMatchObject({ product: { id: otherProduct.id } });
  });
});
