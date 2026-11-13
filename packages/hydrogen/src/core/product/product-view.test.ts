// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../../vendor/standard-events";
import type { CartStore } from "../cart/cart";
import { EMPTY_CART_STATE } from "../cart/state";
import { importStandardEventsFromCDN } from "../shopify-scripts/standard-events";
import { createProductFormStore } from "./product-form";
import type { ProductInput, ProductVariantInput } from "./state";

vi.mock("../shopify-scripts/standard-events", () => ({
  importStandardEventsFromCDN: vi.fn(),
}));

class TestProductViewEvent extends Event {
  payload: StandardEventsModule.ProductViewPayload;

  constructor(payload: StandardEventsModule.ProductViewPayload) {
    super("shopify:product:view", { bubbles: true });
    this.payload = payload;
  }
}

const importStandardEvents = vi.mocked(importStandardEventsFromCDN);
const cartStore = {
  getState: () => EMPTY_CART_STATE,
  subscribe: () => () => {},
} as unknown as CartStore;

function makeVariant(id: string, color: string): ProductVariantInput & { sku: string } {
  return {
    id,
    title: color,
    availableForSale: true,
    selectedOptions: [{ name: "Color", value: color }],
    price: { amount: "10.00", currencyCode: "USD" },
    sku: `sku-${color}`,
  };
}

function makeProduct(id: string, handle: string, variant = makeVariant(`${id}-red`, "Red")) {
  const blue = makeVariant(`${id}-blue`, "Blue");
  return {
    id,
    title: handle.toUpperCase(),
    handle,
    options: [
      {
        name: "Color",
        optionValues: [
          { name: "Red", firstSelectableVariant: makeVariant(`${id}-red`, "Red") },
          { name: "Blue", firstSelectableVariant: blue },
        ],
      },
    ],
    selectedOrFirstAvailableVariant: variant,
    adjacentVariants: [],
  } satisfies ProductInput;
}

let views: TestProductViewEvent[];

function collectView(event: Event) {
  views.push(event as TestProductViewEvent);
}

async function flushViews() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe("shopify:product:view", () => {
  beforeEach(() => {
    views = [];
    importStandardEvents.mockReset();
    importStandardEvents.mockResolvedValue({
      ProductViewEvent: TestProductViewEvent,
    } as unknown as typeof StandardEventsModule);
    document.addEventListener("shopify:product:view", collectView);
  });

  afterEach(() => {
    document.removeEventListener("shopify:product:view", collectView);
    vi.unstubAllGlobals();
  });

  it("dispatches one page view with the product and selected variant when the store connects", async () => {
    createProductFormStore(makeProduct("p1", "shirt"), cartStore);
    await flushViews();

    expect(views).toHaveLength(1);
    expect(views[0]?.payload).toEqual({
      context: "page",
      selectedOptions: [{ name: "Color", value: "Red" }],
      product: {
        id: "p1",
        title: "SHIRT",
        handle: "shirt",
        selectedVariant: {
          id: "p1-red",
          title: "Red",
          availableForSale: true,
          price: { amount: "10.00", currencyCode: "USD" },
          selectedOptions: [{ name: "Color", value: "Red" }],
        },
      },
    });
  });

  it("sends a null selected variant when no variant is selected", async () => {
    const product = { ...makeProduct("p1", "shirt"), selectedOrFirstAvailableVariant: null };
    createProductFormStore(product, cartStore);
    await flushViews();

    expect(views[0]?.payload.product.selectedVariant).toBeNull();
    expect(views[0]?.payload.selectedOptions).toEqual([]);
  });

  it("does not dispatch on the server", async () => {
    vi.stubGlobal("document", undefined);
    createProductFormStore(makeProduct("p1", "shirt"), cartStore);
    vi.unstubAllGlobals();
    await flushViews();

    expect(importStandardEvents).not.toHaveBeenCalled();
    expect(views).toHaveLength(0);
  });

  it("does not dispatch again on reconnect, same-product hydrate, or variant change", async () => {
    const product = makeProduct("p1", "shirt");
    const store = createProductFormStore(product, cartStore);
    await flushViews();

    // React Strict Mode effects: connect, destroy, connect.
    store.connect();
    store.destroy();
    store.connect();
    store.hydrate(product);
    store.selectOption("Color", "Blue");
    store.hydrate(makeProduct("p1", "shirt", makeVariant("p1-blue", "Blue")));
    await flushViews();

    expect(views).toHaveLength(1);
  });

  it("dispatches once when a double render creates two stores for the same product", async () => {
    createProductFormStore(makeProduct("p1", "shirt"), cartStore);
    createProductFormStore(makeProduct("p1", "shirt"), cartStore);
    await flushViews();

    expect(views).toHaveLength(1);
  });

  it("dispatches again when the store is hydrated with a different product", async () => {
    const store = createProductFormStore(makeProduct("p1", "shirt"), cartStore);
    await flushViews();
    store.hydrate(makeProduct("p2", "hat"));
    await flushViews();
    store.hydrate(makeProduct("p1", "shirt"));
    await flushViews();

    expect(views.map((view) => view.payload.product.handle)).toEqual(["shirt", "hat", "shirt"]);
  });

  it("fails silently when the standard events module can't load", async () => {
    importStandardEvents.mockRejectedValue(new Error("offline"));
    const store = createProductFormStore(makeProduct("p1", "shirt"), cartStore);
    await flushViews();

    expect(views).toHaveLength(0);
    expect(store.getState().selectedVariant?.id).toBe("p1-red");

    importStandardEvents.mockResolvedValue({
      ProductViewEvent: TestProductViewEvent,
    } as unknown as typeof StandardEventsModule);
    store.hydrate(makeProduct("p2", "hat"));
    await flushViews();

    expect(views.map((view) => view.payload.product.handle)).toEqual(["hat"]);
  });
});
