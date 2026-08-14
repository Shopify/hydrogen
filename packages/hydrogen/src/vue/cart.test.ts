// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { defineComponent, h, nextTick } from "vue";

import {
  configureCartEndpoint as configureCoreCartEndpoint,
  createCartStore,
  type CreateCartStoreOptions,
  type CartStore,
} from "../core/cart/cart";
import type { CartData, CartState } from "../core/cart/state";
import { EMPTY_CART_DATA, EMPTY_CART_STATE } from "../core/cart/state";
import { assert } from "../core/test-utils";
import {
  CartProvider,
  configureCartEndpoint,
  useCart,
  useCartAnalytics,
  useCartForm,
  useOptionalCart,
} from "./cart";

vi.mock("../core/cart/cart", () => ({
  configureCartEndpoint: vi.fn(),
  createCartStore: vi.fn(),
}));

type CartDataOverrides = Omit<Partial<CartData>, "lines"> & {
  lines?: CartData["lines"]["nodes"] | CartData["lines"];
};
type CartStateOverrides = CartDataOverrides & Partial<Omit<CartState, "data">>;
type CartInitialData<TData extends CartData = CartData> =
  CreateCartStoreOptions<TData>["initialData"];
type MockInitialData = CartState | CartInitialData | null;

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

type MockCartStore = CartStore & {
  setState(state: CartState): void;
};

let latestStore: MockCartStore;
let subscribeListener: ((state: CartState) => void) | null = null;

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function createMockStore(initialState: MockInitialData = { ...EMPTY_CART_STATE }): MockCartStore {
  let state = { ...EMPTY_CART_STATE };
  if (initialState && !isPromiseLike(initialState)) {
    state =
      "data" in initialState
        ? initialState
        : "cart" in initialState
          ? initialState.cart
            ? makeCartState(initialState.cart)
            : state
          : state;
  }
  const store = {
    connect: vi.fn(),
    destroy: vi.fn(),
    hydrate: vi.fn((data: CartData) => {
      state = makeCartState(data);
    }),
    getState: vi.fn(() => state),
    subscribe: vi.fn((fn: (state: CartState) => void) => {
      subscribeListener = fn;
      return () => {
        subscribeListener = null;
      };
    }),
    fetch: vi.fn(() => Promise.resolve()),
    reset: vi.fn(),
    handleFormSubmit: vi.fn(() => Promise.resolve()),
    setState(next: CartState) {
      state = next;
      subscribeListener?.(state);
    },
  } as unknown as MockCartStore;
  latestStore = store;
  return store;
}

function mountWithConsumer<T>(
  setupFn: () => { exposed: T; render: () => ReturnType<typeof h> | null },
  providerProps?: Record<string, unknown>,
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
    ...providerProps,
    slots: { default: () => h(Consumer) },
  });
  if (captured === undefined) throw new Error("mountWithConsumer: setup was never called");
  return captured;
}

beforeEach(() => {
  vi.clearAllMocks();
  subscribeListener = null;
  vi.mocked(createCartStore).mockImplementation((options) => createMockStore(options?.initialData));
  configureCartEndpoint("/api/cart");
  delete (window as { Shopify?: unknown }).Shopify;
});

describe("useCartAnalytics", () => {
  it("subscribes the cart store to analytics tracking on mount and unsubscribes on unmount", () => {
    (window as { Shopify?: unknown }).Shopify = {
      analytics: { publish: vi.fn(), getConfig: () => ({}) },
    };

    const wrapper = mount(CartProvider, {
      slots: {
        default: () =>
          h(
            defineComponent({
              setup() {
                useCartAnalytics();
                return () => null;
              },
            }),
          ),
      },
    });

    expect(subscribeListener).not.toBeNull();

    wrapper.unmount();

    expect(subscribeListener).toBeNull();
  });

  it("throws a composable-specific error outside CartProvider", () => {
    const Consumer = defineComponent({
      setup() {
        useCartAnalytics();
        return () => null;
      },
    });

    expect(() => mount(Consumer)).toThrow("useCartAnalytics must be used inside a <CartProvider>");
  });
});

