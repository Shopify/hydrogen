import { render, screen, act } from "@testing-library/react";
import { createElement } from "react";
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  configureCartEndpoint as configureCoreCartEndpoint,
  createCartStore,
  type CreateCartStoreOptions,
  type CartStore,
} from "../core/cart/cart";
import type { CartData, CartState } from "../core/cart/state";
import { EMPTY_CART_DATA, EMPTY_CART_STATE, createEmptyCartErrors } from "../core/cart/state";
import { assert } from "../core/test-utils";
import { CartProvider, configureCartEndpoint, useCart, useCartForm, useOptionalCart } from "./cart";

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
type MockInitialData = CartData | CartInitialData;

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
let subscribeListener: (() => void) | null = null;

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function createMockStore(initialData?: MockInitialData): MockCartStore {
  const cart =
    initialData && !isPromiseLike(initialData)
      ? "cart" in initialData
        ? initialData.cart
        : initialData
      : null;
  let state: CartState = cart
    ? makeCartState({ ...cart, loading: false, errors: createEmptyCartErrors() })
    : { ...EMPTY_CART_STATE };
  const store = {
    connect: vi.fn(),
    destroy: vi.fn(),
    hydrate: vi.fn((data: CartData) => {
      state = makeCartState({ ...data, loading: false, errors: createEmptyCartErrors() });
    }),
    getState: vi.fn(() => state),
    subscribe: vi.fn((fn: () => void) => {
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
      subscribeListener?.();
    },
  } as unknown as MockCartStore;
  latestStore = store;
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
  subscribeListener = null;
  vi.mocked(createCartStore).mockImplementation((options) => createMockStore(options?.initialData));
  configureCartEndpoint("/api/cart");
});

describe("CartProvider", () => {
  it("creates cart store with initialData", () => {
    const data = makeCartData({ totalQuantity: 5 });

    render(createElement(CartProvider, { initialData: { cart: data } }, null));

    expect(createCartStore).toHaveBeenCalledWith({ initialData: { cart: data } });
  });

  it("does not recreate store on re-render", () => {
    const data = makeCartData({ totalQuantity: 5 });

    const { rerender } = render(createElement(CartProvider, { initialData: { cart: data } }, null));
    rerender(createElement(CartProvider, { initialData: { cart: data } }, null));

    expect(createCartStore).toHaveBeenCalledTimes(1);
  });

  it("does not fetch when initialData has an empty cart fixture", () => {
    render(createElement(CartProvider, { initialData: { cart: EMPTY_CART_DATA } }, null));

    expect(createCartStore).toHaveBeenCalledWith({ initialData: { cart: EMPTY_CART_DATA } });
    expect(latestStore.connect).toHaveBeenCalledTimes(1);
    expect(latestStore.fetch).not.toHaveBeenCalled();
  });

  it("does not fetch when async initialData is provided", () => {
    const initialData = Promise.resolve({ cart: makeCartData({ totalQuantity: 5 }) });

    render(createElement(CartProvider, { initialData }, null));

    expect(createCartStore).toHaveBeenCalledWith({ initialData });
    expect(latestStore.connect).toHaveBeenCalledTimes(1);
    expect(latestStore.fetch).not.toHaveBeenCalled();
  });

  it("does not fetch when initialData has a null cart", () => {
    render(createElement(CartProvider, { initialData: { cart: null } }, null));

    expect(createCartStore).toHaveBeenCalledWith({ initialData: { cart: null } });
    expect(latestStore.connect).toHaveBeenCalledTimes(1);
    expect(latestStore.fetch).not.toHaveBeenCalled();
  });

  it("delegates omitted initialData loading to connect", () => {
    render(createElement(CartProvider, null, null));

    expect(createCartStore).toHaveBeenCalledWith({ initialData: undefined });
    expect(latestStore.connect).toHaveBeenCalledTimes(1);
    expect(latestStore.fetch).not.toHaveBeenCalled();
  });
});

