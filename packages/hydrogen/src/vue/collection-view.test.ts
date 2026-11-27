// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { renderToString } from "vue/server-renderer";

import type * as StandardEventsModule from "../../vendor/standard-events";
import type { ViewEventElement } from "../../vendor/standard-events";
import {
  defineViewEventElement,
  VIEW_EVENT_TAG_NAME,
} from "../core/shopify-scripts/view-event-element";
import { CollectionView } from "./collection-view";

vi.mock("../core/shopify-scripts/standard-events", () => ({
  importStandardEventsFromCDN: () =>
    Promise.resolve({
      createViewEventElement: () => FakeViewEventElement,
    } as Partial<typeof StandardEventsModule>),
}));

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
    document.body.innerHTML = "";
  });

  it("renders the element with the view attributes, slot content, and attributes", () => {
    const wrapper = mount(CollectionView, {
      props: { collection, productsCount: 8 },
      attrs: { class: "grid", id: "results" },
      slots: { default: () => h("span", "Products") },
      attachTo: document.body,
    });

    const element = wrapper.find(VIEW_EVENT_TAG_NAME).element;
    expect(element.getAttribute("class")).toBe("grid");
    expect(element.id).toBe("results");
    expect(element.getAttribute("view-event-trigger")).toBe("connect");
    expect(payloadOf(element)).toEqual({
      collection: { id: collection.id, handle: "shirts", productsCount: 8 },
    });
    expect(element.textContent).toBe("Products");
  });

  it("renders the element and payload on the server", async () => {
    const html = await renderToString(
      h(CollectionView, { collection, productsCount: 8, class: "grid" }),
    );

    expect(html).toContain(`<${VIEW_EVENT_TAG_NAME}`);
    expect(html).toContain('class="grid"');
    expect(html).toContain('view-event-trigger="connect"');
    expect(html).toContain("gid://shopify/Collection/1");
  });

  it("remounts the element for a new handle, but not for a new productsCount", async () => {
    const events: CustomEvent[] = [];
    const listener = (event: Event) => events.push(event as CustomEvent);
    document.addEventListener("shopify:collection:view", listener);

    const wrapper = mount(CollectionView, {
      props: { collection, productsCount: 8 },
      attrs: { class: "grid" },
      attachTo: document.body,
    });
    await vi.waitFor(() => expect(events).toHaveLength(1));
    const element = wrapper.find(VIEW_EVENT_TAG_NAME).element;

    await wrapper.setProps({ collection: { ...collection }, productsCount: 16 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(wrapper.find(VIEW_EVENT_TAG_NAME).element).toBe(element);
    expect(events).toHaveLength(1);
    expect(payloadOf(element).collection.productsCount).toBe(16);

    await wrapper.setProps({ collection: otherCollection, productsCount: 4 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.removeEventListener("shopify:collection:view", listener);

    const next = wrapper.find(VIEW_EVENT_TAG_NAME).element;
    expect(next).not.toBe(element);
    expect(next.getAttribute("class")).toBe("grid");
    expect(events).toHaveLength(2);
    expect(events[1]?.target).toBe(next);
    expect(events[1]?.detail).toEqual({
      collection: { id: otherCollection.id, handle: "pants", productsCount: 4 },
    });
  });

  it("remounts the element with the intersect trigger for a new handle", async () => {
    const wrapper = mount(CollectionView, {
      props: { collection, productsCount: 8, trigger: "intersect" },
      attachTo: document.body,
    });
    const element = wrapper.find(VIEW_EVENT_TAG_NAME).element;
    expect(element.getAttribute("view-event-trigger")).toBe("intersect");
    expect(element.hasAttribute("trigger")).toBe(false);

    await wrapper.setProps({ collection: otherCollection, productsCount: 4 });

    expect(wrapper.find(VIEW_EVENT_TAG_NAME).element).not.toBe(element);
  });

  it("sends nothing by itself with the manual trigger, and $el sends the view", async () => {
    const events: CustomEvent[] = [];
    const listener = (event: Event) => events.push(event as CustomEvent);
    document.addEventListener("shopify:collection:view", listener);

    const wrapper = mount(CollectionView, {
      props: { collection, productsCount: 8, trigger: "manual" },
      attachTo: document.body,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(wrapper.vm.$el.getAttribute("view-event-trigger")).toBe("manual");
    expect(events).toHaveLength(0);

    (wrapper.vm.$el as HTMLElement & ViewEventElement).dispatchViewEvent();
    document.removeEventListener("shopify:collection:view", listener);
    expect(events).toHaveLength(1);
  });
});