describe("CartProvider", () => {
  it("creates cart store with initialData", () => {
    const data = makeCartData({ totalQuantity: 5 });

    mount(CartProvider, { props: { initialData: { cart: data } } });

    expect(createCartStore).toHaveBeenCalledWith({ initialData: { cart: data } });
  });

  it("does not fetch when async initialData is provided", () => {
    const initialData = Promise.resolve({ cart: makeCartData({ totalQuantity: 5 }) });

    mount(CartProvider, { props: { initialData } });

    expect(createCartStore).toHaveBeenCalledWith({ initialData });
    expect(latestStore.connect).toHaveBeenCalledTimes(1);
    expect(latestStore.fetch).not.toHaveBeenCalled();
  });

  it("does not fetch when initialData has a null cart", () => {
    mount(CartProvider, {
      props: { initialData: { cart: null } },
    });

    expect(createCartStore).toHaveBeenCalledWith({ initialData: { cart: null } });
    expect(latestStore.connect).toHaveBeenCalledTimes(1);
    expect(latestStore.fetch).not.toHaveBeenCalled();
  });

  it("does not recreate store on re-render", async () => {
    const data = makeCartData({ totalQuantity: 5 });

    const wrapper = mount(CartProvider, { props: { initialData: { cart: data } } });
    await wrapper.setProps({ initialData: { cart: data } });

    expect(createCartStore).toHaveBeenCalledTimes(1);
  });
});

describe("useCart", () => {
  it("returns selected slice of cart state", () => {
    vi.mocked(createCartStore).mockImplementation(() =>
      createMockStore({ cart: makeCartData({ totalQuantity: 7 }) }),
    );

    const Consumer = defineComponent({
      setup() {
        const qty = useCart((s) => s.data.totalQuantity);
        return () => h("span", { "data-testid": "qty" }, qty.value);
      },
    });

    const wrapper = mount(CartProvider, {
      slots: { default: () => h(Consumer) },
    });

    expect(wrapper.find('[data-testid="qty"]').text()).toBe("7");
  });

  it("re-renders only when selected slice changes", async () => {
    vi.mocked(createCartStore).mockImplementation(() =>
      createMockStore({ cart: makeCartData({ totalQuantity: 3 }) }),
    );
    const renderSpy = vi.fn();

    const Consumer = defineComponent({
      setup() {
        const qty = useCart((s) => s.data.totalQuantity);
        return () => {
          renderSpy();
          return h("span", null, qty.value);
        };
      },
    });

    mount(CartProvider, {
      slots: { default: () => h(Consumer) },
    });
    const initialRenderCount = renderSpy.mock.calls.length;

    latestStore.setState(makeCartState({ totalQuantity: 3, note: "changed" }));
    await nextTick();

    expect(renderSpy).toHaveBeenCalledTimes(initialRenderCount);
  });

  it("with isEqual: custom equality prevents spurious re-renders", async () => {
    const data = makeCartData({
      lines: [
        {
          id: "l1",
          quantity: 2,
          cost: {
            totalAmount: { amount: "20", currencyCode: "USD" },
            subtotalAmount: { amount: "20", currencyCode: "USD" },
            amountPerQuantity: { amount: "10", currencyCode: "USD" },
            compareAtAmountPerQuantity: null,
          },
        },
      ],
    });
    vi.mocked(createCartStore).mockImplementation(() => createMockStore({ cart: data }));
    const renderSpy = vi.fn();

    const Consumer = defineComponent({
      setup() {
        const lines = useCart(
          (s) => s.data.lines.nodes,
          (a, b) =>
            a.length === b.length &&
            a.every((l, i) => l.id === b[i].id && l.quantity === b[i].quantity),
        );
        return () => {
          renderSpy();
          return h("span", { "data-testid": "count" }, lines.value.length);
        };
      },
    });

    mount(CartProvider, {
      slots: { default: () => h(Consumer) },
    });
    const initialRenderCount = renderSpy.mock.calls.length;

    latestStore.setState(
      makeCartState({
        lines: [
          {
            id: "l1",
            quantity: 2,
            cost: {
              totalAmount: { amount: "20.00", currencyCode: "USD" },
              subtotalAmount: { amount: "20.00", currencyCode: "USD" },
              amountPerQuantity: { amount: "10.00", currencyCode: "USD" },
              compareAtAmountPerQuantity: null,
            },
          },
        ],
      }),
    );
    await nextTick();

    expect(renderSpy).toHaveBeenCalledTimes(initialRenderCount);
  });

  it("server snapshot returns EMPTY_CART_STATE slice", () => {
    const Consumer = defineComponent({
      setup() {
        const qty = useCart((s) => s.data.totalQuantity);
        return () => h("span", { "data-testid": "qty" }, qty.value);
      },
    });

    const wrapper = mount(CartProvider, {
      slots: { default: () => h(Consumer) },
    });
    expect(wrapper.find('[data-testid="qty"]').text()).toBe("0");
  });

  it("returns full cart state when called without a selector", () => {
    vi.mocked(createCartStore).mockImplementation(() =>
      createMockStore({ cart: makeCartData({ totalQuantity: 42 }) }),
    );

    const Consumer = defineComponent({
      setup() {
        const cart = useCart();
        return () => h("span", { "data-testid": "qty" }, cart.value.data.totalQuantity);
      },
    });

    const wrapper = mount(CartProvider, {
      slots: { default: () => h(Consumer) },
    });

    expect(wrapper.find('[data-testid="qty"]').text()).toBe("42");
  });
});

