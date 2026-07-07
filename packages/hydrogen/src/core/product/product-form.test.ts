import { describe, it, expect, vi } from "vitest";

import type { CartStore } from "../cart/cart";
import {
  createEmptyCartErrors,
  EMPTY_CART_DATA,
  EMPTY_CART_STATE,
  type CartData,
  type CartLine,
  type CartState,
} from "../cart/state";
import { createObservable } from "../observable";
import {
  canAddToCart,
  createProductFormStore,
  findCartLineByMerchandiseId,
  getSelectedVariant,
} from "./product-form";
import type { ProductInput, ProductVariantInput } from "./state";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeVariant(
  overrides: Partial<ProductVariantInput> & {
    selectedOptions: ProductVariantInput["selectedOptions"];
  },
): ProductVariantInput {
  return {
    id: "gid://shopify/ProductVariant/1",
    title: "Default",
    availableForSale: true,
    price: { amount: "10.00", currencyCode: "USD" },
    ...overrides,
  };
}

const RED = makeVariant({
  id: "v-red",
  title: "Red",
  availableForSale: true,
  selectedOptions: [{ name: "Color", value: "Red" }],
  product: { handle: "shirt" },
});

const BLUE = makeVariant({
  id: "v-blue",
  title: "Blue",
  availableForSale: false,
  selectedOptions: [{ name: "Color", value: "Blue" }],
  product: { handle: "shirt" },
});

function makeSingleOptionProduct(
  selectedOrFirstAvailableVariant: ProductVariantInput | null = RED,
): ProductInput {
  return {
    id: "gid://shopify/Product/1",
    title: "Shirt",
    handle: "shirt",
    options: [
      {
        name: "Color",
        optionValues: [
          { name: "Red", firstSelectableVariant: RED },
          { name: "Blue", firstSelectableVariant: BLUE },
        ],
      },
    ],
    selectedOrFirstAvailableVariant,
    adjacentVariants: [],
  };
}

const SMALL_RED = makeVariant({
  id: "v-small-red",
  title: "Small / Red",
  availableForSale: true,
  selectedOptions: [
    { name: "Size", value: "Small" },
    { name: "Color", value: "Red" },
  ],
  product: { handle: "hoodie" },
});

const LARGE_RED = makeVariant({
  id: "v-large-red",
  title: "Large / Red",
  availableForSale: true,
  selectedOptions: [
    { name: "Size", value: "Large" },
    { name: "Color", value: "Red" },
  ],
  product: { handle: "hoodie" },
});

const SMALL_BLUE = makeVariant({
  id: "v-small-blue",
  title: "Small / Blue",
  availableForSale: false,
  selectedOptions: [
    { name: "Size", value: "Small" },
    { name: "Color", value: "Blue" },
  ],
  product: { handle: "hoodie" },
});

const LARGE_BLUE = makeVariant({
  id: "v-large-blue",
  title: "Large / Blue",
  availableForSale: true,
  selectedOptions: [
    { name: "Size", value: "Large" },
    { name: "Color", value: "Blue" },
  ],
  product: { handle: "hoodie" },
});

const TWO_OPTION_PRODUCT: ProductInput = {
  id: "gid://shopify/Product/2",
  title: "Hoodie",
  handle: "hoodie",
  options: [
    {
      name: "Size",
      optionValues: [
        { name: "Small", firstSelectableVariant: SMALL_RED },
        { name: "Large", firstSelectableVariant: LARGE_RED },
      ],
    },
    {
      name: "Color",
      optionValues: [
        { name: "Red", firstSelectableVariant: SMALL_RED },
        { name: "Blue", firstSelectableVariant: SMALL_BLUE },
      ],
    },
  ],
  selectedOrFirstAvailableVariant: SMALL_RED,
  adjacentVariants: [LARGE_RED, SMALL_BLUE, LARGE_BLUE],
};

const COMBINED_LISTING_SELECTED_VARIANT = makeVariant({
  id: "v-combined-turquoise-small",
  title: "154cm / Nested / Carbon-fiber",
  availableForSale: true,
  selectedOptions: [
    { name: "Color", value: "Turquoise" },
    { name: "Size", value: "154cm" },
  ],
  product: { handle: "v2-snowboard" },
});

