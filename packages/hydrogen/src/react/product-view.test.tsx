// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

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
const otherProduct = { ...product, id: "gid://shopify/Product/2", handle: "pants" };

function getElement(container: HTMLElement) {
  const element = container.querySelector(VIEW_EVENT_TAG_NAME);
  assert(element, "expected a product view element");
  return element;
}

function payloadOf(element: Element) {
  return JSON.parse(element.getAttribute("view-event-payload") ?? "null");
}

describe("ProductView", () => {
  beforeAll(async () => {
    defineViewEventElement();
    await customElements.whenDefined(VIEW_EVENT_TAG_NAME);
  });

  afterEach(() => {
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
    expect(element.getAttribute("view-event-key")).toBe(product.id);
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

  it("renders the element and payload on the server", () => {
    const html = renderToString(
      createElement(ProductView, { product, context: "page", className: "pdp" }),
    );

    expect(html).toContain(`<${VIEW_EVENT_TAG_NAME}`);
    expect(html).toContain('class="pdp"');
    expect(html).toContain('view-event-trigger="connect"');
    expect(html).toContain('view-event-key="gid://shopify/Product/1"');
    expect(html).toContain("view-event-payload=");
  });

  it("lets the element send the event again only when the product ID changes", async () => {
    const events: CustomEvent[] = [];
    const listener = (event: Event) => events.push(event as CustomEvent);
    document.addEventListener("shopify:product:view", listener);
    const view = (props: ProductViewProps) =>
      createElement(StrictMode, null, createElement(ProductView, props));

    const { container, rerender } = render(view({ product, context: "page" }));
    await vi.waitFor(() => expect(events).toHaveLength(1));
    const element = getElement(container);

    rerender(
      view({
        product: {
          ...product,
          selectedOrFirstAvailableVariant: { ...variant, id: "gid://shopify/ProductVariant/2" },
        },
        context: "page",
      }),
    );
    expect(events).toHaveLength(1);

    rerender(view({ product: otherProduct, context: "page" }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.removeEventListener("shopify:product:view", listener);

    expect(events).toHaveLength(2);
    expect(getElement(container)).toBe(element);
    expect(events[1]?.target).toBe(element);
    expect(events[1]?.detail).toMatchObject({ product: { id: otherProduct.id, handle: "pants" } });
  });
});