describe("useCart", () => {
  it("returns selected slice of cart state", () => {
    vi.mocked(createCartStore).mockImplementation(() =>
      createMockStore(makeCartData({ totalQuantity: 7 })),
    );

    function Consumer() {
      const qty = useCart((s) => s.data.totalQuantity);
      return createElement("span", { "data-testid": "qty" }, qty);
    }

    render(createElement(CartProvider, null, createElement(Consumer)));

    expect(screen.getByTestId("qty").textContent).toBe("7");
  });

  it("re-renders only when selected slice changes", () => {
    vi.mocked(createCartStore).mockImplementation(() =>
      createMockStore(makeCartData({ totalQuantity: 3 })),
    );
    const renderSpy = vi.fn();

    function Consumer() {
      const qty = useCart((s) => s.data.totalQuantity);
      renderSpy();
      return createElement("span", null, qty);
    }

    render(createElement(CartProvider, null, createElement(Consumer)));
    const initialRenderCount = renderSpy.mock.calls.length;

    act(() => {
      latestStore.setState(
        makeCartState({
          totalQuantity: 3,
          errors: {
            ...createEmptyCartErrors(),
            cart: { userErrors: [{ code: "INVALID" as const, message: "Y" }], warnings: [] },
          },
        }),
      );
    });

    expect(renderSpy).toHaveBeenCalledTimes(initialRenderCount);
  });

  it("with isEqual: custom equality prevents spurious re-renders", () => {
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
    vi.mocked(createCartStore).mockImplementation(() => createMockStore(data));
    const renderSpy = vi.fn();

    function Consumer() {
      const lines = useCart(
        (s) => s.data.lines.nodes,
        (a, b) =>
          a.length === b.length &&
          a.every((l, i) => l.id === b[i].id && l.quantity === b[i].quantity),
      );
      renderSpy();
      return createElement("span", { "data-testid": "count" }, lines.length);
    }

    render(createElement(CartProvider, null, createElement(Consumer)));
    const initialRenderCount = renderSpy.mock.calls.length;

    act(() => {
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
    });

    expect(renderSpy).toHaveBeenCalledTimes(initialRenderCount);
  });

  it("server snapshot returns EMPTY_CART_STATE slice", () => {
    function Consumer() {
      const qty = useCart((s) => s.data.totalQuantity);
      return createElement("span", { "data-testid": "qty" }, qty);
    }

    render(createElement(CartProvider, null, createElement(Consumer)));
    expect(screen.getByTestId("qty").textContent).toBe("0");
  });

  it("selector closes over latest props on re-render", () => {
    vi.mocked(createCartStore).mockImplementation(() =>
      createMockStore(
        makeCartData({
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
            {
              id: "l2",
              quantity: 5,
              cost: {
                totalAmount: { amount: "50", currencyCode: "USD" },
                subtotalAmount: { amount: "50", currencyCode: "USD" },
                amountPerQuantity: { amount: "10", currencyCode: "USD" },
                compareAtAmountPerQuantity: null,
              },
            },
          ],
        }),
      ),
    );

    function Consumer({ lineId }: { lineId: string }) {
      const found = useCart((s) => s.data.lines.nodes.find((l) => l.id === lineId));
      return createElement("span", { "data-testid": "qty" }, found?.quantity ?? "-");
    }

    const { rerender } = render(
      createElement(CartProvider, null, createElement(Consumer, { lineId: "l1" })),
    );
    expect(screen.getByTestId("qty").textContent).toBe("2");

    rerender(createElement(CartProvider, null, createElement(Consumer, { lineId: "l2" })));
    expect(screen.getByTestId("qty").textContent).toBe("5");
  });

  it("derived selector does not trigger React unstable snapshot warning", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      vi.mocked(createCartStore).mockImplementation(() =>
        createMockStore(makeCartData({ totalQuantity: 3 })),
      );

      function Consumer() {
        const summary = useCart((s) => ({ qty: s.data.totalQuantity }));
        return createElement("span", { "data-testid": "qty" }, summary.qty);
      }

      render(createElement(CartProvider, null, createElement(Consumer)));

      act(() => {
        latestStore.setState(makeCartState({ totalQuantity: 5 }));
      });

      const warned = errorSpy.mock.calls.some(
        (args) => typeof args[0] === "string" && args[0].includes("getSnapshot should be cached"),
      );
      expect(warned).toBe(false);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe("useOptionalCart", () => {
  it("returns undefined outside CartProvider", () => {
    function Consumer() {
      const qty = useOptionalCart((s) => s.data.totalQuantity);
      return createElement("span", { "data-testid": "qty" }, qty ?? "missing");
    }

    render(createElement(Consumer));

    expect(screen.getByTestId("qty").textContent).toBe("missing");
  });

  it("returns selected cart state inside CartProvider", () => {
    vi.mocked(createCartStore).mockImplementation(() =>
      createMockStore(makeCartData({ totalQuantity: 9 })),
    );

    function Consumer() {
      const qty = useOptionalCart((s) => s.data.totalQuantity);
      return createElement("span", { "data-testid": "qty" }, qty);
    }

    render(createElement(CartProvider, null, createElement(Consumer)));

    expect(screen.getByTestId("qty").textContent).toBe("9");
  });
});

describe("useCartForm", () => {
  it("formProps returns method, action, and onSubmit", () => {
    let result: ReturnType<ReturnType<typeof useCartForm>["formProps"]> | undefined;

    function Consumer() {
      const { formProps } = useCartForm();
      result = formProps();
      return null;
    }

    render(createElement(CartProvider, null, createElement(Consumer)));
    assert(result, "expected formProps to be assigned");

    expect(result.method).toBe("post");
    expect(result.action).toBe("/api/cart");
    expect(result.onSubmit).toBeTypeOf("function");
  });

  it("formProps.onSubmit calls store.handleFormSubmit with native SubmitEvent", () => {
    let capturedProps: any;

    function Consumer() {
      const { formProps } = useCartForm();
      capturedProps = formProps();
      return null;
    }

    render(createElement(CartProvider, null, createElement(Consumer)));

    const nativeEvent = new SubmitEvent("submit", { submitter: null });

    const syntheticEvent = {
      preventDefault: vi.fn(),
      defaultPrevented: false,
      nativeEvent,
    } as any;

    capturedProps.onSubmit(syntheticEvent);

    expect(syntheticEvent.preventDefault).toHaveBeenCalled();
    expect(latestStore.handleFormSubmit).toHaveBeenCalledWith(nativeEvent);
  });

  it("beforeSubmit can prevent cart submission via e.preventDefault()", () => {
    let capturedProps: any;

    function Consumer() {
      const { formProps } = useCartForm();
      capturedProps = formProps({
        beforeSubmit: (e: any) => e.preventDefault(),
      });
      return null;
    }

    render(createElement(CartProvider, null, createElement(Consumer)));

    const nativeEvent = new SubmitEvent("submit", { submitter: null });
    let prevented = false;
    const syntheticEvent = {
      preventDefault: vi.fn(() => {
        prevented = true;
      }),
      get defaultPrevented() {
        return prevented;
      },
      nativeEvent,
    } as any;

    capturedProps.onSubmit(syntheticEvent);

    expect(latestStore.handleFormSubmit).not.toHaveBeenCalled();
  });

  it("afterSubmit runs after store.handleFormSubmit", () => {
    const afterSpy = vi.fn();
    let capturedProps: any;

    function Consumer() {
      const { formProps } = useCartForm();
      capturedProps = formProps({ afterSubmit: afterSpy });
      return null;
    }

    render(createElement(CartProvider, null, createElement(Consumer)));

    const nativeEvent = new SubmitEvent("submit", { submitter: null });
    const syntheticEvent = {
      preventDefault: vi.fn(),
      defaultPrevented: false,
      nativeEvent,
    } as any;

    capturedProps.onSubmit(syntheticEvent);

    expect(latestStore.handleFormSubmit).toHaveBeenCalled();
    expect(afterSpy).toHaveBeenCalledWith(syntheticEvent);
  });

  it("afterSubmit does not run when beforeSubmit prevents", () => {
    const afterSpy = vi.fn();
    let capturedProps: any;

    function Consumer() {
      const { formProps } = useCartForm();
      capturedProps = formProps({
        beforeSubmit: (e: any) => e.preventDefault(),
        afterSubmit: afterSpy,
      });
      return null;
    }

    render(createElement(CartProvider, null, createElement(Consumer)));

    const nativeEvent = new SubmitEvent("submit", { submitter: null });
    let prevented = false;
    const syntheticEvent = {
      preventDefault: vi.fn(() => {
        prevented = true;
      }),
      get defaultPrevented() {
        return prevented;
      },
      nativeEvent,
    } as any;

    capturedProps.onSubmit(syntheticEvent);

    expect(latestStore.handleFormSubmit).not.toHaveBeenCalled();
    expect(afterSpy).not.toHaveBeenCalled();
  });

  it("register returns correct attributes", () => {
    let register: ReturnType<typeof useCartForm>["register"] | undefined;

    function Consumer() {
      ({ register } = useCartForm());
      return null;
    }

    render(createElement(CartProvider, null, createElement(Consumer)));
    assert(register, "expected register to be assigned");

    expect(register("lineId", { value: "line-1" })).toEqual({
      name: "lineId",
      value: "line-1",
      readOnly: true,
    });
    expect(register("increase")).toEqual({
      name: "intent",
      value: "increase",
    });
    expect(register("add")).toEqual({ name: "intent", value: "add" });
    expect(register("remove")).toEqual({ name: "intent", value: "remove" });
  });

  it("interactive quantity register returns defaultValue instead of value", () => {
    let register: ReturnType<typeof useCartForm>["register"] | undefined;

    function Consumer() {
      ({ register } = useCartForm());
      return null;
    }

    render(createElement(CartProvider, null, createElement(Consumer)));
    assert(register, "expected register to be assigned");

    const result = register("quantity", {
      value: 5,
      interactive: true,
    }) as unknown as Record<string, unknown>;
    expect(result).not.toHaveProperty("value");
    expect(result.defaultValue).toBe("5");
    expect(result.name).toBe("quantity");
    expect(result.type).toBe("text");
    expect(result.ref).toBeTypeOf("function");
  });
});

describe("useCart pending state", () => {
  it("useCart(s => s.pending.lines) returns pending lines Set", () => {
    const mockStore = createMockStore();
    mockStore.setState(
      makeCartState({
        pending: { lines: new Set(["line-1"]), note: false, discountCodes: new Set() },
      }),
    );
    vi.mocked(createCartStore).mockImplementation(() => mockStore);

    function Consumer() {
      const pendingLines = useCart((s) => s.pending.lines);
      return createElement(
        "span",
        { "data-testid": "result" },
        pendingLines.has("line-1") ? "yes" : "no",
      );
    }

    render(createElement(CartProvider, null, createElement(Consumer)));
    expect(screen.getByTestId("result").textContent).toBe("yes");
  });

  it("useCart(s => s.pending.note) returns pending note boolean", () => {
    const mockStore = createMockStore();
    mockStore.setState(
      makeCartState({
        pending: { lines: new Set(), note: true, discountCodes: new Set() },
      }),
    );
    vi.mocked(createCartStore).mockImplementation(() => mockStore);

    function Consumer() {
      const pendingNote = useCart((s) => s.pending.note);
      return createElement("span", { "data-testid": "result" }, pendingNote ? "yes" : "no");
    }

    render(createElement(CartProvider, null, createElement(Consumer)));
    expect(screen.getByTestId("result").textContent).toBe("yes");
  });

  it("useCart(s => s.pending.discountCodes) returns pending codes Set", () => {
    const mockStore = createMockStore();
    mockStore.setState(
      makeCartState({
        pending: { lines: new Set(), note: false, discountCodes: new Set(["SAVE10"]) },
      }),
    );
    vi.mocked(createCartStore).mockImplementation(() => mockStore);

    function Consumer() {
      const pendingCodes = useCart((s) => s.pending.discountCodes);
      return createElement(
        "span",
        { "data-testid": "result" },
        pendingCodes.has("SAVE10") ? "yes" : "no",
      );
    }

    render(createElement(CartProvider, null, createElement(Consumer)));
    expect(screen.getByTestId("result").textContent).toBe("yes");
  });
});

describe("cartEndpoint option", () => {
  it("defaults formProps.action to /api/cart", () => {
    let result: ReturnType<ReturnType<typeof useCartForm>["formProps"]> | undefined;

    function Consumer() {
      const { formProps } = useCartForm();
      result = formProps();
      return null;
    }

    render(createElement(CartProvider, null, createElement(Consumer)));
    assert(result, "expected formProps to be assigned");

    expect(result.action).toBe("/api/cart");
  });

  it("custom cartEndpoint configures transport and flows to formProps.action", () => {
    configureCartEndpoint("/custom/cart");
    let result: ReturnType<ReturnType<typeof useCartForm>["formProps"]> | undefined;

    function Consumer() {
      const { formProps } = useCartForm();
      result = formProps();
      return null;
    }

    render(createElement(CartProvider, null, createElement(Consumer)));
    assert(result, "expected formProps to be assigned");

    expect(result.action).toBe("/custom/cart");
    expect(configureCoreCartEndpoint).toHaveBeenCalledWith("/custom/cart");
  });
});