const COMBINED_LISTING_EMBER_VARIANT = makeVariant({
  id: "v-combined-ember-small",
  title: "154cm / Optimistic / Polycarbonate",
  availableForSale: true,
  selectedOptions: [
    { name: "Color", value: "Ember" },
    { name: "Size", value: "154cm" },
  ],
  product: { handle: "the-red-hydrogen-snowboard" },
});

const COMBINED_LISTING_LARGE_VARIANT = makeVariant({
  id: "v-combined-turquoise-large",
  title: "158cm / Nested / Carbon-fiber",
  availableForSale: true,
  selectedOptions: [
    { name: "Color", value: "Turquoise" },
    { name: "Size", value: "158cm" },
  ],
  product: { handle: "v2-snowboard" },
});

const COMBINED_LISTING_PRODUCT: ProductInput = {
  id: "gid://shopify/Product/combined",
  title: "The Hydrogen Snowboards (Combined)",
  handle: "the-snowboards",
  options: [
    {
      name: "Color",
      optionValues: [
        { name: "Turquoise", firstSelectableVariant: COMBINED_LISTING_SELECTED_VARIANT },
        { name: "Ember", firstSelectableVariant: COMBINED_LISTING_EMBER_VARIANT },
      ],
    },
    {
      name: "Size",
      optionValues: [
        { name: "154cm", firstSelectableVariant: COMBINED_LISTING_SELECTED_VARIANT },
        { name: "158cm", firstSelectableVariant: COMBINED_LISTING_LARGE_VARIANT },
      ],
    },
  ],
  selectedOrFirstAvailableVariant: COMBINED_LISTING_SELECTED_VARIANT,
  adjacentVariants: [COMBINED_LISTING_EMBER_VARIANT, COMBINED_LISTING_LARGE_VARIANT],
};

// ---------------------------------------------------------------------------
// Mock CartStore helper
// ---------------------------------------------------------------------------

function makeCartLine(merchandiseId: string, lineId = `line-${merchandiseId}`): CartLine {
  return {
    id: lineId,
    quantity: 1,
    merchandise: { id: merchandiseId, title: "", product: { title: "" } },
    cost: {
      totalAmount: { amount: "10.00", currencyCode: "USD" },
      subtotalAmount: { amount: "10.00", currencyCode: "USD" },
      amountPerQuantity: { amount: "10.00", currencyCode: "USD" },
      compareAtAmountPerQuantity: null,
    },
  };
}

type CartDataOverrides = Omit<Partial<CartData>, "lines"> & {
  lines?: CartData["lines"]["nodes"] | CartData["lines"];
};
type CartStateOverrides = CartDataOverrides & Partial<Omit<CartState, "data">>;

function makeCartState(overrides: CartStateOverrides = {}): CartState {
  const { loading, pending, errors, ...dataOverrides } = overrides;
  const { lines, ...restDataOverrides } = dataOverrides;

  return {
    data: {
      ...EMPTY_CART_DATA,
      ...restDataOverrides,
      ...(lines && { lines: Array.isArray(lines) ? { nodes: lines } : lines }),
    },
    loading: loading ?? EMPTY_CART_STATE.loading,
    pending: pending ?? EMPTY_CART_STATE.pending,
    errors: errors ?? EMPTY_CART_STATE.errors,
  };
}

function createMockCartStore(initialState?: CartStateOverrides): CartStore & {
  _setState: (next: CartState | ((prev: CartState) => CartState)) => void;
} {
  const state = makeCartState(initialState);
  const observable = createObservable(state);

  return {
    connect: vi.fn(),
    destroy: vi.fn(),
    hydrate: vi.fn(),
    getState: () => observable.state,
    subscribe: (listener: (state: CartState) => void) => observable.subscribe(listener),
    fetch: vi.fn(() => Promise.resolve()),
    reset: vi.fn(),
    handleFormSubmit: vi.fn(() => Promise.resolve()),
    _setState: (next) => observable.setState(next),
  };
}

function createStore(
  product: ProductInput = makeSingleOptionProduct(RED),
  cartStore?: ReturnType<typeof createMockCartStore>,
) {
  return createProductFormStore(product, cartStore ?? createMockCartStore());
}

// ---------------------------------------------------------------------------
// createProductFormStore — variant selection (ported from variant.test.ts)
// ---------------------------------------------------------------------------

