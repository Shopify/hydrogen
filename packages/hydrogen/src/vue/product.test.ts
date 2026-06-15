// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { defineComponent, h, nextTick } from "vue";

import { createCartStore, type CartStore, type CreateCartStoreOptions } from "../core/cart/cart";
import type { CartData, CartLine, CartState } from "../core/cart/state";
import { EMPTY_CART_DATA, EMPTY_CART_STATE, createEmptyCartErrors } from "../core/cart/state";
import { createProductFormStore } from "../core/product/product-form";
import type { ProductInput, ProductVariantInput } from "../core/product/state";
import { CartProvider, configureCartEndpoint } from "./cart";
import { createProductComponents, useProductForm } from "./product";

vi.mock("../core/cart/cart", () => ({
  configureCartEndpoint: vi.fn(),
  createCartStore: vi.fn(),
}));

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
  availableForSale: true,
  selectedOptions: [{ name: "Color", value: "Red" }],
  product: { handle: "shirt" },
});

const BLUE = makeVariant({
  id: "v-blue",
  availableForSale: true,
  selectedOptions: [{ name: "Color", value: "Blue" }],
  product: { handle: "shirt" },
});

const GREEN_SOLD_OUT = makeVariant({
  id: "v-green",
  availableForSale: false,
  selectedOptions: [{ name: "Color", value: "Green" }],
  product: { handle: "shirt" },
});

// ---------------------------------------------------------------------------
// Cart mock helpers
// ---------------------------------------------------------------------------

type MockCartStore = CartStore & { setState(state: CartState): void };

let cartSubscribeListener: (() => void) | null = null;

function isCartState(value: CartData | CartState): value is CartState {
  return "data" in value && "pending" in value && "errors" in value && "loading" in value;
}

function createMockCartStore(initialData?: CartData | CartState): MockCartStore {
  let state: CartState = initialData
    ? isCartState(initialData)
      ? initialData
      : makeCartState({ ...initialData, loading: false, errors: createEmptyCartErrors() })
    : { ...EMPTY_CART_STATE };

  const listeners = new Set<() => void>();

  const store = {
    connect: vi.fn(),
    destroy: vi.fn(),
    hydrate: vi.fn(),
    getState: vi.fn(() => state),
    subscribe: vi.fn((fn: () => void) => {
      listeners.add(fn);
      cartSubscribeListener = fn;
      return () => {
        listeners.delete(fn);
        if (cartSubscribeListener === fn) cartSubscribeListener = null;
      };
    }),
    fetch: vi.fn(() => Promise.resolve()),
    reset: vi.fn(),
    handleFormSubmit: vi.fn(() => Promise.resolve()),
    setState(next: CartState) {
      state = next;
      for (const fn of listeners) fn();
    },
  } as unknown as MockCartStore;
  return store;
}

type CartDataOverrides = Omit<Partial<CartData>, "lines"> & {
  lines?: CartData["lines"]["nodes"] | CartData["lines"];
};
type CartStateOverrides = CartDataOverrides & Partial<Omit<CartState, "data">>;

function makeCartData(overrides: CartDataOverrides = {}): CartData {
  const { lines, ...rest } = overrides;
  return {
    ...EMPTY_CART_DATA,
    id: "gid://shopify/Cart/123",
    ...rest,
    ...(lines && { lines: Array.isArray(lines) ? { nodes: lines } : lines }),
  };
}

function makeCartState(overrides: CartStateOverrides = {}): CartState {
  const { loading, pending, errors, ...dataOverrides } = overrides;

  return {
    data: makeCartData(dataOverrides),
    loading: loading ?? EMPTY_CART_STATE.loading,
    pending: pending ?? EMPTY_CART_STATE.pending,
    errors: errors ?? EMPTY_CART_STATE.errors,
  };
}

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

// ---------------------------------------------------------------------------
// Product fixtures
// ---------------------------------------------------------------------------