describe("useOptionalCart", () => {
  it("returns undefined outside CartProvider", () => {
    const Consumer = defineComponent({
      setup() {
        const qty = useOptionalCart((s) => s.data.totalQuantity);
        return () => h("span", { "data-testid": "qty" }, qty.value ?? "missing");
      },
    });

    const wrapper = mount(Consumer);

    expect(wrapper.find('[data-testid="qty"]').text()).toBe("missing");
  });

  it("returns selected cart state inside CartProvider", () => {
    vi.mocked(createCartStore).mockImplementation(() =>
      createMockStore(makeCartState({ totalQuantity: 9 })),
    );

    const Consumer = defineComponent({
      setup() {
        const qty = useOptionalCart((s) => s.data.totalQuantity);
        return () => h("span", { "data-testid": "qty" }, qty.value);
      },
    });

    const wrapper = mount(CartProvider, {
      slots: { default: () => h(Consumer) },
    });

    expect(wrapper.find('[data-testid="qty"]').text()).toBe("9");
  });
});

describe("useCartForm", () => {
  it("formProps returns onSubmit, method, and action", () => {
    const result = mountWithConsumer(() => {
      const { formProps } = useCartForm();
      return { exposed: formProps(), render: () => null };
    });

    expect(result.method).toBe("post");
    expect(result.action).toBe("/api/cart");
    expect(typeof result.onSubmit).toBe("function");
  });

  it("formProps.onSubmit calls store.handleFormSubmit with native SubmitEvent", () => {
    const props = mountWithConsumer(() => {
      const { formProps } = useCartForm();
      return { exposed: formProps(), render: () => null };
    });

    const form = document.createElement("form");
    const nativeEvent = new SubmitEvent("submit", { submitter: null });
    Object.defineProperty(nativeEvent, "target", { value: form });
    Object.defineProperty(nativeEvent, "preventDefault", {
      value: vi.fn(),
    });

    (props.onSubmit as (e: Event) => void)(nativeEvent);

    expect(nativeEvent.preventDefault).toHaveBeenCalled();
    expect(latestStore.handleFormSubmit).toHaveBeenCalledWith(nativeEvent);
  });

  it("formProps.beforeSubmit can prevent submission", () => {
    const props = mountWithConsumer(() => {
      const { formProps } = useCartForm();
      return {
        exposed: formProps({ beforeSubmit: (e) => e.preventDefault() }),
        render: () => null,
      };
    });

    const form = document.createElement("form");
    const nativeEvent = new SubmitEvent("submit", { submitter: null, cancelable: true });
    Object.defineProperty(nativeEvent, "target", { value: form });

    (props.onSubmit as (e: Event) => void)(nativeEvent);

    expect(latestStore.handleFormSubmit).not.toHaveBeenCalled();
  });

  it("formProps.afterSubmit is called after submission", () => {
    const afterSubmit = vi.fn();
    const props = mountWithConsumer(() => {
      const { formProps } = useCartForm();
      return { exposed: formProps({ afterSubmit }), render: () => null };
    });

    const form = document.createElement("form");
    const nativeEvent = new SubmitEvent("submit", { submitter: null });
    Object.defineProperty(nativeEvent, "target", { value: form });
    Object.defineProperty(nativeEvent, "preventDefault", { value: vi.fn() });

    (props.onSubmit as (e: Event) => void)(nativeEvent);

    expect(afterSubmit).toHaveBeenCalledWith(nativeEvent);
  });

  it("register returns correct attributes", () => {
    const registerFn = mountWithConsumer(() => {
      const { register } = useCartForm();
      return { exposed: register, render: () => null };
    });

    expect(registerFn("lineId", { value: "line-1" })).toEqual({
      name: "lineId",
      value: "line-1",
      readOnly: true,
    });
    expect(registerFn("increase")).toEqual({
      name: "intent",
      value: "increase",
    });
    expect(registerFn("remove")).toEqual({ name: "intent", value: "remove" });
  });

  it("isPending.initial is true while loading", () => {
    vi.mocked(createCartStore).mockImplementation(() =>
      createMockStore({ ...EMPTY_CART_STATE, loading: true }),
    );

    let isPending: ReturnType<typeof useCartForm>["isPending"] | undefined;

    const Consumer = defineComponent({
      setup() {
        ({ isPending } = useCartForm());
        return () => null;
      },
    });

    mount(CartProvider, {
      slots: { default: () => h(Consumer) },
    });

    assert(isPending, "isPending is not defined");
    expect(isPending.initial.value).toBe(true);
  });

  it("isPending.initial is false after hydration", () => {
    const data = makeCartData({ loading: false });

    let isPending: ReturnType<typeof useCartForm>["isPending"] | undefined;

    const Consumer = defineComponent({
      setup() {
        ({ isPending } = useCartForm());
        return () => null;
      },
    });

    mount(CartProvider, {
      props: { initialData: { cart: data } },
      slots: { default: () => h(Consumer) },
    });

    assert(isPending, "isPending is not defined");
    expect(isPending.initial.value).toBe(false);
  });

  it("isPending.lines reflects pending line state", () => {
    vi.mocked(createCartStore).mockImplementation(() =>
      createMockStore(
        makeCartState({
          pending: {
            lines: new Set(["line-1"]),
            note: false,
            attributes: false,
            discountCodes: new Set(),
            cost: true,
          },
        }),
      ),
    );

    let isPending: ReturnType<typeof useCartForm>["isPending"] | undefined;

    const Consumer = defineComponent({
      setup() {
        ({ isPending } = useCartForm());
        return () => null;
      },
    });

    mount(CartProvider, {
      slots: { default: () => h(Consumer) },
    });

    assert(isPending, "isPending is not defined");
    expect(isPending.lines()).toBe(true);
  });

  it("isPending.lines(lineId) checks specific line", () => {
    vi.mocked(createCartStore).mockImplementation(() =>
      createMockStore(
        makeCartState({
          pending: {
            lines: new Set(["line-1"]),
            note: false,
            attributes: false,
            discountCodes: new Set(),
            cost: true,
          },
        }),
      ),
    );

    let isPending: ReturnType<typeof useCartForm>["isPending"] | undefined;

    const Consumer = defineComponent({
      setup() {
        ({ isPending } = useCartForm());
        return () => null;
      },
    });

    mount(CartProvider, {
      slots: { default: () => h(Consumer) },
    });

    assert(isPending, "isPending is not defined");
    expect(isPending.lines("line-1")).toBe(true);
    expect(isPending.lines("line-2")).toBe(false);
  });
});

describe("cartEndpoint option", () => {
  it("defaults formProps.action to /api/cart", () => {
    const result = mountWithConsumer(() => {
      const { formProps } = useCartForm();
      return { exposed: formProps(), render: () => null };
    });

    expect(result.action).toBe("/api/cart");
  });

  it("custom cartEndpoint configures transport and flows to formProps.action", () => {
    configureCartEndpoint("/custom/cart");

    const result = mountWithConsumer(() => {
      const { formProps } = useCartForm();
      return { exposed: formProps(), render: () => null };
    });

    expect(result.action).toBe("/custom/cart");
    expect(configureCoreCartEndpoint).toHaveBeenCalledWith("/custom/cart");
  });
});
