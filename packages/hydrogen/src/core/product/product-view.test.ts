// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type * as StandardEventsModule from "../../../vendor/standard-events";
import {
  defineProductView,
  getProductViewAttributes,
  PRODUCT_VIEW_TAG_NAME,
  type ProductViewOptions,
  type ProductViewProduct,
} from "./product-view";
import type { ProductInput } from "./state";

const importStandardEventsFromCDN = vi.hoisted(() => vi.fn());
vi.mock("../shopify-scripts/standard-events", () => ({ importStandardEventsFromCDN }));

const variant = {
  id: "gid://shopify/ProductVariant/1",
  title: "Red / Small",
  availableForSale: true,
  price: { amount: "10.0", currencyCode: "USD", extra: "drop" },
  compareAtPrice: { amount: "12.0", currencyCode: "USD" },
  sku: "SKU-1",
  selectedOptions: [
    { name: "Color", value: "Red" },
    { name: "Size", value: "Small" },
  ],
};

const product = {
  id: "gid://shopify/Product/1",
  title: "Shirt",
  handle: "shirt",
  vendor: "Hydrogen",
  options: [],
  adjacentVariants: [],
  selectedOrFirstAvailableVariant: variant,
};

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

function payload(options: ProductViewOptions) {
  return JSON.parse(getProductViewAttributes(options)["view-event-payload"]);
}

describe("getProductViewAttributes", () => {
  it("accepts the product form input", () => {
    expectTypeOf<ProductInput>().toMatchTypeOf<ProductViewProduct>();
  });

  it("maps the selected variant for the product page and drops extra fields", () => {
    expect(payload({ product, context: "page" })).toEqual({
      context: "page",
      selectedOptions: variant.selectedOptions,
      product: {
        id: product.id,
        title: product.title,
        handle: product.handle,
        selectedVariant: {
          id: variant.id,
          title: variant.title,
          availableForSale: true,
          price: { amount: "10.0", currencyCode: "USD" },
          selectedOptions: variant.selectedOptions,
        },
      },
    });
  });

  it("keeps the variant for dialogs", () => {
    expect(payload({ product, context: "dialog" }).product.selectedVariant.id).toBe(variant.id);
  });

  it.each(["collection", "search", "recommendation"] as const)(
    "sends no variant for %s cards",
    (context) => {
      expect(
        payload({
          product: { id: product.id, title: product.title, handle: product.handle },
          context,
        }),
      ).toEqual({
        context,
        selectedOptions: [],
        product: {
          id: product.id,
          title: product.title,
          handle: product.handle,
          selectedVariant: null,
        },
      });
    },
  );

  it("sends no variant when the product has none", () => {
    const { selectedOptions, product: payloadProduct } = payload({
      product: { ...product, selectedOrFirstAvailableVariant: null },
      context: "page",
    });
    expect(selectedOptions).toEqual([]);
    expect(payloadProduct.selectedVariant).toBeNull();
  });

  it.each([
    ["page", "connect"],
    ["dialog", "dialog"],
    ["collection", "intersect"],
    ["search", "intersect"],
    ["recommendation", "intersect"],
  ] as const)("maps the %s context to the %s trigger", (context, trigger) => {
    expect(getProductViewAttributes({ product, context })["view-event-trigger"]).toBe(trigger);
  });
});

describe("defineProductView", () => {
  class FakeViewEventElement extends HTMLElement {
    connectedCallback() {
      if (this.getAttribute("view-event-trigger") === "connect") {
        setTimeout(() => this.dispatchViewEvent());
      }
    }

    dispatchViewEvent() {
      if (!this.isConnected) return;
      const detail: unknown = JSON.parse(this.getAttribute("view-event-payload") ?? "{}");
      this.dispatchEvent(new CustomEvent("shopify:product:view", { bubbles: true, detail }));
    }
  }

  let events: CustomEvent[];
  const record = (event: Event) => events.push(event as CustomEvent);

  beforeEach(async () => {
    events = [];
    document.addEventListener("shopify:product:view", record);
    if (!customElements.get(PRODUCT_VIEW_TAG_NAME)) {
      importStandardEventsFromCDN.mockResolvedValue({
        createViewEventElement: () => FakeViewEventElement,
      } as Partial<typeof StandardEventsModule>);
      defineProductView();
      await customElements.whenDefined(PRODUCT_VIEW_TAG_NAME);
    }
  });

  afterEach(() => {
    document.removeEventListener("shopify:product:view", record);
    document.body.innerHTML = "";
  });

  it("keys re-sends on product.id so variant changes don't re-send and a new product does", async () => {
    const element = document.createElement(PRODUCT_VIEW_TAG_NAME);
    for (const [name, value] of Object.entries(
      getProductViewAttributes({ product, context: "page" }),
    )) {
      element.setAttribute(name, value);
    }
    document.body.append(element);
    await nextTask();
    expect(events).toHaveLength(1);

    element.setAttribute(
      "view-event-payload",
      getProductViewAttributes({
        product: {
          ...product,
          selectedOrFirstAvailableVariant: { ...variant, id: "gid://shopify/ProductVariant/2" },
        },
        context: "page",
      })["view-event-payload"],
    );
    expect(events).toHaveLength(1);

    const otherProduct = { ...product, id: "gid://shopify/Product/2", handle: "pants" };
    element.setAttribute(
      "view-event-payload",
      getProductViewAttributes({ product: otherProduct, context: "page" })["view-event-payload"],
    );
    expect(events).toHaveLength(2);
    expect(events[1]?.target).toBe(element);
    expect(events[1]?.detail).toMatchObject({ product: { id: otherProduct.id, handle: "pants" } });
  });
});