function makeProduct(
  selectedOrFirstAvailableVariant: ProductVariantInput | null = RED,
  id = "gid://shopify/Product/1",
): ProductInput {
  return {
    id,
    title: "Shirt",
    handle: "shirt",
    options: [
      {
        name: "Color",
        optionValues: [
          { name: "Red", firstSelectableVariant: RED },
          { name: "Blue", firstSelectableVariant: BLUE },
          { name: "Green", firstSelectableVariant: GREEN_SOLD_OUT },
        ],
      },
    ],
    selectedOrFirstAvailableVariant,
    adjacentVariants: [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getColorValue(result: ReturnType<typeof useProductForm>, valueName: string) {
  return result.options.find((o) => o.name === "Color")?.values.find((v) => v.name === valueName);
}

function makeStore(
  product: ProductInput = makeProduct(RED),
  cartStateOverrides: CartStateOverrides = {},
) {
  const cartStore = createMockCartStore(makeCartState(cartStateOverrides));
  const store = createProductFormStore(product, cartStore);
  return { store, cartStore };
}

function mountStandaloneConsumer<T>(
  setupFn: () => { exposed: T; render: () => ReturnType<typeof h> | null },
): T {
  let captured: T | undefined;
  const Consumer = defineComponent({
    setup() {
      const { exposed, render } = setupFn();
      captured = exposed;
      return render;
    },
  });
  mount(CartProvider, {
    slots: { default: () => h(Consumer) },
  });
  if (captured === undefined) throw new Error("mountStandaloneConsumer: setup was never called");
  return captured;
}

// ---------------------------------------------------------------------------
// useProductForm (standalone — takes a ProductFormStore)
// ---------------------------------------------------------------------------

describe("useProductForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cartSubscribeListener = null;
    vi.mocked(createCartStore).mockImplementation((options?: CreateCartStoreOptions) =>
      createMockCartStore(options?.initialData),
    );
    configureCartEndpoint("/api/cart");
  });

  describe("initial state", () => {
    it("reflects the product's preselected variant in options", () => {
      const { store } = makeStore();
      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r, render: () => null };
      });

      expect(result.selectedVariant).toBe(RED);
      expect(getColorValue(result, "Red")?.selected).toBe(true);
      expect(getColorValue(result, "Blue")?.selected).toBe(false);
    });

    it("starts with no option value selected when no variant is preselected", () => {
      const { store } = makeStore(makeProduct(null));
      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r, render: () => null };
      });

      const anySelected = result.options.flatMap((o) => o.values).some((v) => v.selected);
      expect(result.selectedVariant).toBeNull();
      expect(anySelected).toBe(false);
    });
  });

  describe("selectOption", () => {
    it("returns a resolved result when a full variant is matched", () => {
      const { store } = makeStore();
      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r, render: () => null };
      });

      const selectionResult = result.selectOption("Color", "Blue");

      expect(selectionResult.status).toBe("resolved");
      if (selectionResult.status === "resolved") {
        expect(selectionResult.selectedVariant).toBe(BLUE);
      }
    });

    it("updates options after a valid selectOption call", async () => {
      const { store } = makeStore();
      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r, render: () => null };
      });

      result.selectOption("Color", "Blue");
      await nextTick();

      expect(getColorValue(result, "Red")?.selected).toBe(false);
      expect(getColorValue(result, "Blue")?.selected).toBe(true);
      expect(result.selectedVariant).toBe(BLUE);
    });

    it("returns an invalid result for an unknown option", () => {
      const { store } = makeStore();
      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r, render: () => null };
      });

      const selectionResult = result.selectOption("Size", "Large");

      expect(selectionResult.status).toBe("invalid");
    });

    it("does not update options on an invalid selection", async () => {
      const { store } = makeStore();
      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r, render: () => null };
      });

      const optionsBefore = result.options;
      result.selectOption("Size", "Large");
      await nextTick();

      expect(result.options).toBe(optionsBefore);
    });
  });

  describe("onSelect callback", () => {
    it("fires onSelect when selection is resolved", () => {
      const onSelect = vi.fn();
      const { store } = makeStore();
      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store, { onSelect });
        return { exposed: r, render: () => null };
      });

      result.selectOption("Color", "Blue");

      expect(onSelect).toHaveBeenCalledTimes(1);
      const [callArg] = onSelect.mock.calls[0];
      expect(callArg.status).toBe("resolved");
      expect(callArg.selectedVariant).toBe(BLUE);
    });

    it("does not fire onSelect when selection is invalid", () => {
      const onSelect = vi.fn();
      const { store } = makeStore();
      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store, { onSelect });
        return { exposed: r, render: () => null };
      });

      result.selectOption("Size", "Large");

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe("register", () => {
    describe('"optionValue"', () => {
      it("returns form identity and activation handlers", () => {
        const { store } = makeStore();
        const result = mountStandaloneConsumer(() => {
          const r = useProductForm(store);
          return { exposed: r, render: () => null };
        });

        const props = result.register("optionValue", {
          optionName: "Color",
          value: "Red",
        });

        expect(props.name).toBe("Color");
        expect(props.value).toBe("Red");
        expect(props.onChange).toEqual(expect.any(Function));
        expect(props.onClick).toEqual(expect.any(Function));
        expect("type" in props).toBe(false);
        expect("checked" in props).toBe(false);
        expect("disabled" in props).toBe(false);
        expect("aria-pressed" in props).toBe(false);
      });

      it("onChange and onClick call selectOption with the correct name and value", async () => {
        const { store } = makeStore();
        const result = mountStandaloneConsumer(() => {
          const r = useProductForm(store);
          return { exposed: r, render: () => null };
        });

        result.register("optionValue", { optionName: "Color", value: "Blue" }).onChange();
        await nextTick();
        expect(getColorValue(result, "Blue")?.selected).toBe(true);

        result.register("optionValue", { optionName: "Color", value: "Red" }).onClick();
        await nextTick();
        expect(getColorValue(result, "Red")?.selected).toBe(true);
      });
    });

    describe('"merchandiseId"', () => {
      it("returns the selected variant id when a variant is resolved", () => {
        const { store } = makeStore();
        const result = mountStandaloneConsumer(() => {
          const r = useProductForm(store);
          return { exposed: r, render: () => null };
        });

        const props = result.register("merchandiseId", {});
        expect(props.name).toBe("merchandiseId");
        expect(props.value).toBe("v-red");
      });

      it("returns an empty string when no variant is selected", () => {
        const { store } = makeStore(makeProduct(null));
        const result = mountStandaloneConsumer(() => {
          const r = useProductForm(store);
          return { exposed: r, render: () => null };
        });

        const props = result.register("merchandiseId", {});
        expect(props.value).toBe("");
      });

      it("updates to the new variant id after selectOption", async () => {
        const { store } = makeStore();
        const result = mountStandaloneConsumer(() => {
          const r = useProductForm(store);
          return { exposed: r, render: () => null };
        });

        result.selectOption("Color", "Blue");
        await nextTick();

        expect(result.register("merchandiseId", {}).value).toBe("v-blue");
      });
    });

    describe('"quantity"', () => {
      it("returns a string value", () => {
        const { store } = makeStore();
        const result = mountStandaloneConsumer(() => {
          const r = useProductForm(store);
          return { exposed: r, render: () => null };
        });

        expect(result.register("quantity", { value: 2 })).toEqual({
          name: "quantity",
          value: "2",
        });
      });

      it("returns a string defaultValue", () => {
        const { store } = makeStore();
        const result = mountStandaloneConsumer(() => {
          const r = useProductForm(store);
          return { exposed: r, render: () => null };
        });

        expect(result.register("quantity", { defaultValue: 3 })).toEqual({
          name: "quantity",
          defaultValue: "3",
        });
      });
    });
  });

  describe("formProps", () => {
    it("onSubmit delegates to store.handleFormSubmit", () => {
      const { store, cartStore } = makeStore();
      const formProps = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r.formProps(), render: () => null };
      });

      const form = document.createElement("form");
      const nativeEvent = new SubmitEvent("submit", { submitter: null });
      Object.defineProperty(nativeEvent, "target", { value: form });
      Object.defineProperty(nativeEvent, "preventDefault", { value: vi.fn() });

      (formProps.onSubmit as (e: Event) => void)(nativeEvent);

      expect(cartStore.handleFormSubmit).toHaveBeenCalledTimes(1);
    });

    it("preserves method and action for progressive enhancement", () => {
      const { store } = makeStore();
      const formProps = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r.formProps(), render: () => null };
      });

      expect(formProps.method).toBe("post");
      expect(formProps.action).toBe("/api/cart");
    });

    it("calls beforeSubmit synchronously and afterSubmit after completion", async () => {
      const { store, cartStore } = makeStore();
      const beforeSubmit = vi.fn();
      const afterSubmit = vi.fn();

      const formProps = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r.formProps({ beforeSubmit, afterSubmit }), render: () => null };
      });

      const form = document.createElement("form");
      const nativeEvent = new SubmitEvent("submit", { submitter: null });
      Object.defineProperty(nativeEvent, "target", { value: form });
      Object.defineProperty(nativeEvent, "preventDefault", { value: vi.fn() });

      (formProps.onSubmit as (e: Event) => void)(nativeEvent);
      expect(beforeSubmit).toHaveBeenCalledTimes(1);
      expect(afterSubmit).not.toHaveBeenCalled();

      await vi.mocked(cartStore.handleFormSubmit).mock.results[0]?.value;
      await nextTick();

      expect(afterSubmit).toHaveBeenCalledTimes(1);
    });

    it("does not call afterSubmit on error", async () => {
      const { store, cartStore } = makeStore();
      vi.mocked(cartStore.handleFormSubmit).mockRejectedValueOnce(new Error("fail"));
      const afterSubmit = vi.fn();
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const formProps = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r.formProps({ afterSubmit }), render: () => null };
      });

      const form = document.createElement("form");
      const nativeEvent = new SubmitEvent("submit", { submitter: null });
      Object.defineProperty(nativeEvent, "target", { value: form });
      Object.defineProperty(nativeEvent, "preventDefault", { value: vi.fn() });

      (formProps.onSubmit as (e: Event) => void)(nativeEvent);
      await vi.mocked(cartStore.handleFormSubmit).mock.results[0]?.value.catch(() => {});
      await nextTick();

      expect(afterSubmit).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[hydrogen] form submission error:",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });

    it("does not submit if beforeSubmit prevents default", () => {
      const { store, cartStore } = makeStore();
      const formProps = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return {
          exposed: r.formProps({ beforeSubmit: (e) => e.preventDefault() }),
          render: () => null,
        };
      });

      const form = document.createElement("form");
      const nativeEvent = new SubmitEvent("submit", { submitter: null, cancelable: true });
      Object.defineProperty(nativeEvent, "target", { value: form });

      (formProps.onSubmit as (e: Event) => void)(nativeEvent);

      expect(cartStore.handleFormSubmit).not.toHaveBeenCalled();
    });
  });

  describe("pending", () => {
    it("is false initially", () => {
      const { store } = makeStore();
      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r, render: () => null };
      });

      expect(result.pending.value).toBe(false);
    });

    it("becomes true during form submission and false when it resolves", async () => {
      const { store, cartStore } = makeStore();

      let resolveSubmit!: () => void;
      vi.mocked(cartStore.handleFormSubmit).mockImplementation(
        () =>
          new Promise<void>((r) => {
            resolveSubmit = r;
          }),
      );

      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r, render: () => null };
      });

      const form = document.createElement("form");
      const nativeEvent = new SubmitEvent("submit", { submitter: null });
      Object.defineProperty(nativeEvent, "target", { value: form });
      Object.defineProperty(nativeEvent, "preventDefault", { value: vi.fn() });

      (result.formProps().onSubmit as (e: Event) => void)(nativeEvent);
      await nextTick();

      expect(result.pending.value).toBe(true);

      resolveSubmit();
      await vi.waitFor(() => expect(result.pending.value).toBe(false));
    });

    it("resets to false when form submission rejects", async () => {
      const { store, cartStore } = makeStore();

      let rejectSubmit!: (err: Error) => void;
      vi.mocked(cartStore.handleFormSubmit).mockImplementation(
        () =>
          new Promise<void>((_, rej) => {
            rejectSubmit = rej;
          }),
      );
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r, render: () => null };
      });

      const form = document.createElement("form");
      const nativeEvent = new SubmitEvent("submit", { submitter: null });
      Object.defineProperty(nativeEvent, "target", { value: form });
      Object.defineProperty(nativeEvent, "preventDefault", { value: vi.fn() });

      (result.formProps().onSubmit as (e: Event) => void)(nativeEvent);
      await nextTick();

      expect(result.pending.value).toBe(true);

      rejectSubmit(new Error("network error"));
      await vi.waitFor(() => expect(result.pending.value).toBe(false));
      consoleSpy.mockRestore();
    });
  });

  describe("errors", () => {
    it("reflects cart state errors", async () => {
      const { store, cartStore } = makeStore();
      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r, render: () => null };
      });

      cartStore.setState({
        ...makeCartState(),
        errors: {
          ...createEmptyCartErrors(),
          cart: { userErrors: [{ code: null, message: "Variant unavailable" }], warnings: [] },
        },
      });
      await nextTick();

      expect(result.errors.userErrors).toEqual([{ code: null, message: "Variant unavailable" }]);
    });

    it("resets when cart errors clear", async () => {
      const { store, cartStore } = makeStore();
      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r, render: () => null };
      });

      cartStore.setState({
        ...makeCartState(),
        errors: {
          ...createEmptyCartErrors(),
          cart: { userErrors: [{ code: null, message: "Error" }], warnings: [] },
        },
      });
      await nextTick();

      cartStore.setState({ ...makeCartState(), errors: createEmptyCartErrors() });
      await nextTick();

      expect(result.errors.userErrors).toEqual([]);
    });
  });

  describe("matchedLineItem", () => {
    it("is null when no matching cart line exists", () => {
      const { store } = makeStore();
      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r, render: () => null };
      });

      expect(result.matchedLineItem).toBeNull();
    });

    it("reflects the matching cart line for the selected variant", () => {
      const cartLine = makeCartLine("v-red");
      const { store } = makeStore(makeProduct(RED), { lines: [cartLine] });
      const result = mountStandaloneConsumer(() => {
        const r = useProductForm(store);
        return { exposed: r, render: () => null };
      });

      expect(result.matchedLineItem).toEqual(cartLine);
    });
  });
});

