// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { renderToString } from "vue/server-renderer";

import type * as StandardEventsModule from "../../vendor/standard-events";
import {
  defineViewEventElement,
  VIEW_EVENT_TAG_NAME,
} from "../core/shopify-scripts/view-event-element";
import { ProductView } from "./product-view";

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
    document.body.innerHTML = "";
  });

  it("renders the element with the view attributes, slot content, and attributes", () => {
    const wrapper = mount(ProductView, {
      props: { product, context: "search" },
      attrs: { class: "card", id: "card-1" },
      slots: { default: () => h("span", "Shirt") },
      attachTo: document.body,
    });

    const element = wrapper.find(VIEW_EVENT_TAG_NAME).element;
    expect(element.getAttribute("class")).toBe("card");
    expect(element.id).toBe("card-1");
    expect(element.getAttribute("view-event-trigger")).toBe("intersect");
    expect(element.getAttribute("view-event-key")).toBe(product.id);
    expect(payloadOf(element)).toMatchObject({ context: "search", product: { id: product.id } });
    expect(element.textContent).toBe("Shirt");
  });

  it("renders the element and payload on the server", async () => {
    const html = await renderToString(h(ProductView, { product, context: "page", class: "pdp" }));

    expect(html).toContain(`<${VIEW_EVENT_TAG_NAME}`);
    expect(html).toContain('class="pdp"');
    expect(html).toContain('view-event-trigger="connect"');
    expect(html).toContain('view-event-key="gid://shopify/Product/1"');
  });

  it("lets the element send the event again only when the product ID changes", async () => {
    const events: CustomEvent[] = [];
    const listener = (event: Event) => events.push(event as CustomEvent);
    document.addEventListener("shopify:product:view", listener);

    const wrapper = mount(ProductView, {
      props: { product, context: "page" },
      attachTo: document.body,
    });
    await vi.waitFor(() => expect(events).toHaveLength(1));
    const element = wrapper.find(VIEW_EVENT_TAG_NAME).element;

    await wrapper.setProps({
      product: {
        ...product,
        selectedOrFirstAvailableVariant: { ...variant, id: "gid://shopify/ProductVariant/2" },
      },
    });
    expect(events).toHaveLength(1);

    await wrapper.setProps({ product: otherProduct });
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.removeEventListener("shopify:product:view", listener);

    expect(events).toHaveLength(2);
    expect(wrapper.find(VIEW_EVENT_TAG_NAME).element).toBe(element);
    expect(events[1]?.target).toBe(element);
    expect(events[1]?.detail).toMatchObject({ product: { id: otherProduct.id, handle: "pants" } });
  });
});