describe("createProductFormStore", () => {
  describe("initial state", () => {
    it("uses selectedOrFirstAvailableVariant as the pre-selected options", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      const { selectedOptions, selectedVariant, options } = store.getState();

      expect(selectedOptions).toEqual([{ name: "Color", value: "Red" }]);
      expect(selectedVariant).toBe(RED);
      expect(options[0].values.find((v) => v.name === "Red")?.selected).toBe(true);
      expect(options[0].values.find((v) => v.name === "Blue")?.selected).toBe(false);
    });

    it("keeps selected combined-listing option values on the current product handle", () => {
      const store = createStore(COMBINED_LISTING_PRODUCT);

      const selectedValues = store
        .getState()
        .options.flatMap((option) =>
          option.values
            .filter((value) => value.selected)
            .map((value) => ({ option: option.name, value: value.name, handle: value.handle })),
        );

      expect(store.getState().selectedVariant).toBe(COMBINED_LISTING_SELECTED_VARIANT);
      expect(selectedValues).toEqual([
        { option: "Color", value: "Turquoise", handle: "the-snowboards" },
        { option: "Size", value: "154cm", handle: "the-snowboards" },
      ]);
    });

    it("uses provided selectedOptions when no preselected variant", () => {
      const product = makeSingleOptionProduct(null);
      const store = createProductFormStore(product, createMockCartStore(), {
        selectedOptions: [{ name: "Color", value: "Blue" }],
      });

      expect(store.getState().selectedOptions).toEqual([{ name: "Color", value: "Blue" }]);
    });

    it("ignores provided selectedOptions when a server-selected variant exists", () => {
      const store = createProductFormStore(makeSingleOptionProduct(RED), createMockCartStore(), {
        selectedOptions: [{ name: "Color", value: "Blue" }],
      });

      expect(store.getState().selectedOptions).toEqual([{ name: "Color", value: "Red" }]);
    });

    it("starts with empty selectedOptions when no variant and no selectedOptions provided", () => {
      const store = createStore(makeSingleOptionProduct(null));
      expect(store.getState().selectedOptions).toEqual([]);
      expect(store.getState().selectedVariant).toBeNull();
    });

    it("includes cart-derived fields in initial state", () => {
      const store = createStore();
      const state = store.getState();

      expect(state.matchedLineItem).toBeNull();
      expect(state.errors).toEqual({
        userErrors: [],
        warnings: [],
        networkErrors: [],
      });
    });

    it("passes option value swatches through normalized option state", () => {
      const redSwatch = { color: "#ff0000" };
      const blueSwatch = {
        image: { previewImage: { url: "https://cdn.shopify.com/s/files/blue.png" } },
      };
      const product: ProductInput = {
        ...makeSingleOptionProduct(RED),
        options: [
          {
            name: "Color",
            optionValues: [
              { name: "Red", firstSelectableVariant: RED, swatch: redSwatch },
              { name: "Blue", firstSelectableVariant: BLUE, swatch: blueSwatch },
            ],
          },
        ],
      };
      const store = createStore(product);

      expect(store.getState().options[0].values.find((value) => value.name === "Red")?.swatch).toBe(
        redSwatch,
      );
      expect(
        store.getState().options[0].values.find((value) => value.name === "Blue")?.swatch,
      ).toBe(blueSwatch);
    });

    it("matches a line item if pre-selected variant is in cart", () => {
      const cartLine = makeCartLine("v-red");
      const cartStore = createMockCartStore({
        lines: [cartLine],
      });
      const store = createStore(makeSingleOptionProduct(RED), cartStore);

      expect(store.getState().matchedLineItem).toBe(cartLine);
    });
  });

  describe("selectOption", () => {
    it("returns resolved when a full variant is matched", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      const result = store.selectOption("Color", "Blue");

      expect(result.status).toBe("resolved");
      if (result.status === "resolved") {
        expect(result.selectedVariant).toBe(BLUE);
        expect(result.selectedOptions).toEqual([{ name: "Color", value: "Blue" }]);
      }
    });

    it("updates state after a resolved selection", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      store.selectOption("Color", "Blue");

      const { selectedOptions, options } = store.getState();
      expect(selectedOptions).toEqual([{ name: "Color", value: "Blue" }]);
      expect(store.getState().selectedVariant).toBe(BLUE);
      expect(options[0].values.find((v) => v.name === "Blue")?.selected).toBe(true);
      expect(options[0].values.find((v) => v.name === "Red")?.selected).toBe(false);
    });

    it("returns unresolved when a partial selection does not yet map to a variant", () => {
      const product: ProductInput = {
        id: "gid://shopify/Product/partial",
        title: "Partial",
        handle: "partial",
        options: [
          {
            name: "Size",
            optionValues: [{ name: "Small" }, { name: "Large" }],
          },
          {
            name: "Color",
            optionValues: [{ name: "Red", firstSelectableVariant: SMALL_RED }],
          },
        ],
        selectedOrFirstAvailableVariant: null,
        adjacentVariants: [],
      };
      const store = createStore(product);

      const result = store.selectOption("Size", "Small");

      expect(result.status).toBe("unresolved");
      expect(result.selectedVariant).toBeNull();
      expect(result.selectedOptions).toEqual([{ name: "Size", value: "Small" }]);
    });

    it("returns invalid for an unknown option name", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      const result = store.selectOption("Material", "Cotton");

      expect(result.status).toBe("invalid");
      if (result.status === "invalid") {
        expect(result.reason).toContain("Material");
      }
    });

    it("returns invalid for an unknown option value", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      const result = store.selectOption("Color", "Purple");

      expect(result.status).toBe("invalid");
      if (result.status === "invalid") {
        expect(result.reason).toContain("Purple");
      }
    });

    it("returns invalid for an option value not in encodedVariantExistence", () => {
      const product: ProductInput = {
        id: "gid://shopify/Product/encoded",
        title: "Encoded Shirt",
        handle: "shirt",
        encodedVariantExistence: "v1_0",
        options: [
          {
            name: "Color",
            optionValues: [{ name: "Red", firstSelectableVariant: RED }, { name: "Blue" }],
          },
        ],
        selectedOrFirstAvailableVariant: RED,
        adjacentVariants: [],
      };
      const store = createStore(product);
      const result = store.selectOption("Color", "Blue");

      expect(result.status).toBe("invalid");
    });

    it("does not mutate state on invalid selection", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      const before = store.getState();

      store.selectOption("Color", "Purple");

      expect(store.getState()).toBe(before);
    });

    it("handles multiple sequential selections on a 2-option product", () => {
      const store = createStore(TWO_OPTION_PRODUCT);

      const r1 = store.selectOption("Color", "Blue");
      expect(r1.status).toBe("resolved");
      if (r1.status === "resolved") expect(r1.selectedVariant).toBe(SMALL_BLUE);

      const r2 = store.selectOption("Size", "Large");
      expect(r2.status).toBe("resolved");
      if (r2.status === "resolved") expect(r2.selectedVariant).toBe(LARGE_BLUE);
    });

    it("preserves other selected options when the exact variant is not in the bounded cache", () => {
      const product: ProductInput = {
        ...TWO_OPTION_PRODUCT,
        adjacentVariants: [LARGE_RED, SMALL_BLUE],
      };
      const store = createStore(product);

      const r1 = store.selectOption("Size", "Large");
      expect(r1.status).toBe("resolved");
      if (r1.status === "resolved") expect(r1.selectedVariant).toBe(LARGE_RED);

      const r2 = store.selectOption("Color", "Blue");

      expect(r2.status).toBe("unresolved");
      expect(r2.selectedVariant).toBeNull();
      expect(r2.selectedOptions).toEqual([
        { name: "Size", value: "Large" },
        { name: "Color", value: "Blue" },
      ]);
      expect(store.getState().selectedOptions).toEqual([
        { name: "Size", value: "Large" },
        { name: "Color", value: "Blue" },
      ]);
      expect(getSelectedVariant(store.getState().options)).toBeNull();
    });

    it("handles special characters in option names and values", () => {
      const mediumTall = makeVariant({
        id: "v-medium-tall",
        title: "Medium / Tall",
        availableForSale: true,
        selectedOptions: [{ name: "Size & Fit", value: "M/L + Tall" }],
      });
      const product: ProductInput = {
        ...makeSingleOptionProduct(null),
        options: [
          {
            name: "Size & Fit",
            optionValues: [
              { name: "Small / Regular" },
              { name: "M/L + Tall", firstSelectableVariant: mediumTall },
            ],
          },
        ],
        adjacentVariants: [mediumTall],
      };
      const store = createStore(product);

      const result = store.selectOption("Size & Fit", "M/L + Tall");

      expect(result.status).toBe("resolved");
      expect(result.selectedOptions).toEqual([{ name: "Size & Fit", value: "M/L + Tall" }]);
      expect(store.getState().selectedOptions).toEqual([
        { name: "Size & Fit", value: "M/L + Tall" },
      ]);
    });

    it("handles option names that collide with object prototype fields", () => {
      const protoVariant = makeVariant({
        id: "v-proto",
        title: "Prototype",
        availableForSale: true,
        selectedOptions: [{ name: "__proto__", value: "Custom" }],
      });
      const product: ProductInput = {
        ...makeSingleOptionProduct(null),
        options: [
          {
            name: "__proto__",
            optionValues: [{ name: "Custom", firstSelectableVariant: protoVariant }],
          },
        ],
        adjacentVariants: [protoVariant],
      };
      const store = createStore(product);

      const result = store.selectOption("__proto__", "Custom");

      expect(result.status).toBe("resolved");
      expect(result.selectedOptions).toEqual([{ name: "__proto__", value: "Custom" }]);
      expect(store.getState().selectedOptions).toEqual([{ name: "__proto__", value: "Custom" }]);
    });

    it("recomputes matchedLineItem after variant selection", () => {
      const cartLine = makeCartLine("v-blue");
      const cartStore = createMockCartStore({ lines: [cartLine] });
      const store = createStore(makeSingleOptionProduct(RED), cartStore);

      expect(store.getState().matchedLineItem).toBeNull();

      store.selectOption("Color", "Blue");

      expect(store.getState().matchedLineItem).toBe(cartLine);
    });
  });

  describe("subscribe", () => {
    it("notifies listeners on state changes", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      const listener = vi.fn();
      store.subscribe(listener);

      store.selectOption("Color", "Blue");

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(store.getState());
    });

    it("does not notify on invalid selection (state unchanged)", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      const listener = vi.fn();
      store.subscribe(listener);

      store.selectOption("Color", "Purple");

      expect(listener).not.toHaveBeenCalled();
    });

    it("returns an unsubscribe function that stops notifications", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      const listener = vi.fn();
      const unsub = store.subscribe(listener);

      unsub();
      store.selectOption("Color", "Blue");

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("hydrate", () => {
    it("replaces product data and recomputes state", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      const product2 = makeSingleOptionProduct(BLUE);

      store.hydrate(product2);

      expect(store.getState().selectedOptions).toEqual([{ name: "Color", value: "Blue" }]);
    });

    it("respects the new product's selectedOrFirstAvailableVariant", () => {
      const store = createStore(makeSingleOptionProduct(RED));

      store.hydrate(makeSingleOptionProduct(BLUE));

      const { options } = store.getState();
      expect(options[0].values.find((v) => v.name === "Blue")?.selected).toBe(true);
    });

    it("falls back to current selectedOptions when new product has no preselected variant", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      store.selectOption("Color", "Blue");

      store.hydrate(makeSingleOptionProduct(null));

      expect(store.getState().selectedOptions).toEqual([{ name: "Color", value: "Blue" }]);
    });

    it("accepts an explicit selectedOptions override", () => {
      const store = createStore(makeSingleOptionProduct(RED));

      store.hydrate(makeSingleOptionProduct(null), {
        selectedOptions: [{ name: "Color", value: "Blue" }],
      });

      expect(store.getState().selectedOptions).toEqual([{ name: "Color", value: "Blue" }]);
    });

    it("notifies subscribers after hydration", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      const listener = vi.fn();
      store.subscribe(listener);

      store.hydrate(makeSingleOptionProduct(BLUE));

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("recomputes matchedLineItem for the new variant", () => {
      const cartLine = makeCartLine("v-blue");
      const cartStore = createMockCartStore({ lines: [cartLine] });
      const store = createStore(makeSingleOptionProduct(RED), cartStore);

      expect(store.getState().matchedLineItem).toBeNull();

      store.hydrate(makeSingleOptionProduct(BLUE));

      expect(store.getState().matchedLineItem).toBe(cartLine);
    });
  });

  describe("reset", () => {
    it("restores the initial selection", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      store.selectOption("Color", "Blue");

      store.reset();

      expect(store.getState().selectedOptions).toEqual([{ name: "Color", value: "Red" }]);
    });

    it("notifies subscribers after reset", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      store.selectOption("Color", "Blue");

      const listener = vi.fn();
      store.subscribe(listener);
      store.reset();

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("restores the initial product after hydration", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      store.hydrate(makeSingleOptionProduct(BLUE));

      store.reset();

      expect(store.getState().selectedOptions).toEqual([{ name: "Color", value: "Red" }]);
    });

    it("recomputes cart-derived fields after reset", () => {
      const cartLine = makeCartLine("v-red");
      const cartStore = createMockCartStore({ lines: [cartLine] });
      const store = createStore(makeSingleOptionProduct(RED), cartStore);

      store.selectOption("Color", "Blue");
      expect(store.getState().matchedLineItem).toBeNull();

      store.reset();
      expect(store.getState().matchedLineItem).toBe(cartLine);
    });
  });

  describe("destroy", () => {
    it("does not throw", () => {
      const store = createStore(makeSingleOptionProduct(RED));
      expect(() => store.destroy()).not.toThrow();
    });

    it("unsubscribes from cart store changes", () => {
      const cartStore = createMockCartStore();
      const store = createStore(makeSingleOptionProduct(RED), cartStore);
      const listener = vi.fn();
      store.subscribe(listener);

      store.destroy();
      cartStore._setState((prev) => ({ ...prev, data: { ...prev.data, totalQuantity: 99 } }));

      expect(listener).not.toHaveBeenCalled();
    });

    it("ignores cart state changes after destroy", () => {
      const cartStore = createMockCartStore();
      const store = createStore(makeSingleOptionProduct(RED), cartStore);
      const listener = vi.fn();
      store.subscribe(listener);

      store.destroy();

      cartStore._setState((prev) => ({
        ...prev,
        data: { ...prev.data, lines: { nodes: [makeCartLine("v-red")] } },
      }));

      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Cart integration — line item matching
  // ---------------------------------------------------------------------------

  describe("line item matching", () => {
    it("returns null when no variant is resolved", () => {
      const cartLine = makeCartLine("v-red");
      const cartStore = createMockCartStore({ lines: [cartLine] });
      const store = createStore(makeSingleOptionProduct(null), cartStore);

      expect(store.getState().matchedLineItem).toBeNull();
    });

    it("returns the first matching line when multiple exist for same merchandise", () => {
      const line1 = makeCartLine("v-red", "line-1");
      const line2 = makeCartLine("v-red", "line-2");
      const cartStore = createMockCartStore({ lines: [line1, line2] });
      const store = createStore(makeSingleOptionProduct(RED), cartStore);

      expect(store.getState().matchedLineItem).toBe(line1);
    });

    it("returns null when cart line has undefined merchandise", () => {
      const lineWithoutMerchandise: CartLine = {
        id: "line-no-merch",
        quantity: 1,
        cost: {
          totalAmount: { amount: "10.00", currencyCode: "USD" },
          subtotalAmount: { amount: "10.00", currencyCode: "USD" },
          amountPerQuantity: { amount: "10.00", currencyCode: "USD" },
          compareAtAmountPerQuantity: null,
        },
      };
      const cartStore = createMockCartStore({ lines: [lineWithoutMerchandise] });
      const store = createStore(makeSingleOptionProduct(RED), cartStore);

      expect(store.getState().matchedLineItem).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Cart integration — error extraction
  // ---------------------------------------------------------------------------

  describe("error extraction", () => {
    it("includes cart-level user errors", () => {
      const cartStore = createMockCartStore({
        errors: {
          ...createEmptyCartErrors(),
          cart: {
            userErrors: [{ code: null, message: "Something went wrong" }],
            warnings: [],
          },
        },
      });
      const store = createStore(makeSingleOptionProduct(RED), cartStore);

      expect(store.getState().errors.userErrors).toEqual([
        { code: null, message: "Something went wrong" },
      ]);
    });

    it("includes line-level user errors when matched line has errors", () => {
      const lineId = "line-v-red";
      const cartLine = makeCartLine("v-red", lineId);
      const errors = createEmptyCartErrors();
      errors.lines.set(lineId, {
        userErrors: [{ code: null, message: "Out of stock" }],
        warnings: [],
      });

      const cartStore = createMockCartStore({ lines: [cartLine], errors });
      const store = createStore(makeSingleOptionProduct(RED), cartStore);

      expect(store.getState().errors.userErrors).toEqual([{ code: null, message: "Out of stock" }]);
    });

    it("merges cart-level and line-level user errors into a single array", () => {
      const lineId = "line-v-red";
      const cartLine = makeCartLine("v-red", lineId);
      const errors = createEmptyCartErrors();
      errors.cart = {
        userErrors: [{ code: null, message: "Cart-level error" }],
        warnings: [],
      };
      errors.lines.set(lineId, {
        userErrors: [{ code: null, message: "Line-level error" }],
        warnings: [],
      });

      const cartStore = createMockCartStore({ lines: [cartLine], errors });
      const store = createStore(makeSingleOptionProduct(RED), cartStore);

      expect(store.getState().errors.userErrors).toEqual([
        { code: null, message: "Cart-level error" },
        { code: null, message: "Line-level error" },
      ]);
    });

    it("merges cart-level and line-level warnings into a single array", () => {
      const lineId = "line-v-red";
      const cartLine = makeCartLine("v-red", lineId);
      const errors = createEmptyCartErrors();
      errors.cart = {
        userErrors: [],
        warnings: [{ code: "DISCOUNT_CURRENTLY_INACTIVE", message: "Cart warning" }],
      };
      errors.lines.set(lineId, {
        userErrors: [],
        warnings: [{ code: "DISCOUNT_CODE_NOT_HONOURED", message: "Line warning" }],
      });

      const cartStore = createMockCartStore({ lines: [cartLine], errors });
      const store = createStore(makeSingleOptionProduct(RED), cartStore);

      expect(store.getState().errors.warnings).toEqual([
        { code: "DISCOUNT_CURRENTLY_INACTIVE", message: "Cart warning" },
        { code: "DISCOUNT_CODE_NOT_HONOURED", message: "Line warning" },
      ]);
    });

    it("has empty userErrors when no line is matched and cart has no errors", () => {
      const store = createStore(makeSingleOptionProduct(RED), createMockCartStore());
      expect(store.getState().errors.userErrors).toEqual([]);
    });

    it("surfaces network errors from cart state", () => {
      const cartStore = createMockCartStore({
        errors: {
          ...createEmptyCartErrors(),
          network: [{ message: "Request failed", status: 500 }],
        },
      });
      const store = createStore(makeSingleOptionProduct(RED), cartStore);

      expect(store.getState().errors.networkErrors).toEqual([
        { message: "Request failed", status: 500 },
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // Cart integration — cross-store reactivity
  // ---------------------------------------------------------------------------

  describe("cross-store reactivity", () => {
    it("recomputes state when cart store changes", () => {
      const cartStore = createMockCartStore();
      const store = createStore(makeSingleOptionProduct(RED), cartStore);
      const listener = vi.fn();
      store.subscribe(listener);

      const newLine = makeCartLine("v-red");
      cartStore._setState((prev) => ({
        ...prev,
        data: { ...prev.data, lines: { nodes: [newLine] } },
      }));

      expect(listener).toHaveBeenCalled();
      expect(store.getState().matchedLineItem).toBe(newLine);
    });

    it("recomputes errors when cart error state changes", () => {
      const cartLine = makeCartLine("v-red", "line-1");
      const cartStore = createMockCartStore({ lines: [cartLine] });
      const store = createStore(makeSingleOptionProduct(RED), cartStore);

      expect(store.getState().errors.userErrors).toEqual([]);

      const updatedErrors = createEmptyCartErrors();
      updatedErrors.lines.set("line-1", {
        userErrors: [{ code: null, message: "Quantity limit" }],
        warnings: [],
      });
      cartStore._setState((prev) => ({ ...prev, errors: updatedErrors }));

      expect(store.getState().errors.userErrors).toEqual([
        { code: null, message: "Quantity limit" },
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // handleFormSubmit
  // ---------------------------------------------------------------------------

  describe("handleFormSubmit", () => {
    it("delegates to cartStore.handleFormSubmit with event and product detail", async () => {
      const cartStore = createMockCartStore();
      const store = createStore(makeSingleOptionProduct(RED), cartStore);
      const event = new Event("submit") as SubmitEvent;

      await store.handleFormSubmit(event);

      expect(cartStore.handleFormSubmit).toHaveBeenCalledWith(event, {
        products: [
          {
            id: "v-red",
            title: "Red",
            product: { title: undefined },
            image: undefined,
            price: { amount: "10.00", currencyCode: "USD" },
          },
        ],
      });
    });

    it("passes undefined eventDetail when no variant is selected", async () => {
      const cartStore = createMockCartStore();
      const store = createStore(makeSingleOptionProduct(null), cartStore);
      const event = new Event("submit") as SubmitEvent;

      await store.handleFormSubmit(event);

      expect(cartStore.handleFormSubmit).toHaveBeenCalledWith(event, undefined);
    });

    it("includes image and product title when variant has them", async () => {
      const redWithImage = makeVariant({
        id: "v-red",
        title: "Red",
        selectedOptions: [{ name: "Color", value: "Red" }],
        product: { handle: "shirt", title: "Cozy Shirt" },
        image: { url: "https://cdn.example.com/shirt.jpg", altText: "Red shirt" },
      });
      const cartStore = createMockCartStore();
      const store = createStore(makeSingleOptionProduct(redWithImage), cartStore);
      const event = new Event("submit") as SubmitEvent;

      await store.handleFormSubmit(event);

      expect(cartStore.handleFormSubmit).toHaveBeenCalledWith(event, {
        products: [
          {
            id: "v-red",
            title: "Red",
            product: { title: "Cozy Shirt" },
            image: { url: "https://cdn.example.com/shirt.jpg", altText: "Red shirt" },
            price: { amount: "10.00", currencyCode: "USD" },
          },
        ],
      });
    });

    it("re-throws errors from cartStore.handleFormSubmit", async () => {
      const cartStore = createMockCartStore();
      (cartStore.handleFormSubmit as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("network error"),
      );
      const store = createStore(makeSingleOptionProduct(RED), cartStore);

      await expect(store.handleFormSubmit(new Event("submit") as SubmitEvent)).rejects.toThrow(
        "network error",
      );
    });
  });
});

// ---------------------------------------------------------------------------
// findCartLineByMerchandiseId
// ---------------------------------------------------------------------------

describe("findCartLineByMerchandiseId", () => {
  it("returns the matching line", () => {
    const line = makeCartLine("v-red");
    expect(findCartLineByMerchandiseId([line], "v-red")).toBe(line);
  });

  it("returns null when no match", () => {
    const line = makeCartLine("v-red");
    expect(findCartLineByMerchandiseId([line], "v-blue")).toBeNull();
  });

  it("returns the first match when multiple lines have the same merchandise", () => {
    const line1 = makeCartLine("v-red", "line-1");
    const line2 = makeCartLine("v-red", "line-2");
    expect(findCartLineByMerchandiseId([line1, line2], "v-red")).toBe(line1);
  });

  it("skips lines with undefined merchandise", () => {
    const lineWithoutMerchandise: CartLine = {
      id: "line-no-merch",
      quantity: 1,
      cost: {
        totalAmount: { amount: "10.00", currencyCode: "USD" },
        subtotalAmount: { amount: "10.00", currencyCode: "USD" },
        amountPerQuantity: { amount: "10.00", currencyCode: "USD" },
        compareAtAmountPerQuantity: null,
      },
    };
    expect(findCartLineByMerchandiseId([lineWithoutMerchandise], "v-red")).toBeNull();
  });

  it("returns null for empty lines array", () => {
    expect(findCartLineByMerchandiseId([], "v-red")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

describe("getSelectedVariant", () => {
  it("returns the variant for the selected option value in the first option", () => {
    const store = createStore(makeSingleOptionProduct(RED));
    const variant = getSelectedVariant(store.getState().options);
    expect(variant).toBe(RED);
  });

  it("returns null when no option is selected", () => {
    const store = createStore(makeSingleOptionProduct(null));
    const variant = getSelectedVariant(store.getState().options);
    expect(variant).toBeNull();
  });
});

describe("canAddToCart", () => {
  it("returns true when variant is selected and available", () => {
    const product = makeSingleOptionProduct(RED);
    const store = createStore(product);
    expect(canAddToCart(product, store.getState().options)).toBe(true);
  });

  it("returns false when selected variant is not available for sale", () => {
    const product = makeSingleOptionProduct(BLUE);
    const store = createStore(product);
    expect(canAddToCart(product, store.getState().options)).toBe(false);
  });

  it("returns false when no variant is selected", () => {
    const product = makeSingleOptionProduct(null);
    const store = createStore(product);
    expect(canAddToCart(product, store.getState().options)).toBe(false);
  });

  it("returns false when product requires a selling plan", () => {
    const product: ProductInput = { ...makeSingleOptionProduct(RED), requiresSellingPlan: true };
    const store = createStore(product);
    expect(canAddToCart(product, store.getState().options)).toBe(false);
  });
});