// ---------------------------------------------------------------------------
// createProductComponents (factory)
// ---------------------------------------------------------------------------

describe("createProductComponents", () => {
  const {
    ProductProvider,
    useProduct,
    useProductForm: useFactoryProductForm,
  } = createProductComponents<ProductInput>();

  function mountFactoryConsumer<T>(
    setupFn: () => { exposed: T; render: () => ReturnType<typeof h> | null },
    product: ProductInput = makeProduct(RED),
    onSelect?: (result: unknown) => void,
  ): T {
    let captured: T | undefined;
    const Consumer = defineComponent({
      setup() {
        const { exposed, render } = setupFn();
        captured = exposed;
        return render;
      },
    });
    mount(CartProvider, {
      slots: {
        default: () => h(ProductProvider, { product, onSelect }, () => h(Consumer)),
      },
    });
    if (captured === undefined) throw new Error("mountFactoryConsumer: setup was never called");
    return captured;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    cartSubscribeListener = null;
    vi.mocked(createCartStore).mockImplementation((options?: CreateCartStoreOptions) =>
      createMockCartStore(options?.initialData),
    );
    configureCartEndpoint("/api/cart");
  });

  describe("ProductProvider", () => {
    it("throws without CartProvider ancestor", () => {
      const Consumer = defineComponent({
        setup() {
          useFactoryProductForm();
          return () => null;
        },
      });

      expect(() => {
        mount(ProductProvider, {
          props: { product: makeProduct() },
          slots: { default: () => h(Consumer) },
        });
      }).toThrow(/CartProvider/);
    });
  });

  describe("useProduct", () => {
    it("throws without ProductProvider ancestor", () => {
      const Consumer = defineComponent({
        setup() {
          useProduct();
          return () => null;
        },
      });

      expect(() => {
        mount(CartProvider, {
          slots: { default: () => h(Consumer) },
        });
      }).toThrow(/ProductProvider/);
    });

    it("returns initial state for preselected variant", () => {
      const result = mountFactoryConsumer(() => {
        const r = useProduct();
        return { exposed: r, render: () => null };
      });

      expect(result.selectedVariant).toBe(RED);
      expect(getColorValue(result as ReturnType<typeof useProductForm>, "Red")?.selected).toBe(
        true,
      );
    });

    it("selectOption updates state and fires onSelect", async () => {
      const onSelect = vi.fn();
      const result = mountFactoryConsumer(
        () => {
          const r = useProduct();
          return { exposed: r, render: () => null };
        },
        makeProduct(RED),
        onSelect,
      );

      result.selectOption("Color", "Blue");
      await nextTick();

      expect(result.selectedVariant).toBe(BLUE);
      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect.mock.calls[0][0].status).toBe("resolved");
    });
  });

  describe("useProductForm (factory)", () => {
    it("throws without ProductProvider ancestor", () => {
      const Consumer = defineComponent({
        setup() {
          useFactoryProductForm();
          return () => null;
        },
      });

      expect(() => {
        mount(CartProvider, {
          slots: { default: () => h(Consumer) },
        });
      }).toThrow(/ProductProvider/);
    });

    it("returns the same shape as the internal store-backed form composable", () => {
      const result = mountFactoryConsumer(() => {
        const r = useFactoryProductForm();
        return { exposed: r, render: () => null };
      });

      expect(result).toEqual(
        expect.objectContaining({
          options: expect.any(Array),
          selectedVariant: expect.anything(),
          register: expect.any(Function),
          formProps: expect.any(Function),
          errors: expect.any(Object),
          selectOption: expect.any(Function),
        }),
      );
      expect(result).toHaveProperty("matchedLineItem");
      expect(result).toHaveProperty("pending");
    });

    it("fires provider onSelect when selectOption is called", () => {
      const onSelect = vi.fn();
      const result = mountFactoryConsumer(
        () => {
          const r = useFactoryProductForm();
          return { exposed: r, render: () => null };
        },
        makeProduct(RED),
        onSelect,
      );

      result.selectOption("Color", "Blue");

      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe("hydration on product change", () => {
    it("hydrates when the product id changes", async () => {
      const product1 = makeProduct(RED, "gid://shopify/Product/1");
      const product2 = makeProduct(BLUE, "gid://shopify/Product/2");

      let result: ReturnType<typeof useFactoryProductForm> | undefined;

      const Consumer = defineComponent({
        setup() {
          result = useFactoryProductForm();
          return () => null;
        },
      });

      const wrapper = mount(CartProvider, {
        slots: {
          default: () => h(ProductProvider, { product: product1 }, () => h(Consumer)),
        },
      });

      if (result === undefined) throw new Error("setup was never called");
      expect(getColorValue(result, "Red")?.selected).toBe(true);

      // Re-mount with a different product to test hydration
      const wrapper2 = mount(CartProvider, {
        slots: {
          default: () => h(ProductProvider, { product: product2 }, () => h(Consumer)),
        },
      });

      await nextTick();
      expect(getColorValue(result, "Blue")?.selected).toBe(true);

      wrapper.unmount();
      wrapper2.unmount();
    });

    it("does not hydrate on mount (avoids double-init)", async () => {
      const result = mountFactoryConsumer(() => {
        const r = useFactoryProductForm();
        return { exposed: r, render: () => null };
      });

      result.selectOption("Color", "Blue");
      await nextTick();

      expect(getColorValue(result, "Blue")?.selected).toBe(true);
    });
  });

  describe("store lifecycle", () => {
    it("destroys store on unmount", () => {
      const Consumer = defineComponent({
        setup() {
          useFactoryProductForm();
          return () => null;
        },
      });

      const wrapper = mount(CartProvider, {
        slots: {
          default: () => h(ProductProvider, { product: makeProduct() }, () => h(Consumer)),
        },
      });

      // Unmounting should not throw — verifies cleanup runs properly
      expect(() => wrapper.unmount()).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// DOM-level integration: template re-rendering after selectOption
// ---------------------------------------------------------------------------

describe("template reactivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cartSubscribeListener = null;
    vi.mocked(createCartStore).mockImplementation((options?: CreateCartStoreOptions) =>
      createMockCartStore(options?.initialData),
    );
    configureCartEndpoint("/api/cart");
  });

  it("DOM updates aria-pressed after clicking an option button (standalone)", async () => {
    const { store } = makeStore();

    const Consumer = defineComponent({
      setup() {
        const form = useProductForm(store);
        return () =>
          h(
            "div",
            form.options.flatMap((opt) =>
              opt.values.map((val) => {
                const reg = form.register("optionValue", {
                  optionName: opt.name,
                  value: val.name,
                });
                return h(
                  "button",
                  {
                    "aria-pressed": String(val.selected),
                    ...reg,
                    key: val.name,
                    "data-value": val.name,
                  },
                  val.name,
                );
              }),
            ),
          );
      },
    });

    const wrapper = mount(CartProvider, {
      slots: { default: () => h(Consumer) },
    });

    const redBtn = wrapper.find('[data-value="Red"]');
    const blueBtn = wrapper.find('[data-value="Blue"]');

    expect(redBtn.attributes("aria-pressed")).toBe("true");
    expect(blueBtn.attributes("aria-pressed")).toBe("false");

    await blueBtn.trigger("click");
    await nextTick();

    expect(redBtn.attributes("aria-pressed")).toBe("false");
    expect(blueBtn.attributes("aria-pressed")).toBe("true");
  });

  it("DOM updates aria-pressed after clicking an option button (factory)", async () => {
    const { ProductProvider: TestProvider, useProductForm: useTestForm } =
      createProductComponents<ProductInput>();

    const Consumer = defineComponent({
      setup() {
        const form = useTestForm();
        return () =>
          h(
            "div",
            form.options.flatMap((opt) =>
              opt.values.map((val) => {
                const reg = form.register("optionValue", {
                  optionName: opt.name,
                  value: val.name,
                });
                return h(
                  "button",
                  {
                    "aria-pressed": String(val.selected),
                    ...reg,
                    key: val.name,
                    "data-value": val.name,
                  },
                  val.name,
                );
              }),
            ),
          );
      },
    });

    const wrapper = mount(CartProvider, {
      slots: {
        default: () => h(TestProvider, { product: makeProduct() }, () => h(Consumer)),
      },
    });

    const redBtn = wrapper.find('[data-value="Red"]');
    const blueBtn = wrapper.find('[data-value="Blue"]');

    expect(redBtn.attributes("aria-pressed")).toBe("true");
    expect(blueBtn.attributes("aria-pressed")).toBe("false");

    await blueBtn.trigger("click");
    await nextTick();

    expect(redBtn.attributes("aria-pressed")).toBe("false");
    expect(blueBtn.attributes("aria-pressed")).toBe("true");
  });

  it("v-bind with register spreads onClick correctly onto native button", async () => {
    const { store } = makeStore();

    const Consumer = defineComponent({
      setup() {
        const form = useProductForm(store);
        return () =>
          h(
            "div",
            form.options.flatMap((opt) =>
              opt.values.map((val) =>
                h("button", {
                  "aria-pressed": String(val.selected),
                  ...form.register("optionValue", {
                    optionName: opt.name,
                    value: val.name,
                  }),
                  key: val.name,
                  "data-value": val.name,
                }),
              ),
            ),
          );
      },
    });

    const wrapper = mount(CartProvider, {
      slots: { default: () => h(Consumer) },
    });

    expect(wrapper.find('[data-value="Red"]').attributes("aria-pressed")).toBe("true");
    expect(wrapper.find('[data-value="Blue"]').attributes("aria-pressed")).toBe("false");

    await wrapper.find('[data-value="Blue"]').trigger("click");
    await nextTick();

    expect(wrapper.find('[data-value="Red"]').attributes("aria-pressed")).toBe("false");
    expect(wrapper.find('[data-value="Blue"]').attributes("aria-pressed")).toBe("true");
  });
});
