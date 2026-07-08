// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { CartActionError } from "../../../vendor/standard-actions";
import { SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT } from "../shopify-scripts";
import { assert } from "../test-utils";
import {
  configureCartEndpoint,
  getShopifyStandardActions,
  resetStandardActionsForTests,
  STANDARD_ACTION_TIMEOUT_IN_MS,
  createCartStore,
  CartNetworkError,
  revalidateConnectedCartCheckoutUrls,
  type CartStore,
} from "./cart";
import type { CartData, CartLine, CartPending } from "./state";
import {
  EMPTY_CART_DATA,
  EMPTY_CART_STATE,
  createEmptyPending,
  createEmptyCartErrors,
} from "./state";

function makeLine(overrides: Partial<CartLine> & { id: string }): CartLine {
  return {
    quantity: 1,
    cost: {
      totalAmount: { amount: "10", currencyCode: "USD" },
      subtotalAmount: { amount: "10", currencyCode: "USD" },
      amountPerQuantity: { amount: "10", currencyCode: "USD" },
      compareAtAmountPerQuantity: null,
    },
    ...overrides,
  };
}

function makePending(overrides: Partial<CartPending> = {}): CartPending {
  return { ...createEmptyPending(), ...overrides };
}

const lineWithMerchandise = (id: string, quantity: number, merchandiseId: string) =>
  makeLine({
    id,
    quantity,
    merchandise: {
      id: merchandiseId,
      title: "Small",
      product: { title: "T-Shirt" },
    },
  });

const serverResult = (overrides: Record<string, unknown> = {}) => ({
  cart: {
    id: "gid://shopify/Cart/123",
    totalQuantity: 1,
    cost: { totalAmount: { amount: "10", currencyCode: "USD" } },
    lines: [
      { id: "line-1", quantity: 1, cost: { totalAmount: { amount: "10", currencyCode: "USD" } } },
    ],
    discountCodes: [],
    ...overrides,
  },
});

const productDetail = (merchandiseId: string, overrides: Record<string, unknown> = {}) => ({
  id: merchandiseId,
  title: "Small",
  product: { title: "T-Shirt" },
  ...overrides,
});

const withProducts = (...products: Array<Record<string, unknown>>) => ({
  event: { detail: { products } },
});

const serverCart = (totalQuantity: number, lines: Array<{ id: string; quantity: number }>) => ({
  cart: {
    id: "gid://shopify/Cart/123",
    totalQuantity,
    cost: { totalAmount: { amount: String(totalQuantity * 10), currencyCode: "USD" } },
    lines: lines.map((l) => ({
      ...l,
      cost: { totalAmount: { amount: String(l.quantity * 10), currencyCode: "USD" } },
    })),
    discountCodes: [],
  },
});

type CartDataOverrides = Omit<Partial<CartData>, "lines"> & {
  lines?: CartLine[] | CartData["lines"];
};

function makeCartState(overrides: CartDataOverrides = {}): CartData {
  const { lines, ...rest } = overrides;

  return {
    ...EMPTY_CART_DATA,
    id: "gid://shopify/Cart/123",
    ...rest,
    ...(lines && { lines: Array.isArray(lines) ? { nodes: lines } : lines }),
  };
}

function getCartLines(cart: CartData): CartLine[] {
  return cart.lines.nodes;
}

function submitForm(
  fields: Record<string, string>,
  submitterName: string,
  submitterValue = "",
): SubmitEvent {
  const form = document.createElement("form");
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  const button = document.createElement("button");
  button.type = "submit";
  button.name = submitterName;
  button.value = submitterValue;
  form.appendChild(button);

  document.body.appendChild(form);

  let capturedEvent!: SubmitEvent;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    capturedEvent = e;
  });
  button.click();

  document.body.removeChild(form);
  return capturedEvent;
}

interface Deferred<T = unknown> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T = unknown>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const nextTick = () => Promise.resolve();

let updateDeferreds: Deferred[] = [];
let configuredUpdateCartHandler:
  | ((
      defaultHandler: () => Promise<unknown>,
      payload: unknown,
      options?: unknown,
    ) => Promise<unknown>)
  | null = null;
let configuredUpdateCartEventTarget: (() => EventTarget) | null = null;

function createStandardActionsMock() {
  let isDefault = true;
  const mock = Object.assign(vi.fn(), {
    configure: vi.fn(),
    isDefault: vi.fn(() => isDefault),
  });

  mock.configure.mockImplementation(
    (config: {
      handler: NonNullable<typeof configuredUpdateCartHandler>;
      eventTarget?: () => EventTarget;
    }) => {
      configuredUpdateCartHandler = config.handler;
      configuredUpdateCartEventTarget = config.eventTarget ?? null;
      isDefault = false;
      return true;
    },
  );

  mock.mockImplementation((payload: any, options?: { signal?: AbortSignal }) => {
    const eventDeferred = createDeferred();
    const returnDeferred = createDeferred();

    // The event listener may skip awaiting event.promise (e.g. when it detects
    // an internal marker and returns early). Suppress unhandled rejections on
    // the event deferred — only the return deferred matters for callers.
    eventDeferred.promise.catch(() => {});

    if (payload.lines) {
      const action = payload.lines.some((l: any) => l.merchandiseId)
        ? "add"
        : payload.lines.some((l: any) => l.quantity === 0)
          ? "remove"
          : "update";

      const event = Object.assign(
        new Event("shopify:cart:lines-update", { bubbles: true, cancelable: true }),
        {
          action,
          context: "standard-action" as const,
          lines: payload.lines,
          promise: eventDeferred.promise,
          detail: (options as any)?.event?.detail,
        },
      );
      document.dispatchEvent(event);
    } else if (payload.discountCodes !== undefined) {
      const event = Object.assign(
        new Event("shopify:cart:discount-update", { bubbles: true, cancelable: true }),
        {
          discountCodes: payload.discountCodes.map((c: string) => ({ code: c })),
          promise: eventDeferred.promise,
          detail: (options as any)?.event?.detail,
        },
      );
      document.dispatchEvent(event);
    } else if (payload.note !== undefined) {
      const event = Object.assign(
        new Event("shopify:cart:note-update", { bubbles: true, cancelable: true }),
        {
          note: payload.note,
          promise: eventDeferred.promise,
        },
      );
      document.dispatchEvent(event);
    }

    if (options?.signal) {
      options.signal.addEventListener("abort", () => {
        const err = new DOMException("The operation was aborted.", "AbortError");
        eventDeferred.reject(err);
        returnDeferred.reject(err);
      });
    }

    updateDeferreds.push({
      promise: returnDeferred.promise,
      resolve: (v: unknown) => {
        eventDeferred.resolve(v);
        returnDeferred.resolve(v);
      },
      reject: (e: unknown) => {
        eventDeferred.reject(e);
        returnDeferred.reject(e);
      },
    });

    return returnDeferred.promise;
  });

  return mock;
}

function resolveUpdate(index: number, value: unknown): void {
  updateDeferreds[index].resolve(value);
}

function rejectUpdate(index: number, error: unknown): void {
  updateDeferreds[index].reject(error);
}

function cartActionError(cause: CartActionError["cause"], message = "Cart action failed"): Error {
  return new Error(message, { cause });
}

let mockUpdateCart: ReturnType<typeof createStandardActionsMock>;
const mockGetCart = vi.fn();
let store: CartStore;

beforeEach(() => {
  updateDeferreds = [];
  configuredUpdateCartHandler = null;
  configuredUpdateCartEventTarget = null;
  mockUpdateCart = createStandardActionsMock();
  mockGetCart.mockReset();
  Object.defineProperty(window, "Shopify", {
    value: { actions: { updateCart: mockUpdateCart, getCart: mockGetCart } },
    configurable: true,
    writable: true,
  });
  resetStandardActionsForTests();
  store = createCartStore({ initialData: { cart: EMPTY_CART_DATA } });
  store.connect();
  store.reset();
});

afterEach(() => {
  store.destroy();
  resetStandardActionsForTests();
  document
    .querySelectorAll(`script[src="${SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT}"]`)
    .forEach((script) => script.remove());
});

describe("createCartStore", () => {
  it("normalizes initialData as hydrated cart state", () => {
    const localStore = createCartStore({
      initialData: {
        cart: makeCartState({
          loading: true,
          pending: makePending({ lines: new Set(["line-1"]), discountCodes: new Set(["SAVE10"]) }),
          errors: {
            ...createEmptyCartErrors(),
            cart: { userErrors: [{ code: "INVALID", message: "old" }], warnings: [] },
          },
        }),
      },
    });

    const state = localStore.getState();
    expect(state.loading).toBe(false);
    expect(state.pending).toEqual({ lines: new Set(), note: false, discountCodes: new Set() });
    expect(state.errors).toEqual(createEmptyCartErrors());
  });

  it("sets loading false when sync initialData has a null cart", () => {
    const localStore = createCartStore({ initialData: { cart: null } });

    expect(localStore.getState().loading).toBe(false);
    expect(localStore.getState().data).toEqual(EMPTY_CART_DATA);

    localStore.destroy();
  });

  it("does not start async initialData before connect", async () => {
    const deferred = createDeferred<{ cart: CartData | null }>();
    const localStore = createCartStore({ initialData: deferred.promise });

    deferred.resolve({ cart: makeCartState({ totalQuantity: 5 }) });
    await nextTick();

    expect(localStore.getState().loading).toBe(true);
    expect(localStore.getState().data.totalQuantity).toBe(0);

    localStore.destroy();
  });

  it("hydrates when connected async initialData resolves", async () => {
    const deferred = createDeferred<{ cart: CartData | null }>();
    const localStore = createCartStore({ initialData: deferred.promise });

    localStore.connect();
    deferred.resolve({ cart: makeCartState({ totalQuantity: 5 }) });

    await vi.waitFor(() => {
      expect(localStore.getState().loading).toBe(false);
    });
    expect(localStore.getState().data.totalQuantity).toBe(5);

    localStore.destroy();
  });

  it("hydrates when connected thenable initialData resolves", async () => {
    const deferred = createDeferred<{ cart: CartData | null }>();
    const initialData: PromiseLike<{ cart: CartData | null }> = {
      // oxlint-disable-next-line unicorn/no-thenable -- verifies framework thenables that are not native Promise instances
      then(onfulfilled, onrejected) {
        return deferred.promise.then(onfulfilled, onrejected);
      },
    };
    const localStore = createCartStore({ initialData });

    localStore.connect();
    deferred.resolve({ cart: makeCartState({ totalQuantity: 7 }) });

    await vi.waitFor(() => {
      expect(localStore.getState().loading).toBe(false);
    });
    expect(localStore.getState().data.totalQuantity).toBe(7);

    localStore.destroy();
  });

  it("reuses connected async initialData for fetch while pending", async () => {
    const deferred = createDeferred<{ cart: CartData | null }>();
    const localStore = createCartStore({ initialData: deferred.promise });

    localStore.connect();
    const fetchPromise = localStore.fetch();

    expect(mockGetCart).not.toHaveBeenCalled();

    deferred.resolve({ cart: makeCartState({ totalQuantity: 5 }) });
    await fetchPromise;

    expect(localStore.getState().loading).toBe(false);
    expect(localStore.getState().data.totalQuantity).toBe(5);

    localStore.destroy();
  });

  it("sets loading to false when connected async initialData rejects", async () => {
    const deferred = createDeferred<{ cart: CartData | null }>();
    const localStore = createCartStore({ initialData: deferred.promise });
    const error = new Error("initial data failed");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    localStore.connect();
    deferred.reject(error);

    await vi.waitFor(() => {
      expect(localStore.getState().loading).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("[hydrogen] cart initial load failed:", error);
    });

    consoleSpy.mockRestore();
    localStore.destroy();
  });

  it("allows fetch after connected async initialData rejects", async () => {
    const deferred = createDeferred<{ cart: CartData | null }>();
    const localStore = createCartStore({ initialData: deferred.promise });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    localStore.connect();
    deferred.reject(new Error("initial data failed"));
    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    mockGetCart.mockResolvedValue({
      cart: makeCartState({ totalQuantity: 6 }),
    });

    await localStore.fetch();

    expect(mockGetCart).toHaveBeenCalledTimes(1);
    expect(localStore.getState().data.totalQuantity).toBe(6);

    consoleSpy.mockRestore();
    localStore.destroy();
  });

  it("does not apply stale async initialData after state changes", async () => {
    const deferred = createDeferred<{ cart: CartData | null }>();
    const localStore = createCartStore({ initialData: deferred.promise });

    localStore.connect();
    localStore.hydrate(makeCartState({ totalQuantity: 1 }));
    deferred.resolve({ cart: makeCartState({ totalQuantity: 9 }) });
    await nextTick();

    expect(localStore.getState().data.totalQuantity).toBe(1);

    localStore.destroy();
  });

  it("fetches omitted initialData on connect", async () => {
    const localStore = createCartStore();
    mockGetCart.mockResolvedValue({
      cart: makeCartState({
        id: "gid://shopify/Cart/connected",
        totalQuantity: 4,
      }),
    });

    localStore.connect();

    await vi.waitFor(() => {
      expect(localStore.getState().data.id).toBe("gid://shopify/Cart/connected");
    });
    expect(localStore.getState().data.totalQuantity).toBe(4);

    localStore.destroy();
  });

  it("starts omitted initialData fetch only once across reconnects", async () => {
    const deferred = createDeferred<{ cart: CartData }>();
    const localStore = createCartStore();
    mockGetCart.mockReturnValue(deferred.promise);

    localStore.connect();
    localStore.destroy();
    localStore.connect();

    await vi.waitFor(() => {
      expect(mockGetCart).toHaveBeenCalledTimes(1);
    });

    deferred.resolve({ cart: makeCartState({ totalQuantity: 3 }) });
    await vi.waitFor(() => {
      expect(localStore.getState().data.totalQuantity).toBe(3);
    });
    expect(mockGetCart).toHaveBeenCalledTimes(1);

    localStore.destroy();
  });

  it("dispatches standard cart events from document", () => {
    expect(configuredUpdateCartEventTarget?.()).toBe(document);
  });
});

describe("CartStore.hydrate", () => {
  it("sets state from initialData", () => {
    const data = makeCartState({ totalQuantity: 5 });
    store.hydrate(data);
    expect(store.getState().data.totalQuantity).toBe(5);
    expect(store.getState().data.id).toBe("gid://shopify/Cart/123");
  });

  it("sets loading to false", () => {
    expect(store.getState().loading).toBe(true);
    store.hydrate(makeCartState());
    expect(store.getState().loading).toBe(false);
  });

  it("resets pending state on hydration", () => {
    store.hydrate(
      makeCartState({
        pending: makePending({ lines: new Set(["line-1"]), discountCodes: new Set(["SAVE10"]) }),
        errors: {
          ...createEmptyCartErrors(),
          cart: { userErrors: [{ code: "INVALID", message: "old" }], warnings: [] },
        },
      }),
    );
    expect(store.getState().pending.lines).toEqual(new Set());
    expect(store.getState().pending.discountCodes).toEqual(new Set());
    expect(store.getState().errors).toEqual(createEmptyCartErrors());
  });

  it("no-ops when same cart ID already hydrated", () => {
    store.hydrate(makeCartState({ totalQuantity: 3 }));
    store.hydrate(
      makeCartState({
        checkoutUrl: "https://example.com/checkouts/fresh",
        totalQuantity: 99,
      }),
    );

    expect(store.getState().data.checkoutUrl).toBeNull();
    expect(store.getState().data.totalQuantity).toBe(3);
  });

  it("no-ops when mutations are in-flight", async () => {
    const line = makeLine({ id: "line-1", quantity: 2 });
    store.hydrate(makeCartState({ lines: [line], totalQuantity: 2 }));

    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    store.hydrate(makeCartState({ totalQuantity: 999 }));
    expect(store.getState().data.totalQuantity).toBe(3);

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 3,
        cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
        lines: [
          {
            id: "line-1",
            quantity: 3,
            cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
    });
    await promise;
  });
});

describe("CartStore.getState", () => {
  it("returns EMPTY_CART_STATE before hydration", () => {
    expect(store.getState()).toEqual(EMPTY_CART_STATE);
  });
});

describe("CartStore.subscribe", () => {
  it("fires on state change and returns unsubscribe", () => {
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    store.hydrate(makeCartState({ totalQuantity: 5 }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalQuantity: 5 }) }),
    );

    unsub();
    store.hydrate(
      makeCartState({
        id: "gid://shopify/Cart/456",
        totalQuantity: 10,
      }),
    );
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("CartStore.reset", () => {
  it("clears state back to EMPTY_CART_STATE", () => {
    store.hydrate(makeCartState({ totalQuantity: 5 }));
    store.reset();
    expect(store.getState()).toEqual(EMPTY_CART_STATE);
  });
});

describe("CartStore lifecycle", () => {
  it("connect is idempotent and destroy removes cart event listeners", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const localStore = createCartStore();
    mockGetCart.mockResolvedValue({ cart: null });

    try {
      localStore.connect();
      localStore.connect();

      expect(
        addSpy.mock.calls.filter(([eventName]) => String(eventName).startsWith("shopify:cart:")),
      ).toHaveLength(3);

      localStore.destroy();
      localStore.destroy();

      expect(
        removeSpy.mock.calls.filter(([eventName]) => String(eventName).startsWith("shopify:cart:")),
      ).toHaveLength(3);
    } finally {
      localStore.destroy();
      addSpy.mockRestore();
      removeSpy.mockRestore();
    }
  });

  it("destroy aborts pending line and discount submissions", async () => {
    const line = makeLine({ id: "line-1", quantity: 2 });
    store.hydrate(makeCartState({ lines: [line], totalQuantity: 2 }));

    const linePromise = store.handleFormSubmit(
      submitForm({ lineId: "line-1" }, "intent", "increase"),
    );
    await nextTick();
    const lineSignal = mockUpdateCart.mock.calls[0][1].signal as AbortSignal;

    const discountPromise = store.handleFormSubmit(
      submitForm({ discountCode: "SAVE10" }, "intent", "discount-apply"),
    );
    await nextTick();
    const discountSignal = mockUpdateCart.mock.calls[1][1].signal as AbortSignal;

    store.destroy();

    expect(lineSignal.aborted).toBe(true);
    expect(discountSignal.aborted).toBe(true);
    await expect(linePromise).resolves.toBeUndefined();
    await expect(discountPromise).resolves.toBeUndefined();
  });
});

describe("CartStore.handleFormSubmit — line mutations", () => {
  const CART_RESULT = {
    cart: {
      id: "gid://shopify/Cart/123",
      totalQuantity: 4,
      cost: { totalAmount: { amount: "40", currencyCode: "USD" } },
      lines: [
        {
          id: "line-1",
          quantity: 4,
          cost: { totalAmount: { amount: "40", currencyCode: "USD" } },
        },
      ],
      discountCodes: [],
    },
  };

  beforeEach(() => {
    const line = makeLine({ id: "line-1", quantity: 3 });
    store.hydrate(makeCartState({ lines: [line], totalQuantity: 3 }));
  });

  it("increase: optimistic +1 → Standard Action call → reconcile", async () => {
    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    expect(getCartLines(store.getState().data)[0].quantity).toBe(4);
    expect(store.getState().data.totalQuantity).toBe(4);
    expect(store.getState().pending.lines).toContain("line-1");

    resolveUpdate(0, CART_RESULT);
    await promise;

    expect(mockUpdateCart).toHaveBeenCalledWith(
      { lines: [{ id: "line-1", quantity: 4 }] },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(store.getState().pending.lines).not.toContain("line-1");
  });

  it("decrease: optimistic -1", async () => {
    const event = submitForm({ lineId: "line-1" }, "intent", "decrease");
    const promise = store.handleFormSubmit(event);
    await nextTick();
    expect(getCartLines(store.getState().data)[0].quantity).toBe(2);

    resolveUpdate(0, {
      cart: {
        ...CART_RESULT.cart,
        totalQuantity: 2,
        lines: [
          {
            id: "line-1",
            quantity: 2,
            cost: { totalAmount: { amount: "20", currencyCode: "USD" } },
          },
        ],
      },
    });
    await promise;

    expect(mockUpdateCart).toHaveBeenCalledWith(
      { lines: [{ id: "line-1", quantity: 2 }] },
      expect.anything(),
    );
  });

  it("decrease to zero routes to remove (quantity: 0)", async () => {
    const line = makeLine({ id: "line-1", quantity: 1 });
    store.hydrate(
      makeCartState({
        id: "gid://shopify/Cart/456",
        lines: [line],
        totalQuantity: 1,
      }),
    );

    const event = submitForm({ lineId: "line-1" }, "intent", "decrease");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/456",
        totalQuantity: 0,
        cost: { totalAmount: { amount: "0", currencyCode: "USD" } },
        lines: [],
        discountCodes: [],
      },
    });
    await promise;

    expect(mockUpdateCart).toHaveBeenCalledWith(
      { lines: [{ id: "line-1", quantity: 0 }] },
      expect.anything(),
    );
  });

  it("remove: calls Standard Action with quantity 0", async () => {
    const event = submitForm({ lineId: "line-1" }, "intent", "remove");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    resolveUpdate(0, {
      cart: {
        ...CART_RESULT.cart,
        totalQuantity: 0,
        lines: [],
      },
    });
    await promise;

    expect(mockUpdateCart).toHaveBeenCalledWith(
      { lines: [{ id: "line-1", quantity: 0 }] },
      expect.anything(),
    );
  });

  it("set: uses explicit quantity from FormData", async () => {
    const event = submitForm({ lineId: "line-1", quantity: "7" }, "intent", "set");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    expect(getCartLines(store.getState().data)[0].quantity).toBe(7);

    resolveUpdate(0, {
      cart: {
        ...CART_RESULT.cart,
        totalQuantity: 7,
        lines: [
          {
            id: "line-1",
            quantity: 7,
            cost: { totalAmount: { amount: "70", currencyCode: "USD" } },
          },
        ],
      },
    });
    await promise;

    expect(mockUpdateCart).toHaveBeenCalledWith(
      { lines: [{ id: "line-1", quantity: 7 }] },
      expect.anything(),
    );
  });

  it("set followed by increase uses the typed optimistic quantity as the base", async () => {
    const setEvent = submitForm({ lineId: "line-1", quantity: "7" }, "intent", "set");
    const setPromise = store.handleFormSubmit(setEvent);
    await nextTick();

    expect(getCartLines(store.getState().data)[0].quantity).toBe(7);

    const firstSignal = mockUpdateCart.mock.calls[0][1].signal as AbortSignal;

    const increaseEvent = submitForm({ lineId: "line-1", quantity: "7" }, "intent", "increase");
    const increasePromise = store.handleFormSubmit(increaseEvent);
    await nextTick();

    expect(firstSignal.aborted).toBe(true);
    expect(getCartLines(store.getState().data)[0].quantity).toBe(8);
    expect(mockUpdateCart).toHaveBeenCalledTimes(2);
    expect(mockUpdateCart.mock.calls[0][0]).toEqual({
      lines: [{ id: "line-1", quantity: 7 }],
    });
    expect(mockUpdateCart.mock.calls[1][0]).toEqual({
      lines: [{ id: "line-1", quantity: 8 }],
    });

    resolveUpdate(1, {
      cart: {
        ...CART_RESULT.cart,
        totalQuantity: 8,
        lines: [
          {
            id: "line-1",
            quantity: 8,
            cost: { totalAmount: { amount: "80", currencyCode: "USD" } },
          },
        ],
      },
    });
    await Promise.all([setPromise, increasePromise]);

    expect(getCartLines(store.getState().data)[0].quantity).toBe(8);
    expect(store.getState().pending.lines).not.toContain("line-1");
  });

  it("set: clamps to quantityAvailable when present", async () => {
    store.destroy();
    store = createCartStore();
    mockGetCart.mockResolvedValue({ cart: null });
    store.connect();

    const line = {
      ...makeLine({ id: "line-1", quantity: 2 }),
      merchandise: {
        id: "gid://shopify/ProductVariant/1",
        title: "Small",
        product: { title: "T-Shirt" },
        quantityAvailable: 4,
      },
    };
    store.hydrate(makeCartState({ lines: [line], totalQuantity: 2 }));

    const event = submitForm({ lineId: "line-1", quantity: "10" }, "intent", "set");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    expect(getCartLines(store.getState().data)[0].quantity).toBe(4);

    resolveUpdate(0, {
      cart: {
        ...CART_RESULT.cart,
        totalQuantity: 4,
        lines: [
          {
            id: "line-1",
            quantity: 4,
            cost: { totalAmount: { amount: "40", currencyCode: "USD" } },
          },
        ],
      },
    });
    await promise;

    expect(mockUpdateCart).toHaveBeenCalledWith(
      { lines: [{ id: "line-1", quantity: 4 }] },
      expect.anything(),
    );
  });

  it("set: quantity 0 routes to remove", async () => {
    const event = submitForm({ lineId: "line-1", quantity: "0" }, "intent", "set");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    resolveUpdate(0, {
      cart: {
        ...CART_RESULT.cart,
        totalQuantity: 0,
        lines: [],
      },
    });
    await promise;

    expect(mockUpdateCart).toHaveBeenCalledWith(
      { lines: [{ id: "line-1", quantity: 0 }] },
      expect.anything(),
    );
  });

  it("set: negative quantity routes to remove", async () => {
    const event = submitForm({ lineId: "line-1", quantity: "-5" }, "intent", "set");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    resolveUpdate(0, {
      cart: {
        ...CART_RESULT.cart,
        totalQuantity: 0,
        lines: [],
      },
    });
    await promise;

    expect(mockUpdateCart).toHaveBeenCalledWith(
      { lines: [{ id: "line-1", quantity: 0 }] },
      expect.anything(),
    );
  });

  it("set: NaN quantity falls back to default minimum", async () => {
    const event = submitForm({ lineId: "line-1", quantity: "abc" }, "intent", "set");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    expect(getCartLines(store.getState().data)[0].quantity).toBe(1);

    resolveUpdate(0, {
      cart: {
        ...CART_RESULT.cart,
        totalQuantity: 1,
        lines: [
          {
            id: "line-1",
            quantity: 1,
            cost: { totalAmount: { amount: "10", currencyCode: "USD" } },
          },
        ],
      },
    });
    await promise;

    expect(mockUpdateCart).toHaveBeenCalledWith(
      { lines: [{ id: "line-1", quantity: 1 }] },
      expect.anything(),
    );
  });
});

describe("CartStore.handleFormSubmit — discount mutations", () => {
  beforeEach(() => {
    store.hydrate(
      makeCartState({
        discountCodes: [{ code: "EXISTING", applicable: true }],
      }),
    );
  });

  it("discount-apply sends string[] payload", async () => {
    const event = submitForm({ discountCode: "NEW10" }, "intent", "discount-apply");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 0,
        cost: { totalAmount: { amount: "0", currencyCode: "USD" } },
        lines: [],
        discountCodes: [
          { code: "EXISTING", applicable: true },
          { code: "NEW10", applicable: true },
        ],
      },
    });
    await promise;

    expect(mockUpdateCart).toHaveBeenCalledWith(
      { discountCodes: ["EXISTING", "NEW10"] },
      expect.anything(),
    );
  });

  it("discount-apply tracks pending.discountCodes", async () => {
    const event = submitForm({ discountCode: "NEW10" }, "intent", "discount-apply");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    expect(store.getState().pending.discountCodes.size).toBeGreaterThan(0);

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 0,
        cost: { totalAmount: { amount: "0", currencyCode: "USD" } },
        lines: [],
        discountCodes: [
          { code: "EXISTING", applicable: true },
          { code: "NEW10", applicable: true },
        ],
      },
    });
    await promise;

    expect(store.getState().pending.discountCodes.size).toBe(0);
  });

  it("discount-apply preserves applicable status for existing codes during optimistic phase", async () => {
    const event = submitForm({ discountCode: "NEW10" }, "intent", "discount-apply");
    store.handleFormSubmit(event);
    await nextTick();

    const optimistic = store.getState().data.discountCodes;
    const existing = optimistic.find((dc) => dc.code === "EXISTING");
    const added = optimistic.find((dc) => dc.code === "NEW10");

    expect(existing?.applicable).toBe(true);
    expect(added?.applicable).toBe(false);
  });

  it("discount-apply routes SFAPI warnings to the non-applicable code", async () => {
    const event = submitForm({ discountCode: "BOGUS" }, "intent", "discount-apply");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 0,
        cost: { totalAmount: { amount: "0", currencyCode: "USD" } },
        lines: [],
        discountCodes: [
          { code: "EXISTING", applicable: true },
          { code: "BOGUS", applicable: false },
        ],
      },
      warnings: [
        {
          code: "DISCOUNT_NOT_FOUND",
          message: "Discount code BOGUS was not found",
          target: "gid://shopify/Cart/123",
        },
      ],
    });
    await promise;

    const codeErrors = store.getState().errors.discountCodes.get("BOGUS");
    expect(codeErrors?.warnings).toHaveLength(1);
    expect(codeErrors?.warnings[0].message).toBe("Discount code BOGUS was not found");
    expect(codeErrors?.warnings[0].code).toBe("DISCOUNT_NOT_FOUND");

    expect(store.getState().errors.cart.warnings).toHaveLength(0);
  });

  it("discount-remove sends filtered string[] payload", async () => {
    const event = submitForm({ discountCode: "EXISTING" }, "intent", "discount-remove");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 0,
        cost: { totalAmount: { amount: "0", currencyCode: "USD" } },
        lines: [],
        discountCodes: [],
      },
    });
    await promise;

    expect(mockUpdateCart).toHaveBeenCalledWith({ discountCodes: [] }, expect.anything());
  });
});

describe("CartStore.handleFormSubmit — concurrency", () => {
  beforeEach(() => {
    const line = makeLine({ id: "line-1", quantity: 3 });
    store.hydrate(makeCartState({ lines: [line], totalQuantity: 3 }));
  });

  it("rapid clicks abort prior request, only last executes", async () => {
    const e1 = submitForm({ lineId: "line-1" }, "intent", "increase");
    const p1 = store.handleFormSubmit(e1);

    const e2 = submitForm({ lineId: "line-1" }, "intent", "increase");
    const p2 = store.handleFormSubmit(e2);
    await nextTick();

    resolveUpdate(1, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 5,
        cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
        lines: [
          {
            id: "line-1",
            quantity: 5,
            cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
    });

    await p1;
    await p2;

    expect(store.getState().pending.lines).not.toContain("line-1");
  });

  it("cross-line independence: line A mutation does not cancel line B", async () => {
    const lineA = makeLine({ id: "line-a", quantity: 2 });
    const lineB = makeLine({ id: "line-b", quantity: 3 });
    store.hydrate(
      makeCartState({
        id: "gid://shopify/Cart/789",
        lines: [lineA, lineB],
        totalQuantity: 5,
      }),
    );

    const eA = submitForm({ lineId: "line-a" }, "intent", "increase");
    const pA = store.handleFormSubmit(eA);

    const eB = submitForm({ lineId: "line-b" }, "intent", "increase");
    const pB = store.handleFormSubmit(eB);
    await nextTick();

    expect(mockUpdateCart).toHaveBeenCalledTimes(2);

    const sharedResult = {
      cart: {
        id: "gid://shopify/Cart/789",
        totalQuantity: 7,
        cost: { totalAmount: { amount: "70", currencyCode: "USD" } },
        lines: [
          {
            id: "line-a",
            quantity: 3,
            cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
          },
          {
            id: "line-b",
            quantity: 4,
            cost: { totalAmount: { amount: "40", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
    };

    resolveUpdate(0, sharedResult);
    resolveUpdate(1, sharedResult);

    await pA;
    await pB;
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("concurrent rollback: failing line A does not clobber line B", async () => {
    const lineA = makeLine({ id: "line-a", quantity: 2 });
    const lineB = makeLine({ id: "line-b", quantity: 3 });
    store.hydrate(
      makeCartState({
        id: "gid://shopify/Cart/789",
        lines: [lineA, lineB],
        totalQuantity: 5,
      }),
    );

    const eA = submitForm({ lineId: "line-a" }, "intent", "increase");
    const pA = store.handleFormSubmit(eA);

    const eB = submitForm({ lineId: "line-b" }, "intent", "increase");
    const pB = store.handleFormSubmit(eB);
    await nextTick();

    expect(getCartLines(store.getState().data).find((l) => l.id === "line-a")?.quantity).toBe(3);
    expect(getCartLines(store.getState().data).find((l) => l.id === "line-b")?.quantity).toBe(4);

    rejectUpdate(0, new Error("Network error"));

    await expect(pA).rejects.toThrow("Network error");

    expect(getCartLines(store.getState().data).find((l) => l.id === "line-a")?.quantity).toBe(2);
    expect(getCartLines(store.getState().data).find((l) => l.id === "line-b")?.quantity).toBe(4);

    resolveUpdate(1, {
      cart: {
        id: "gid://shopify/Cart/789",
        totalQuantity: 6,
        cost: { totalAmount: { amount: "60", currencyCode: "USD" } },
        lines: [
          {
            id: "line-a",
            quantity: 2,
            cost: { totalAmount: { amount: "20", currencyCode: "USD" } },
          },
          {
            id: "line-b",
            quantity: 4,
            cost: { totalAmount: { amount: "40", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
    });
    await pB;
  });

  it("chained cancellation: aborted request does NOT modify state", async () => {
    const e1 = submitForm({ lineId: "line-1" }, "intent", "increase");
    const p1 = store.handleFormSubmit(e1);
    await nextTick();

    expect(store.getState().pending.lines).toContain("line-1");

    const e2 = submitForm({ lineId: "line-1" }, "intent", "increase");
    const p2 = store.handleFormSubmit(e2);
    await nextTick();

    resolveUpdate(1, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 5,
        cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
        lines: [
          {
            id: "line-1",
            quantity: 5,
            cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
    });

    await p1;
    await p2;

    expect(store.getState().pending.lines).not.toContain("line-1");
    expect(getCartLines(store.getState().data)[0].quantity).toBe(5);
  });

  it("pending.lines dedup: rapid clicks do not accumulate duplicates", async () => {
    const e1 = submitForm({ lineId: "line-1" }, "intent", "increase");
    const p1 = store.handleFormSubmit(e1);

    const e2 = submitForm({ lineId: "line-1" }, "intent", "increase");
    const p2 = store.handleFormSubmit(e2);
    await nextTick();

    expect(store.getState().pending.lines.has("line-1")).toBe(true);
    expect(store.getState().pending.lines.size).toBe(1);

    resolveUpdate(1, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 5,
        cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
        lines: [
          {
            id: "line-1",
            quantity: 5,
            cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
    });

    await p1;
    await p2;
  });
});

describe("CartStore.handleFormSubmit — error handling", () => {
  beforeEach(() => {
    const line = makeLine({ id: "line-1", quantity: 3 });
    store.hydrate(makeCartState({ lines: [line], totalQuantity: 3 }));
  });

  it("AbortError on current controller triggers rollback and clears pending", async () => {
    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    rejectUpdate(0, new DOMException("The operation was aborted.", "AbortError"));
    await promise;

    expect(getCartLines(store.getState().data)[0].quantity).toBe(3);
    expect(store.getState().pending.lines).not.toContain("line-1");
  });

  it("scoped rollback on non-abort error reverts only failed line", async () => {
    const lineA = makeLine({ id: "line-a", quantity: 2 });
    const lineB = makeLine({ id: "line-b", quantity: 3 });
    store.hydrate(
      makeCartState({
        id: "gid://shopify/Cart/789",
        lines: [lineA, lineB],
        totalQuantity: 5,
      }),
    );

    const event = submitForm({ lineId: "line-a" }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    rejectUpdate(0, new Error("Server error"));
    await expect(promise).rejects.toThrow("Server error");

    expect(getCartLines(store.getState().data).find((l) => l.id === "line-a")?.quantity).toBe(2);
    expect(getCartLines(store.getState().data).find((l) => l.id === "line-b")?.quantity).toBe(3);
    expect(store.getState().data.totalQuantity).toBe(5);
    expect(store.getState().pending.lines).not.toContain("line-a");
  });

  it("scoped rollback for remove re-inserts the line", async () => {
    const event = submitForm({ lineId: "line-1" }, "intent", "remove");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    rejectUpdate(0, new Error("Server error"));
    await expect(promise).rejects.toThrow("Server error");

    expect(getCartLines(store.getState().data).find((l) => l.id === "line-1")).toBeDefined();
    expect(getCartLines(store.getState().data).find((l) => l.id === "line-1")?.quantity).toBe(3);
  });

  it("scoped rollback for discount-apply reverts discountCodes", async () => {
    store.reset();
    store.hydrate(
      makeCartState({
        discountCodes: [{ code: "EXISTING", applicable: true }],
      }),
    );

    const event = submitForm({ discountCode: "BAD" }, "intent", "discount-apply");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    rejectUpdate(0, new Error("Server error"));
    await expect(promise).rejects.toThrow("Server error");

    expect(store.getState().data.discountCodes).toEqual([{ code: "EXISTING", applicable: true }]);
    expect(store.getState().pending.discountCodes.size).toBe(0);
  });

  it("maps discount userErrors to discountCodes scope", async () => {
    const event = submitForm({ discountCode: "BAD" }, "intent", "discount-apply");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 3,
        cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
        lines: [
          {
            id: "line-1",
            quantity: 3,
            cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
      userErrors: [{ code: "INVALID", message: "Bad code", field: ["discountCodes", "0"] }],
    });
    await promise;

    const errors = store.getState().errors;
    const badGroup = errors.discountCodes.get("BAD");
    expect(badGroup?.userErrors).toEqual([
      { code: "INVALID", message: "Bad code", field: ["discountCodes", "0"] },
    ]);
    expect(errors.lines.size).toBe(0);
    expect(errors.note).toEqual(createEmptyCartErrors().note);
  });

  it("stores non-abort discount failures as network errors", async () => {
    const event = submitForm({ discountCode: "BAD" }, "intent", "discount-apply");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    rejectUpdate(0, new Error("Server error"));
    await expect(promise).rejects.toThrow("Server error");

    const errors = store.getState().errors;
    expect(errors.network).toEqual([{ message: "Server error" }]);
    expect(errors.discountCodes.size).toBe(0);
  });

  it("populates CartState.errors from userErrors", async () => {
    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 3,
        cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
        lines: [
          {
            id: "line-1",
            quantity: 3,
            cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
      userErrors: [{ code: "INVALID", message: "Something went wrong", field: ["lines", "0"] }],
    });
    await promise;

    const errors = store.getState().errors;
    const lineGroup = errors.lines.get("line-1");
    expect(lineGroup?.userErrors).toEqual([
      { code: "INVALID", message: "Something went wrong", field: ["lines", "0"] },
    ]);
    expect(errors.discountCodes.size).toBe(0);
    expect(errors.note).toEqual(createEmptyCartErrors().note);
  });

  it("stores non-abort mutation failures as network errors", async () => {
    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    rejectUpdate(0, new Error("Server error"));
    await expect(promise).rejects.toThrow("Server error");

    const errors = store.getState().errors;
    expect(errors.network).toEqual([{ message: "Server error" }]);
    expect(errors.lines.size).toBe(0);
  });

  it("surfaces rejected line userErrors and warnings from Error.cause", async () => {
    const lineId = "gid://shopify/CartLine/line-1";
    store.hydrate(
      makeCartState({ lines: [makeLine({ id: lineId, quantity: 2 })], totalQuantity: 2 }),
    );

    const event = submitForm({ lineId }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    rejectUpdate(
      0,
      cartActionError({
        userErrors: [
          {
            code: "MAXIMUM_EXCEEDED",
            message: "Only one unit allowed",
            field: ["lines", "0", "quantity"],
          },
        ],
        warnings: [{ code: "LOW_STOCK", message: "Limited stock", target: lineId }],
      }),
    );
    await expect(promise).rejects.toThrow("Cart action failed");

    const errors = store.getState().errors;
    const lineGroup = errors.lines.get(lineId);
    expect(lineGroup?.userErrors).toEqual([
      {
        code: "MAXIMUM_EXCEEDED",
        message: "Only one unit allowed",
        field: ["lines", "0", "quantity"],
      },
    ]);
    expect(lineGroup?.warnings).toEqual([{ code: "LOW_STOCK", message: "Limited stock" }]);
    expect(errors.network).toEqual([]);
  });

  it("routes line network errors to errors.network instead of errors.lines", async () => {
    store.hydrate(
      makeCartState({ lines: [makeLine({ id: "line-1", quantity: 2 })], totalQuantity: 2 }),
    );
    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    rejectUpdate(0, new CartNetworkError(502));
    await expect(promise).rejects.toThrow(CartNetworkError);

    const errors = store.getState().errors;
    expect(errors.network).toEqual([
      {
        message: "Something went wrong updating your cart. Please try again.",
        status: 502,
      },
    ]);
    expect(errors.lines.size).toBe(0);
    expect(errors.networkUpdatedAt).toBeGreaterThan(0);
    expect(errors.linesUpdatedAt).toBe(0);
  });

  it("routes discount network errors to errors.network", async () => {
    const event = submitForm({ discountCode: "BAD" }, "intent", "discount-apply");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    rejectUpdate(0, new CartNetworkError(502));
    await expect(promise).rejects.toThrow(CartNetworkError);

    const errors = store.getState().errors;
    expect(errors.network).toEqual([
      {
        message: "Something went wrong updating your cart. Please try again.",
        status: 502,
      },
    ]);
    expect(errors.discountCodes.size).toBe(0);
    expect(errors.networkUpdatedAt).toBeGreaterThan(0);
    expect(errors.discountCodesUpdatedAt).toBe(0);
  });

  it("surfaces rejected discount userErrors from Error.cause", async () => {
    const event = submitForm({ discountCode: "BAD" }, "intent", "discount-apply");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    rejectUpdate(
      0,
      cartActionError({
        userErrors: [{ code: "INVALID", message: "Bad code", field: ["discountCodes", "0"] }],
      }),
    );
    await expect(promise).rejects.toThrow("Cart action failed");

    const errors = store.getState().errors;
    expect(errors.discountCodes.get("BAD")?.userErrors).toEqual([
      { code: "INVALID", message: "Bad code", field: ["discountCodes", "0"] },
    ]);
    expect(errors.network).toEqual([]);
  });

  it("routes note network errors to errors.network", async () => {
    store.hydrate(makeCartState({ note: "old note" }));
    const event = submitForm({ note: "new note" }, "intent", "note-update");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    rejectUpdate(0, new CartNetworkError(502));
    await expect(promise).rejects.toThrow(CartNetworkError);

    const errors = store.getState().errors;
    expect(errors.network).toEqual([
      {
        message: "Something went wrong updating your cart. Please try again.",
        status: 502,
      },
    ]);
    expect(errors.networkUpdatedAt).toBeGreaterThan(0);
    expect(errors.noteUpdatedAt).toBe(0);
  });

  it("surfaces rejected note userErrors and warnings from Error.cause", async () => {
    store.hydrate(makeCartState({ note: "old note" }));
    const event = submitForm({ note: "new note" }, "intent", "note-update");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    rejectUpdate(
      0,
      cartActionError({
        userErrors: [{ code: "NOTE_TOO_LONG", message: "Note is too long" }],
        warnings: [{ code: "LOW_STOCK", message: "Limited stock" }],
      }),
    );
    await expect(promise).rejects.toThrow("Cart action failed");

    const errors = store.getState().errors;
    expect(errors.note.userErrors).toEqual([
      { code: "NOTE_TOO_LONG", message: "Note is too long" },
    ]);
    expect(errors.note.warnings).toEqual([{ code: "LOW_STOCK", message: "Limited stock" }]);
    expect(errors.network).toEqual([]);
  });

  it("routes note business errors to errors.network", async () => {
    store.hydrate(makeCartState({ note: "old note" }));
    const event = submitForm({ note: "new note" }, "intent", "note-update");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    rejectUpdate(0, new Error("Validation failed"));
    await expect(promise).rejects.toThrow("Validation failed");

    const errors = store.getState().errors;
    expect(errors.network).toEqual([{ message: "Validation failed" }]);
    expect(errors.networkUpdatedAt).toBeGreaterThan(0);
  });

  it("maps line warnings as scoped warning entries with the target lineId", async () => {
    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    const targetId = "gid://shopify/CartLine/abc?cart=hWNBaydr6u1UzPji738NviE5";

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 26,
        cost: { totalAmount: { amount: "260", currencyCode: "USD" } },
        lines: [
          {
            id: targetId,
            quantity: 26,
            cost: { totalAmount: { amount: "260", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
      warnings: [
        {
          code: "MERCHANDISE_NOT_ENOUGH_STOCK",
          message: "Only 26 items were added to your cart due to availability.",
          target: targetId,
        },
      ],
    });
    await promise;

    const errors = store.getState().errors;
    const targetGroup = errors.lines.get(targetId);
    expect(targetGroup?.warnings).toEqual([
      {
        code: "MERCHANDISE_NOT_ENOUGH_STOCK",
        message: "Only 26 items were added to your cart due to availability.",
      },
    ]);
    expect(targetGroup?.userErrors).toEqual([]);
  });

  it("keeps userErrors and warnings together in errors", async () => {
    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    const targetId = "gid://shopify/CartLine/abc?cart=tok";

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 3,
        cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
        lines: [
          {
            id: targetId,
            quantity: 3,
            cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
      userErrors: [{ code: "INVALID", message: "Bad", field: ["lines", "0"] }],
      warnings: [{ code: "STOCK", message: "Limited", target: targetId }],
    });
    await promise;

    const errors = store.getState().errors;
    const lineGroup = errors.lines.get("line-1");
    const targetGroup = errors.lines.get(targetId);

    expect(lineGroup?.userErrors).toHaveLength(1);
    expect(lineGroup?.userErrors[0]).toMatchObject({ code: "INVALID", message: "Bad" });

    expect(targetGroup?.warnings).toHaveLength(1);
    expect(targetGroup?.warnings[0]).toMatchObject({ code: "STOCK", message: "Limited" });
  });

  it("throws descriptive error when Standard Actions not available", async () => {
    Object.defineProperty(window, "Shopify", {
      value: {},
      configurable: true,
      writable: true,
    });
    resetStandardActionsForTests();

    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    await expect(store.handleFormSubmit(event)).rejects.toThrow("Standard Actions not available");
  });

  it("throws for missing lineId", async () => {
    const event = submitForm({}, "intent", "increase");
    await expect(store.handleFormSubmit(event)).rejects.toThrow("lineId");
  });

  it("throws for unknown intent", async () => {
    const event = submitForm({}, "intent", "unknown-action");
    await expect(store.handleFormSubmit(event)).rejects.toThrow("Unknown cart form intent");
  });

  it("throws for non-HTMLFormElement target", async () => {
    const event = new Event("submit") as SubmitEvent;
    await expect(store.handleFormSubmit(event)).rejects.toThrow("HTMLFormElement");
  });

  it("throws for null submitter", async () => {
    const form = document.createElement("form");
    document.body.appendChild(form);
    const event = new SubmitEvent("submit", { submitter: null });
    Object.defineProperty(event, "target", { value: form });
    document.body.removeChild(form);

    await expect(store.handleFormSubmit(event)).rejects.toThrow("HTMLElement");
  });

  it("accepts non-button submitter (input type=submit)", async () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "lineId";
    input.value = "line-1";
    form.appendChild(input);

    const submitter = document.createElement("input");
    submitter.type = "submit";
    submitter.name = "intent";
    submitter.value = "increase";
    form.appendChild(submitter);

    document.body.appendChild(form);

    let capturedEvent!: SubmitEvent;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      capturedEvent = e;
    });
    submitter.click();
    document.body.removeChild(form);

    const promise = store.handleFormSubmit(capturedEvent);
    await nextTick();
    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 4,
        cost: { totalAmount: { amount: "40", currencyCode: "USD" } },
        lines: [
          {
            id: "line-1",
            quantity: 4,
            cost: { totalAmount: { amount: "40", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
    });
    await promise;

    expect(mockUpdateCart).toHaveBeenCalled();
  });

  it("stamps scope and root timestamps when errors are written", async () => {
    const fakeNow = 1700000000000;
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(fakeNow);

    store.hydrate(makeCartState({ totalQuantity: 3 }));

    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 3,
        cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
        lines: [
          {
            id: "line-1",
            quantity: 3,
            cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
      userErrors: [{ code: "INVALID", message: "Line error", field: ["lines", "0"] }],
    });
    await promise;

    const errors = store.getState().errors;
    expect(errors.linesUpdatedAt).toBe(fakeNow);
    expect(errors.cartUpdatedAt).toBe(fakeNow);
    expect(errors.lastUpdatedAt).toBe(fakeNow);
    expect(errors.discountCodesUpdatedAt).toBe(0);
    expect(errors.noteUpdatedAt).toBe(0);
    expect(errors.networkUpdatedAt).toBe(0);

    dateNowSpy.mockRestore();
  });
});

describe("CartStore.handleFormSubmit — reconciliation", () => {
  it("preserves extended fields (title, image) through reconciliation", async () => {
    const line = {
      ...makeLine({ id: "line-1", quantity: 3 }),
      title: "Cool T-Shirt",
      imageUrl: "https://example.com/img.jpg",
    };
    store.hydrate(makeCartState({ lines: [line], totalQuantity: 3 }));

    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 4,
        cost: { totalAmount: { amount: "40", currencyCode: "USD" } },
        lines: [
          {
            id: "line-1",
            quantity: 4,
            cost: { totalAmount: { amount: "40", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
    });
    await promise;

    const reconciledLine = getCartLines(store.getState().data).find((l) => l.id === "line-1");
    expect(reconciledLine?.quantity).toBe(4);
    expect((reconciledLine as any).title).toBe("Cool T-Shirt");
    expect((reconciledLine as any).imageUrl).toBe("https://example.com/img.jpg");
  });

  it("preserves quantityAvailable in merchandise through reconciliation", async () => {
    const line = {
      ...makeLine({ id: "line-1", quantity: 2 }),
      merchandise: {
        id: "gid://shopify/ProductVariant/1",
        title: "Small",
        product: { title: "T-Shirt" },
        quantityAvailable: 5,
      },
    };
    store.hydrate(makeCartState({ lines: [line], totalQuantity: 2 }));

    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 3,
        cost: {
          subtotalAmount: { amount: "30", currencyCode: "USD" },
          totalAmount: { amount: "30", currencyCode: "USD" },
          checkoutChargeAmount: { amount: "30", currencyCode: "USD" },
        },
        lines: [
          {
            id: "line-1",
            quantity: 3,
            cost: {
              totalAmount: { amount: "30", currencyCode: "USD" },
              subtotalAmount: { amount: "30", currencyCode: "USD" },
              amountPerQuantity: { amount: "10", currencyCode: "USD" },
              compareAtAmountPerQuantity: null,
            },
          },
        ],
        discountCodes: [],
      },
    });
    await promise;

    const reconciledLine = getCartLines(store.getState().data).find((l) => l.id === "line-1");
    expect(reconciledLine?.quantity).toBe(3);
    expect((reconciledLine?.merchandise as any)?.quantityAvailable).toBe(5);
  });

  it("server-side line removal: lines removed by server disappear from state", async () => {
    const lineA = makeLine({ id: "line-a", quantity: 2 });
    const lineB = makeLine({ id: "line-b", quantity: 3 });
    store.hydrate(
      makeCartState({
        id: "gid://shopify/Cart/789",
        lines: [lineA, lineB],
        totalQuantity: 5,
      }),
    );

    const event = submitForm({ lineId: "line-a" }, "intent", "remove");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/789",
        totalQuantity: 3,
        cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
        lines: [
          {
            id: "line-b",
            quantity: 3,
            cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
    });
    await promise;

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe("line-b");
  });
});

describe("CartStore.handleFormSubmit — timeout", () => {
  const SHORT_TIMEOUT_IN_MS = 50;
  const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);

  beforeEach(() => {
    const line = makeLine({ id: "line-1", quantity: 3 });
    store.hydrate(makeCartState({ lines: [line], totalQuantity: 3 }));
    vi.spyOn(AbortSignal, "timeout").mockImplementation(() => nativeTimeout(SHORT_TIMEOUT_IN_MS));
  });

  afterEach(() => {
    vi.mocked(AbortSignal.timeout).mockRestore();
  });

  it("request exceeding timeout is aborted and state rolls back", async () => {
    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    expect(getCartLines(store.getState().data)[0].quantity).toBe(4);
    expect(store.getState().pending.lines).toContain("line-1");

    await promise;

    expect(AbortSignal.timeout).toHaveBeenCalledWith(STANDARD_ACTION_TIMEOUT_IN_MS);
    expect(getCartLines(store.getState().data)[0].quantity).toBe(3);
    expect(store.getState().pending.lines).not.toContain("line-1");
  });

  it("discount timeout rolls back to baseline, not intermediate optimistic state", async () => {
    store.reset();
    store.hydrate(makeCartState({ discountCodes: [] }));

    const e1 = submitForm({ discountCode: "CODE1" }, "intent", "discount-apply");
    const p1 = store.handleFormSubmit(e1);

    const e2 = submitForm({ discountCode: "CODE2" }, "intent", "discount-apply");
    const p2 = store.handleFormSubmit(e2);

    await p1;
    await p2;

    expect(store.getState().data.discountCodes).toEqual([]);
    expect(store.getState().pending.discountCodes.size).toBe(0);
  });
});

describe("CartStore.fetch", () => {
  it("reuses an in-flight fetch while state is unchanged", async () => {
    const deferred = createDeferred<{ cart: CartData }>();
    mockGetCart.mockReturnValueOnce(deferred.promise);

    const firstPromise = store.fetch();
    const secondPromise = store.fetch();

    expect(secondPromise).toBe(firstPromise);
    await nextTick();
    expect(mockGetCart).toHaveBeenCalledTimes(1);

    deferred.resolve({ cart: makeCartState({ totalQuantity: 2 }) });
    await firstPromise;

    mockGetCart.mockResolvedValueOnce({
      cart: makeCartState({
        id: "gid://shopify/Cart/fresh",
        totalQuantity: 3,
      }),
    });

    await store.fetch();

    expect(mockGetCart).toHaveBeenCalledTimes(2);
    expect(store.getState().data.id).toBe("gid://shopify/Cart/fresh");
    expect(store.getState().data.totalQuantity).toBe(3);
  });

  it("hydrates the store from getCart result", async () => {
    const cart = {
      id: "gid://shopify/Cart/abc",
      totalQuantity: 2,
      cost: { totalAmount: { amount: "50.00", currencyCode: "USD" } },
      lines: { nodes: [makeLine({ id: "line-1", quantity: 2 })] },
      discountCodes: [],
    };
    mockGetCart.mockResolvedValue({ cart });

    await store.fetch();

    const state = store.getState();
    expect(state.data.id).toBe("gid://shopify/Cart/abc");
    expect(state.data.totalQuantity).toBe(2);
    expect(getCartLines(state.data)).toHaveLength(1);
    expect(state.pending.lines).toEqual(new Set());
    expect(state.pending.discountCodes).toEqual(new Set());
    expect(state.errors).toEqual(createEmptyCartErrors());
  });

  it("sets loading to false when getCart returns null cart", async () => {
    mockGetCart.mockResolvedValue({ cart: null });

    expect(store.getState().loading).toBe(true);
    await store.fetch();

    expect(store.getState().loading).toBe(false);
    expect(store.getState().data.id).toBeNull();
    expect(getCartLines(store.getState().data)).toEqual([]);
  });

  it("does not apply stale fetch result after state changes", async () => {
    const deferred = createDeferred<{ cart: CartData }>();
    mockGetCart.mockReturnValue(deferred.promise);

    const promise = store.fetch();
    store.hydrate(makeCartState({ totalQuantity: 1 }));
    deferred.resolve({
      cart: makeCartState({
        id: "gid://shopify/Cart/stale",
        totalQuantity: 9,
      }),
    });
    await promise;

    expect(store.getState().data.totalQuantity).toBe(1);
    expect(store.getState().data.id).toBe("gid://shopify/Cart/123");
  });

  it("starts a fresh fetch when the in-flight load is stale", async () => {
    const staleDeferred = createDeferred<{ cart: CartData }>();
    const freshDeferred = createDeferred<{ cart: CartData }>();
    mockGetCart
      .mockReturnValueOnce(staleDeferred.promise)
      .mockReturnValueOnce(freshDeferred.promise);

    const stalePromise = store.fetch();
    store.hydrate(makeCartState({ totalQuantity: 1 }));
    const freshPromise = store.fetch();

    expect(freshPromise).not.toBe(stalePromise);
    await nextTick();
    expect(mockGetCart).toHaveBeenCalledTimes(2);

    staleDeferred.resolve({
      cart: makeCartState({
        id: "gid://shopify/Cart/stale",
        totalQuantity: 9,
      }),
    });
    await stalePromise;

    expect(store.getState().data.id).toBe("gid://shopify/Cart/123");
    expect(store.getState().data.totalQuantity).toBe(1);

    freshDeferred.resolve({
      cart: makeCartState({
        id: "gid://shopify/Cart/fresh",
        totalQuantity: 4,
      }),
    });
    await freshPromise;

    expect(store.getState().data.id).toBe("gid://shopify/Cart/fresh");
    expect(store.getState().data.totalQuantity).toBe(4);
  });

  it("respects hydrate same-ID guard", async () => {
    const cart = {
      id: "gid://shopify/Cart/abc",
      totalQuantity: 1,
      cost: { totalAmount: { amount: "10.00", currencyCode: "USD" } },
      lines: { nodes: [makeLine({ id: "line-1" })] },
      discountCodes: [],
    };
    store.hydrate(makeCartState({ id: "gid://shopify/Cart/abc", totalQuantity: 5 }));
    mockGetCart.mockResolvedValue({ cart });

    await store.fetch();

    expect(store.getState().data.totalQuantity).toBe(5);
  });

  it("revalidates checkoutUrl from Standard Actions for connected cart stores", async () => {
    store.hydrate(
      makeCartState({
        id: "gid://shopify/Cart/abc",
        checkoutUrl: "https://example.com/checkouts/old?_shopify_y=old",
        note: "keep this note",
        totalQuantity: 1,
      }),
    );
    mockGetCart.mockResolvedValue({
      cart: {
        id: "gid://shopify/Cart/abc",
        checkoutUrl: "https://example.com/checkouts/new?_shopify_y=new",
        note: "revalidated note",
        totalQuantity: 1,
        cost: { totalAmount: { amount: "10.00", currencyCode: "USD" } },
        lines: { nodes: [makeLine({ id: "line-1" })] },
        discountCodes: [],
      },
    });

    revalidateConnectedCartCheckoutUrls();

    await vi.waitFor(() => {
      expect(store.getState().data.checkoutUrl).toBe(
        "https://example.com/checkouts/new?_shopify_y=new",
      );
    });
    expect(store.getState().data.note).toBe("keep this note");
  });

  it("revalidates checkoutUrl per connected store cart ID", async () => {
    const secondStore = createCartStore();
    secondStore.connect();
    try {
      store.hydrate(
        makeCartState({
          id: "gid://shopify/Cart/abc",
          checkoutUrl: "https://example.com/checkouts/abc-old",
          totalQuantity: 1,
        }),
      );
      secondStore.hydrate(
        makeCartState({
          id: "gid://shopify/Cart/def",
          checkoutUrl: "https://example.com/checkouts/def-old",
          totalQuantity: 2,
        }),
      );
      mockGetCart.mockImplementation((payload: { cartId?: string } | undefined) =>
        Promise.resolve({
          cart: {
            id: payload?.cartId,
            checkoutUrl: `https://example.com/checkouts/${payload?.cartId?.split("/").pop()}-new`,
            totalQuantity: 1,
            cost: { totalAmount: { amount: "10.00", currencyCode: "USD" } },
            lines: { nodes: [makeLine({ id: "line-1" })] },
            discountCodes: [],
          },
        }),
      );

      revalidateConnectedCartCheckoutUrls();

      await vi.waitFor(() => {
        expect(store.getState().data.checkoutUrl).toBe("https://example.com/checkouts/abc-new");
        expect(secondStore.getState().data.checkoutUrl).toBe(
          "https://example.com/checkouts/def-new",
        );
      });
      expect(mockGetCart).toHaveBeenCalledWith(
        { cartId: "gid://shopify/Cart/abc" },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(mockGetCart).toHaveBeenCalledWith(
        { cartId: "gid://shopify/Cart/def" },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    } finally {
      secondStore.destroy();
    }
  });

  it("does not revalidate checkoutUrl for empty connected cart stores", async () => {
    store.hydrate(
      makeCartState({
        checkoutUrl: "https://example.com/checkouts/old?_shopify_y=old",
        totalQuantity: 0,
      }),
    );

    revalidateConnectedCartCheckoutUrls();

    expect(mockGetCart).not.toHaveBeenCalled();
  });

  it("throws when Standard Actions not available", async () => {
    Object.defineProperty(window, "Shopify", {
      value: { actions: undefined },
      configurable: true,
      writable: true,
    });
    resetStandardActionsForTests();

    await expect(store.fetch()).rejects.toThrow("Standard Actions not available");
    expect(store.getState().loading).toBe(false);
  });

  it("fetches from configured endpoint instead of getCart", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          cart: {
            id: "gid://shopify/Cart/endpoint-cart",
            totalQuantity: 3,
            cost: { totalAmount: { amount: "30.00", currencyCode: "USD" } },
            lines: { nodes: [makeLine({ id: "line-1", quantity: 3 })] },
            discountCodes: [],
          },
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", mockFetch);
    store.hydrate(makeCartState({ id: "gid://shopify/Cart/existing" }));

    configureCartEndpoint("/api/cart");
    await store.fetch();

    expect(mockGetCart).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/cart?cartId=gid%3A%2F%2Fshopify%2FCart%2Fexisting",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    const state = store.getState();
    expect(state.data.id).toBe("gid://shopify/Cart/endpoint-cart");
    expect(state.data.totalQuantity).toBe(3);
  });

  it("sets loading to false when endpoint returns null cart", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ cart: null }), {
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    configureCartEndpoint("/api/cart");
    expect(store.getState().loading).toBe(true);
    await store.fetch();

    expect(store.getState().loading).toBe(false);
    expect(mockGetCart).not.toHaveBeenCalled();
  });

  it("throws CartNetworkError when endpoint returns non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Server Error", { status: 500 })),
    );

    configureCartEndpoint("/api/cart");
    await expect(store.fetch()).rejects.toThrow(CartNetworkError);
    expect(store.getState().loading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Event-driven sync — tests verifying that ANY updateCart caller (external
// code, MCP tools, theme scripts) syncs the cart store through DOM events.
// ---------------------------------------------------------------------------

describe("event-driven sync", () => {
  it("external updateCart call syncs state via events", async () => {
    store.hydrate(
      makeCartState({
        lines: [makeLine({ id: "line-1", quantity: 3 })],
        totalQuantity: 3,
      }),
    );

    const externalPromise = mockUpdateCart({ lines: [{ id: "line-1", quantity: 5 }] });

    expect(getCartLines(store.getState().data)[0].quantity).toBe(5);
    expect(store.getState().pending.lines).toContain("line-1");

    resolveUpdate(
      0,
      serverResult({
        totalQuantity: 5,
        cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
        lines: [
          {
            id: "line-1",
            quantity: 5,
            cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await externalPromise;

    expect(getCartLines(store.getState().data)[0].quantity).toBe(5);
    expect(store.getState().data.cost.totalAmount.amount).toBe("50");
    expect(store.getState().pending.lines).not.toContain("line-1");
  });

  it("external event during pending kit line mutation preserves optimistic", async () => {
    const lineA = makeLine({ id: "line-a", quantity: 3 });
    const lineB = makeLine({ id: "line-b", quantity: 2 });
    store.hydrate(makeCartState({ lines: [lineA, lineB], totalQuantity: 5 }));

    const kitEvent = submitForm({ lineId: "line-a" }, "intent", "increase");
    store.handleFormSubmit(kitEvent);
    await nextTick();
    expect(getCartLines(store.getState().data).find((l) => l.id === "line-a")?.quantity).toBe(4);

    const externalPromise = mockUpdateCart({ lines: [{ id: "line-b", quantity: 7 }] });
    expect(getCartLines(store.getState().data).find((l) => l.id === "line-b")?.quantity).toBe(7);

    resolveUpdate(
      1,
      serverResult({
        totalQuantity: 10,
        lines: [
          {
            id: "line-a",
            quantity: 3,
            cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
          },
          {
            id: "line-b",
            quantity: 7,
            cost: { totalAmount: { amount: "70", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await externalPromise;

    expect(getCartLines(store.getState().data).find((l) => l.id === "line-a")?.quantity).toBe(4);
    expect(getCartLines(store.getState().data).find((l) => l.id === "line-b")?.quantity).toBe(7);
    expect(store.getState().pending.lines).toContain("line-a");
    expect(store.getState().pending.lines).not.toContain("line-b");
  });

  it("external event during optimistic remove does not re-add the line", async () => {
    const lineA = makeLine({ id: "line-a", quantity: 3 });
    const lineB = makeLine({ id: "line-b", quantity: 2 });
    store.hydrate(makeCartState({ lines: [lineA, lineB], totalQuantity: 5 }));

    const kitEvent = submitForm({ lineId: "line-a" }, "intent", "remove");
    store.handleFormSubmit(kitEvent);
    await nextTick();
    expect(getCartLines(store.getState().data).some((l) => l.id === "line-a")).toBe(false);

    const externalPromise = mockUpdateCart({ lines: [{ id: "line-b", quantity: 5 }] });

    resolveUpdate(
      1,
      serverResult({
        totalQuantity: 8,
        lines: [
          {
            id: "line-a",
            quantity: 3,
            cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
          },
          {
            id: "line-b",
            quantity: 5,
            cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await externalPromise;

    expect(getCartLines(store.getState().data).some((l) => l.id === "line-a")).toBe(false);
    expect(getCartLines(store.getState().data).find((l) => l.id === "line-b")?.quantity).toBe(5);
  });

  it("external event during pending discount preserves optimistic codes", async () => {
    store.hydrate(
      makeCartState({
        lines: [makeLine({ id: "line-1", quantity: 3 })],
        totalQuantity: 3,
      }),
    );

    const kitEvent = submitForm({ discountCode: "SAVE10" }, "intent", "discount-apply");
    store.handleFormSubmit(kitEvent);
    await nextTick();
    expect(store.getState().data.discountCodes).toEqual([{ code: "SAVE10", applicable: false }]);

    const externalPromise = mockUpdateCart({ lines: [{ id: "line-1", quantity: 5 }] });

    resolveUpdate(
      1,
      serverResult({
        totalQuantity: 5,
        lines: [
          {
            id: "line-1",
            quantity: 5,
            cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      }),
    );
    await externalPromise;

    expect(store.getState().data.discountCodes).toEqual([{ code: "SAVE10", applicable: false }]);
    expect(store.getState().pending.discountCodes.size).toBeGreaterThan(0);
  });

  it("rejected event promise triggers baseline rollback", async () => {
    store.hydrate(
      makeCartState({
        lines: [makeLine({ id: "line-1", quantity: 3 })],
        totalQuantity: 3,
      }),
    );

    const externalPromise = mockUpdateCart({ lines: [{ id: "line-1", quantity: 10 }] });
    expect(getCartLines(store.getState().data)[0].quantity).toBe(10);

    rejectUpdate(0, new Error("Server error"));
    await externalPromise.catch(() => {});

    expect(getCartLines(store.getState().data)[0].quantity).toBe(3);
    expect(store.getState().pending.lines).not.toContain("line-1");
  });

  it("rapid clicks: baseline tracks original server state, not intermediate optimistic", async () => {
    store.hydrate(
      makeCartState({
        lines: [makeLine({ id: "line-1", quantity: 3 })],
        totalQuantity: 3,
      }),
    );

    const e1 = submitForm({ lineId: "line-1" }, "intent", "increase");
    store.handleFormSubmit(e1);
    await nextTick();
    expect(getCartLines(store.getState().data)[0].quantity).toBe(4);

    const e2 = submitForm({ lineId: "line-1" }, "intent", "increase");
    store.handleFormSubmit(e2);
    await nextTick();
    expect(getCartLines(store.getState().data)[0].quantity).toBe(5);

    resolveUpdate(
      1,
      serverResult({
        totalQuantity: 5,
        cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
        lines: [
          {
            id: "line-1",
            quantity: 5,
            cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await vi.waitFor(() => {
      expect(store.getState().pending.lines).not.toContain("line-1");
    });

    expect(getCartLines(store.getState().data)[0].quantity).toBe(5);
  });

  it("replaced mutation abort is silently ignored (no rollback)", async () => {
    store.hydrate(
      makeCartState({
        lines: [makeLine({ id: "line-1", quantity: 3 })],
        totalQuantity: 3,
      }),
    );

    const e1 = submitForm({ lineId: "line-1" }, "intent", "increase");
    const p1 = store.handleFormSubmit(e1);
    await nextTick();
    expect(getCartLines(store.getState().data)[0].quantity).toBe(4);

    const e2 = submitForm({ lineId: "line-1" }, "intent", "increase");
    store.handleFormSubmit(e2);
    await nextTick();
    expect(getCartLines(store.getState().data)[0].quantity).toBe(5);

    await p1;

    expect(getCartLines(store.getState().data)[0].quantity).toBe(5);
    expect(store.getState().pending.lines).toContain("line-1");
  });
});

// ---------------------------------------------------------------------------
// Add-to-cart optimistic updates — tests verifying that add events match
// existing lines by merchandiseId and create optimistic placeholders for new items.
// ---------------------------------------------------------------------------

describe("add-to-cart optimistic updates", () => {
  const VARIANT_123 = "gid://shopify/ProductVariant/123";
  const VARIANT_456 = "gid://shopify/ProductVariant/456";

  it("matching merchandiseId: optimistically increments quantity and marks pending", async () => {
    store.hydrate(
      makeCartState({
        lines: [lineWithMerchandise("line-1", 3, VARIANT_123)],
        totalQuantity: 3,
      }),
    );

    const externalPromise = mockUpdateCart({
      lines: [{ merchandiseId: VARIANT_123, quantity: 2 }],
    });

    expect(getCartLines(store.getState().data)[0].quantity).toBe(5);
    expect(store.getState().pending.lines).toContain("line-1");
    expect(store.getState().data.totalQuantity).toBe(5);

    resolveUpdate(
      0,
      serverResult({
        totalQuantity: 5,
        cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
        lines: [
          {
            id: "line-1",
            quantity: 5,
            cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await externalPromise;

    expect(getCartLines(store.getState().data)[0].quantity).toBe(5);
    expect(store.getState().pending.lines).not.toContain("line-1");
  });

  it("unknown merchandiseId without detail.products: totalQuantity bump only", async () => {
    store.hydrate(
      makeCartState({
        lines: [makeLine({ id: "line-1", quantity: 3 })],
        totalQuantity: 3,
      }),
    );

    const externalPromise = mockUpdateCart({
      lines: [{ merchandiseId: VARIANT_456, quantity: 1 }],
    });

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(store.getState().data.totalQuantity).toBe(4);
    expect(store.getState().pending.lines).toEqual(new Set());

    resolveUpdate(
      0,
      serverResult({
        totalQuantity: 4,
        lines: [
          {
            id: "line-1",
            quantity: 3,
            cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
          },
          {
            id: "line-new",
            quantity: 1,
            cost: { totalAmount: { amount: "10", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await externalPromise;

    expect(getCartLines(store.getState().data)).toHaveLength(2);
    expect(getCartLines(store.getState().data).find((l) => l.id === "line-new")).toBeDefined();
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("unknown merchandiseId with detail.products: creates optimistic line with merchandise", async () => {
    store.hydrate(
      makeCartState({
        lines: [makeLine({ id: "line-1", quantity: 3 })],
        totalQuantity: 3,
      }),
    );

    const optimisticId = `optimistic:${VARIANT_456}`;

    const externalPromise = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_456, quantity: 1 }] },
      withProducts(productDetail(VARIANT_456, { price: { amount: "10", currencyCode: "USD" } })),
    );

    expect(getCartLines(store.getState().data)).toHaveLength(2);
    const optimisticLine = getCartLines(store.getState().data).find((l) => l.id === optimisticId);
    assert(optimisticLine, "expected optimistic line to exist");
    expect(optimisticLine.quantity).toBe(1);
    expect(optimisticLine.merchandise?.product.title).toBe("T-Shirt");
    expect(optimisticLine.cost.totalAmount.amount).toBe("10");
    expect(store.getState().pending.lines).toContain(optimisticId);
    expect(store.getState().data.totalQuantity).toBe(4);

    resolveUpdate(
      0,
      serverResult({
        totalQuantity: 4,
        lines: [
          {
            id: "line-1",
            quantity: 3,
            cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
          },
          {
            id: "line-new",
            quantity: 1,
            cost: { totalAmount: { amount: "10", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await externalPromise;

    expect(getCartLines(store.getState().data)).toHaveLength(2);
    expect(getCartLines(store.getState().data).every((l) => !l.id.startsWith("optimistic:"))).toBe(
      true,
    );
    expect(getCartLines(store.getState().data).find((l) => l.id === "line-new")).toBeDefined();
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("mixed matched and new: optimistic for matched, placeholder for new", async () => {
    store.hydrate(
      makeCartState({
        lines: [lineWithMerchandise("line-1", 2, VARIANT_123)],
        totalQuantity: 2,
      }),
    );

    const optimisticId = `optimistic:${VARIANT_456}`;

    const externalPromise = mockUpdateCart(
      {
        lines: [
          { merchandiseId: VARIANT_123, quantity: 3 },
          { merchandiseId: VARIANT_456, quantity: 1 },
        ],
      },
      withProducts(productDetail(VARIANT_456)),
    );

    expect(getCartLines(store.getState().data)).toHaveLength(2);
    expect(getCartLines(store.getState().data)[0].quantity).toBe(5);
    expect(getCartLines(store.getState().data).find((l) => l.id === optimisticId)).toBeDefined();
    expect(store.getState().data.totalQuantity).toBe(6);
    expect(store.getState().pending.lines).toContain("line-1");
    expect(store.getState().pending.lines).toContain(optimisticId);

    resolveUpdate(
      0,
      serverResult({
        totalQuantity: 6,
        cost: { totalAmount: { amount: "60", currencyCode: "USD" } },
        lines: [
          {
            id: "line-1",
            quantity: 5,
            cost: { totalAmount: { amount: "50", currencyCode: "USD" } },
          },
          {
            id: "line-2",
            quantity: 1,
            cost: { totalAmount: { amount: "10", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await externalPromise;

    expect(getCartLines(store.getState().data)).toHaveLength(2);
    expect(getCartLines(store.getState().data).every((l) => !l.id.startsWith("optimistic:"))).toBe(
      true,
    );
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("reject: rolls back matched lines to baseline and removes optimistic lines", async () => {
    store.hydrate(
      makeCartState({
        lines: [lineWithMerchandise("line-1", 3, VARIANT_123)],
        totalQuantity: 3,
      }),
    );

    const optimisticId = `optimistic:${VARIANT_456}`;

    const externalPromise = mockUpdateCart(
      {
        lines: [
          { merchandiseId: VARIANT_123, quantity: 2 },
          { merchandiseId: VARIANT_456, quantity: 1 },
        ],
      },
      withProducts(productDetail(VARIANT_456)),
    );

    expect(getCartLines(store.getState().data)[0].quantity).toBe(5);
    expect(getCartLines(store.getState().data).find((l) => l.id === optimisticId)).toBeDefined();
    expect(store.getState().data.totalQuantity).toBe(6);

    rejectUpdate(0, new Error("Server error"));
    await externalPromise.catch(() => {});

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe("line-1");
    expect(getCartLines(store.getState().data)[0].quantity).toBe(3);
    expect(getCartLines(store.getState().data).every((l) => !l.id.startsWith("optimistic:"))).toBe(
      true,
    );
    expect(store.getState().data.totalQuantity).toBe(3);
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("add during pending kit mutation preserves kit optimistic state on resolve", async () => {
    store.hydrate(
      makeCartState({
        lines: [
          lineWithMerchandise("line-a", 3, VARIANT_123),
          makeLine({ id: "line-b", quantity: 2 }),
        ],
        totalQuantity: 5,
      }),
    );

    const kitEvent = submitForm({ lineId: "line-b" }, "intent", "increase");
    store.handleFormSubmit(kitEvent);
    await nextTick();
    expect(getCartLines(store.getState().data).find((l) => l.id === "line-b")?.quantity).toBe(3);

    const externalPromise = mockUpdateCart({
      lines: [{ merchandiseId: VARIANT_123, quantity: 1 }],
    });
    expect(getCartLines(store.getState().data).find((l) => l.id === "line-a")?.quantity).toBe(4);

    resolveUpdate(
      1,
      serverResult({
        totalQuantity: 6,
        lines: [
          {
            id: "line-a",
            quantity: 4,
            cost: { totalAmount: { amount: "40", currencyCode: "USD" } },
          },
          {
            id: "line-b",
            quantity: 2,
            cost: { totalAmount: { amount: "20", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await externalPromise;

    expect(getCartLines(store.getState().data).find((l) => l.id === "line-a")?.quantity).toBe(4);
    expect(getCartLines(store.getState().data).find((l) => l.id === "line-b")?.quantity).toBe(3);
    expect(store.getState().pending.lines).toContain("line-b");
    expect(store.getState().pending.lines).not.toContain("line-a");
  });

  it("empty cart: optimistic placeholder line appears immediately on add", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    const optimisticId = `optimistic:${VARIANT_123}`;

    const externalPromise = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123, { price: { amount: "25", currencyCode: "USD" } })),
    );

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    const optimisticLine = getCartLines(store.getState().data)[0];
    expect(optimisticLine.id).toBe(optimisticId);
    expect(optimisticLine.merchandise?.product.title).toBe("T-Shirt");
    expect(optimisticLine.merchandise?.title).toBe("Small");
    expect(optimisticLine.quantity).toBe(1);
    expect(optimisticLine.cost.totalAmount.amount).toBe("25");
    expect(store.getState().pending.lines).toContain(optimisticId);
    expect(store.getState().data.totalQuantity).toBe(1);

    resolveUpdate(
      0,
      serverResult({
        totalQuantity: 1,
        lines: [
          {
            id: "line-real",
            quantity: 1,
            cost: { totalAmount: { amount: "25", currencyCode: "USD" } },
            merchandise: {
              id: VARIANT_123,
              title: "Small",
              product: { title: "T-Shirt" },
            },
          },
        ],
      }),
    );
    await externalPromise;

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe("line-real");
    expect(getCartLines(store.getState().data).every((l) => !l.id.startsWith("optimistic:"))).toBe(
      true,
    );
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("empty cart add: optimistic line removed on reject", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    const externalPromise = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123)),
    );

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(store.getState().data.totalQuantity).toBe(1);

    rejectUpdate(0, new Error("Server error"));
    await externalPromise.catch(() => {});

    expect(getCartLines(store.getState().data)).toHaveLength(0);
    expect(store.getState().data.totalQuantity).toBe(0);
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("optimistic line preserved during concurrent discount resolve", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    const optimisticId = `optimistic:${VARIANT_123}`;

    const addPromise = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123)),
    );
    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe(optimisticId);

    const discountPromise = mockUpdateCart({ discountCodes: ["SAVE10"] });

    resolveUpdate(
      1,
      serverResult({
        totalQuantity: 0,
        lines: [],
        discountCodes: [{ code: "SAVE10", applicable: true }],
      }),
    );
    await discountPromise;

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe(optimisticId);

    resolveUpdate(
      0,
      serverResult({
        totalQuantity: 1,
        lines: [
          {
            id: "line-real",
            quantity: 1,
            cost: { totalAmount: { amount: "25", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await addPromise;

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe("line-real");
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("optimistic line preserved during concurrent note update resolve", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    const optimisticId = `optimistic:${VARIANT_123}`;

    const addPromise = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123)),
    );
    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe(optimisticId);

    const notePromise = mockUpdateCart({ note: "Gift wrapping please" });

    resolveUpdate(
      1,
      serverResult({
        totalQuantity: 0,
        lines: [],
      }),
    );
    await notePromise;

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe(optimisticId);

    resolveUpdate(
      0,
      serverResult({
        totalQuantity: 1,
        lines: [
          {
            id: "line-real",
            quantity: 1,
            cost: { totalAmount: { amount: "25", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await addPromise;

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe("line-real");
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("optimistic line preserved during concurrent line update resolve", async () => {
    const existingLine = lineWithMerchandise("line-existing", 2, VARIANT_123);
    store.hydrate(makeCartState({ lines: [existingLine], totalQuantity: 2 }));

    const optimisticId = `optimistic:${VARIANT_456}`;

    const addPromise = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_456, quantity: 1 }] },
      withProducts(productDetail(VARIANT_456)),
    );
    expect(getCartLines(store.getState().data)).toHaveLength(2);
    expect(getCartLines(store.getState().data).find((l) => l.id === optimisticId)).toBeDefined();

    const updateEvent = submitForm({ lineId: "line-existing" }, "intent", "increase");
    store.handleFormSubmit(updateEvent);
    await nextTick();
    expect(
      getCartLines(store.getState().data).find((l) => l.id === "line-existing")?.quantity,
    ).toBe(3);

    resolveUpdate(
      1,
      serverResult({
        totalQuantity: 3,
        lines: [
          {
            id: "line-existing",
            quantity: 3,
            cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await vi.waitFor(() => {
      expect(store.getState().pending.lines).not.toContain("line-existing");
    });

    expect(getCartLines(store.getState().data).find((l) => l.id === optimisticId)).toBeDefined();

    resolveUpdate(
      0,
      serverResult({
        totalQuantity: 4,
        lines: [
          {
            id: "line-existing",
            quantity: 3,
            cost: { totalAmount: { amount: "30", currencyCode: "USD" } },
          },
          {
            id: "line-new",
            quantity: 1,
            cost: { totalAmount: { amount: "10", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await addPromise;

    expect(getCartLines(store.getState().data)).toHaveLength(2);
    expect(getCartLines(store.getState().data).every((l) => !l.id.startsWith("optimistic:"))).toBe(
      true,
    );
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("rapid same-variant adds merge into existing optimistic line", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    const optimisticId = `optimistic:${VARIANT_123}`;

    mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123)),
    );

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].quantity).toBe(1);

    const secondAddPromise = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 2 }] },
      withProducts(productDetail(VARIANT_123)),
    );

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe(optimisticId);
    expect(getCartLines(store.getState().data)[0].quantity).toBe(3);
    expect(store.getState().data.totalQuantity).toBe(3);

    resolveUpdate(
      1,
      serverResult({
        totalQuantity: 3,
        lines: [
          {
            id: "line-real",
            quantity: 3,
            cost: { totalAmount: { amount: "75", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await secondAddPromise;

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe("line-real");
    expect(getCartLines(store.getState().data)[0].quantity).toBe(3);
  });

  it("no detail.products: falls back to totalQuantity bump only", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    const externalPromise = mockUpdateCart({
      lines: [{ merchandiseId: VARIANT_123, quantity: 1 }],
    });

    expect(getCartLines(store.getState().data)).toHaveLength(0);
    expect(store.getState().data.totalQuantity).toBe(1);
    expect(store.getState().pending.lines).toEqual(new Set());

    resolveUpdate(
      0,
      serverResult({
        totalQuantity: 1,
        lines: [
          {
            id: "line-real",
            quantity: 1,
            cost: { totalAmount: { amount: "25", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await externalPromise;

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe("line-real");
  });

  it("detail.products with no matching id: no optimistic line", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    const unrelatedVariant = "gid://shopify/ProductVariant/999";

    const externalPromise = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(unrelatedVariant)),
    );

    expect(getCartLines(store.getState().data)).toHaveLength(0);
    expect(store.getState().data.totalQuantity).toBe(1);

    resolveUpdate(
      0,
      serverResult({
        totalQuantity: 1,
        lines: [
          {
            id: "line-real",
            quantity: 1,
            cost: { totalAmount: { amount: "25", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await externalPromise;

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe("line-real");
  });

  it("detail.products with price: optimistic line has cost from price", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123, { price: { amount: "49.99", currencyCode: "CAD" } })),
    );

    const line = getCartLines(store.getState().data)[0];
    expect(line.cost.totalAmount).toEqual({ amount: "49.99", currencyCode: "CAD" });
  });

  it("detail.products without price: optimistic line has zero cost", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123)),
    );

    const line = getCartLines(store.getState().data)[0];
    expect(line.cost.totalAmount).toEqual({ amount: "0", currencyCode: "" });
  });

  it("detail.products passes merchandise fields as-is", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(
        productDetail(VARIANT_123, {
          image: { url: "https://cdn.example.com/img.jpg", altText: "A shirt" },
          customField: "preserved",
        }),
      ),
    );

    const merchandise = getCartLines(store.getState().data)[0].merchandise as any;
    expect(merchandise.id).toBe(VARIANT_123);
    expect(merchandise.title).toBe("Small");
    expect(merchandise.product.title).toBe("T-Shirt");
    expect(merchandise.image).toEqual({
      url: "https://cdn.example.com/img.jpg",
      altText: "A shirt",
    });
    expect(merchandise.customField).toBe("preserved");
  });

  it("add reject skips rollback for matched line when kit mutation superseded it", async () => {
    store.hydrate(
      makeCartState({
        lines: [lineWithMerchandise("line-1", 3, VARIANT_123)],
        totalQuantity: 3,
      }),
    );

    const externalPromise = mockUpdateCart({
      lines: [{ merchandiseId: VARIANT_123, quantity: 2 }],
    });
    expect(getCartLines(store.getState().data)[0].quantity).toBe(5);

    const kitEvent = submitForm({ lineId: "line-1" }, "intent", "increase");
    store.handleFormSubmit(kitEvent);
    await nextTick();
    expect(getCartLines(store.getState().data)[0].quantity).toBe(6);

    rejectUpdate(0, new Error("Server error"));
    await externalPromise.catch(() => {});

    expect(getCartLines(store.getState().data)[0].quantity).toBe(6);
    expect(store.getState().pending.lines).toContain("line-1");
  });
});

// ---------------------------------------------------------------------------
// Add-to-cart concurrency — tests verifying that rapid adds for the same
// merchandiseId supersede each other and don't cause state flickering.
// ---------------------------------------------------------------------------

describe("add-to-cart concurrency", () => {
  const VARIANT_123 = "gid://shopify/ProductVariant/123";
  const VARIANT_456 = "gid://shopify/ProductVariant/456";

  it("rapid same-variant adds: stale success responses are ignored", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123, { price: { amount: "10", currencyCode: "USD" } })),
    );
    mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123, { price: { amount: "10", currencyCode: "USD" } })),
    );
    const p3 = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123, { price: { amount: "10", currencyCode: "USD" } })),
    );

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].quantity).toBe(3);

    // Stale response from first add must NOT regress the optimistic quantity
    resolveUpdate(0, serverCart(1, [{ id: "line-real", quantity: 1 }]));
    await vi.waitFor(() => {});
    expect(getCartLines(store.getState().data)[0].quantity).not.toBe(1);

    resolveUpdate(1, serverCart(2, [{ id: "line-real", quantity: 2 }]));
    await vi.waitFor(() => {});
    expect(getCartLines(store.getState().data)[0].quantity).not.toBe(2);

    resolveUpdate(2, serverCart(3, [{ id: "line-real", quantity: 3 }]));
    await p3;

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].quantity).toBe(3);
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("rapid same-variant adds: correct regardless of resolution order", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123, { price: { amount: "10", currencyCode: "USD" } })),
    );
    mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123, { price: { amount: "10", currencyCode: "USD" } })),
    );
    const p3 = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123, { price: { amount: "10", currencyCode: "USD" } })),
    );

    expect(getCartLines(store.getState().data)[0].quantity).toBe(3);

    resolveUpdate(2, serverCart(3, [{ id: "line-real", quantity: 3 }]));
    resolveUpdate(0, serverCart(1, [{ id: "line-real", quantity: 1 }]));
    resolveUpdate(1, serverCart(2, [{ id: "line-real", quantity: 2 }]));
    await p3;

    expect(getCartLines(store.getState().data)[0].quantity).toBe(3);
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("superseded add rejection skips optimistic rollback", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    const optimisticId = `optimistic:${VARIANT_123}`;

    const p1 = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123, { price: { amount: "10", currencyCode: "USD" } })),
    );

    expect(getCartLines(store.getState().data)[0].id).toBe(optimisticId);
    expect(getCartLines(store.getState().data)[0].quantity).toBe(1);

    const p2 = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123, { price: { amount: "10", currencyCode: "USD" } })),
    );

    expect(getCartLines(store.getState().data)[0].quantity).toBe(2);

    rejectUpdate(0, new Error("Server error"));
    await p1.catch(() => {});

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].quantity).toBe(2);

    resolveUpdate(1, serverCart(2, [{ id: "line-real", quantity: 2 }]));
    await p2;

    expect(getCartLines(store.getState().data)[0].id).toBe("line-real");
    expect(getCartLines(store.getState().data)[0].quantity).toBe(2);
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("non-superseded add rejection still rolls back", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    const p1 = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123, { price: { amount: "10", currencyCode: "USD" } })),
    );

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(store.getState().data.totalQuantity).toBe(1);

    rejectUpdate(0, new Error("Server error"));
    await p1.catch(() => {});

    expect(getCartLines(store.getState().data)).toHaveLength(0);
    expect(store.getState().data.totalQuantity).toBe(0);
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("non-superseded add rejection without detail.products rolls back the quantity bump", async () => {
    store.hydrate(
      makeCartState({
        lines: [makeLine({ id: "line-1", quantity: 3 })],
        totalQuantity: 3,
      }),
    );

    const p1 = mockUpdateCart({
      lines: [{ merchandiseId: VARIANT_456, quantity: 2 }],
    });

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(store.getState().data.totalQuantity).toBe(5);

    rejectUpdate(0, new Error("Server error"));
    await p1.catch(() => {});

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(store.getState().data.totalQuantity).toBe(3);
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("multi-variant add: partial supersession rolls back only non-superseded", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    const p1 = mockUpdateCart(
      {
        lines: [
          { merchandiseId: VARIANT_123, quantity: 1 },
          { merchandiseId: VARIANT_456, quantity: 1 },
        ],
      },
      withProducts(
        productDetail(VARIANT_123, { price: { amount: "10", currencyCode: "USD" } }),
        productDetail(VARIANT_456, { price: { amount: "20", currencyCode: "USD" } }),
      ),
    );

    expect(getCartLines(store.getState().data)).toHaveLength(2);

    const p2 = mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123, { price: { amount: "10", currencyCode: "USD" } })),
    );

    expect(
      getCartLines(store.getState().data).find((l) => l.id === `optimistic:${VARIANT_123}`)
        ?.quantity,
    ).toBe(2);

    rejectUpdate(0, new Error("Server error"));
    await p1.catch(() => {});

    expect(
      getCartLines(store.getState().data).find((l) => l.id === `optimistic:${VARIANT_123}`),
    ).toBeDefined();
    expect(
      getCartLines(store.getState().data).find((l) => l.id === `optimistic:${VARIANT_456}`),
    ).toBeUndefined();

    resolveUpdate(1, serverCart(2, [{ id: "line-real", quantity: 2 }]));
    await p2;

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].quantity).toBe(2);
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("reset aborts in-flight merchandise adds", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    mockUpdateCart(
      { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] },
      withProducts(productDetail(VARIANT_123, { price: { amount: "10", currencyCode: "USD" } })),
    );

    expect(getCartLines(store.getState().data)).toHaveLength(1);

    store.reset();

    resolveUpdate(0, serverCart(1, [{ id: "line-real", quantity: 1 }]));
    await vi.waitFor(() => {
      const state = store.getState();
      expect(getCartLines(state.data)).toEqual([]);
      expect(state).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({ totalQuantity: 0 }),
          pending: expect.objectContaining({ lines: new Set() }),
        }),
      );
    });
  });

  it("rapid add via configured cart endpoint: abort signal fires on supersession", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    configureCartEndpoint("/api/cart");

    const dummyLine = makeLine({ id: "line-setup", quantity: 1 });
    store.hydrate(makeCartState({ lines: [dummyLine], totalQuantity: 1 }));

    const setupEvent = submitForm({ lineId: "line-setup" }, "intent", "increase");
    store.handleFormSubmit(setupEvent);

    const handler = configuredUpdateCartHandler;
    if (!handler) throw new Error("Expected configure handler");

    store.reset();
    configureCartEndpoint("/api/cart");
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    mockFetch.mockReset();
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const addPayload = { lines: [{ merchandiseId: VARIANT_123, quantity: 1 }] };
    const addOptions = withProducts(
      productDetail(VARIANT_123, { price: { amount: "10", currencyCode: "USD" } }),
    );

    mockUpdateCart(addPayload, addOptions);
    handler(vi.fn(), addPayload, { signal: new AbortController().signal });

    mockUpdateCart(addPayload, addOptions);
    handler(vi.fn(), addPayload, { signal: new AbortController().signal });

    const [, init1] = mockFetch.mock.calls[0];
    expect(init1.signal.aborted).toBe(true);

    const [, init2] = mockFetch.mock.calls[1];
    expect(init2.signal.aborted).toBe(false);

    vi.unstubAllGlobals();
    Object.defineProperty(window, "Shopify", {
      value: { actions: { updateCart: mockUpdateCart, getCart: mockGetCart } },
      configurable: true,
      writable: true,
    });
    resetStandardActionsForTests();
  });
});

// ---------------------------------------------------------------------------
// cart: null resolution — when the server resolves a mutation with no cart
// (e.g. all merchandiseIds were invalid), optimistic state must be rolled
// back and any userErrors surfaced. A successful resolve with cart: null is
// not "do nothing": it's a fully failed mutation that needs cleanup just
// like a rejection, plus error surfacing.
// ---------------------------------------------------------------------------

describe("cart: null resolution", () => {
  const VARIANT_123 = "gid://shopify/ProductVariant/123";
  const VARIANT_456 = "gid://shopify/ProductVariant/456";

  it("lines add: invalid merchandise rolls back optimistic lines and surfaces errors", async () => {
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    const externalPromise = mockUpdateCart(
      {
        lines: [
          { merchandiseId: VARIANT_123, quantity: 1 },
          { merchandiseId: VARIANT_456, quantity: 2 },
        ],
      },
      withProducts(productDetail(VARIANT_123), productDetail(VARIANT_456)),
    );

    expect(getCartLines(store.getState().data)).toHaveLength(2);
    expect(store.getState().pending.lines.size).toBe(2);
    expect(store.getState().data.totalQuantity).toBe(3);

    resolveUpdate(0, {
      cart: null,
      userErrors: [
        {
          code: "INVALID",
          message: `The merchandise with id ${VARIANT_123} does not exist.`,
          field: ["input", "lines", "0", "merchandiseId"],
        },
        {
          code: "INVALID",
          message: `The merchandise with id ${VARIANT_456} does not exist.`,
          field: ["input", "lines", "1", "merchandiseId"],
        },
      ],
    });
    await externalPromise;

    expect(getCartLines(store.getState().data)).toEqual([]);
    expect(store.getState().data.totalQuantity).toBe(0);
    expect(store.getState().pending.lines).toEqual(new Set());

    const errors = store.getState().errors;
    expect(errors.cart.userErrors).toHaveLength(2);
    expect(errors.cart.userErrors[0]).toMatchObject({
      code: "INVALID",
      message: `The merchandise with id ${VARIANT_123} does not exist.`,
    });
  });

  it("lines add: unknown merchandise without detail.products undoes the totalQuantity bump and surfaces errors", async () => {
    // Without `detail.products`, the add path bumps totalQuantity without creating
    // an optimistic line or matched line. cart: null must still undo that bump
    // and surface the userErrors.
    store.hydrate(
      makeCartState({
        lines: [makeLine({ id: "line-1", quantity: 3 })],
        totalQuantity: 3,
      }),
    );

    const externalPromise = mockUpdateCart({
      lines: [{ merchandiseId: VARIANT_456, quantity: 2 }],
    });

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(store.getState().data.totalQuantity).toBe(5);

    resolveUpdate(0, {
      cart: null,
      userErrors: [
        {
          code: "INVALID",
          message: `The merchandise with id ${VARIANT_456} does not exist.`,
          field: ["input", "lines", "0", "merchandiseId"],
        },
      ],
    });
    await externalPromise;

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(store.getState().data.totalQuantity).toBe(3);
    expect(store.getState().pending.lines).toEqual(new Set());

    const errors = store.getState().errors;
    expect(errors.cart.userErrors).toHaveLength(1);
    expect(errors.cart.userErrors[0]).toMatchObject({
      code: "INVALID",
      message: `The merchandise with id ${VARIANT_456} does not exist.`,
    });
  });

  it("lines add: untracked bump does not subtract quantity already owned by a superseding add", async () => {
    // Rapid adds for the same merchandiseId, both without detail.products:
    //   1) request A bumps totalQuantity by 2
    //   2) request B (newer) supersedes A and bumps totalQuantity by 1
    //   3) A resolves cart: null → must NOT subtract A's 2 from the bumped total
    //      because A no longer owns the merchandiseId.
    store.hydrate(makeCartState({ lines: [], totalQuantity: 0 }));

    const promiseA = mockUpdateCart({
      lines: [{ merchandiseId: VARIANT_123, quantity: 2 }],
    });
    expect(store.getState().data.totalQuantity).toBe(2);

    const promiseB = mockUpdateCart({
      lines: [{ merchandiseId: VARIANT_123, quantity: 1 }],
    });
    expect(store.getState().data.totalQuantity).toBe(3);

    resolveUpdate(0, {
      cart: null,
      userErrors: [
        {
          code: "INVALID",
          message: "Bad",
          field: ["input", "lines", "0", "merchandiseId"],
        },
      ],
    });
    await promiseA;

    expect(store.getState().data.totalQuantity).toBe(3);

    resolveUpdate(
      1,
      serverResult({
        totalQuantity: 1,
        lines: [
          {
            id: "line-real",
            quantity: 1,
            cost: { totalAmount: { amount: "10", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await promiseB;

    expect(store.getState().data.totalQuantity).toBe(1);
  });

  it("lines add: mixed tracked and untracked rollback preserves superseded untracked quantity", async () => {
    store.hydrate(
      makeCartState({
        lines: [lineWithMerchandise("line-1", 2, VARIANT_123)],
        totalQuantity: 2,
      }),
    );

    const promiseA = mockUpdateCart({
      lines: [
        { merchandiseId: VARIANT_123, quantity: 1 },
        { merchandiseId: VARIANT_456, quantity: 2 },
      ],
    });

    expect(getCartLines(store.getState().data)[0].quantity).toBe(3);
    expect(store.getState().data.totalQuantity).toBe(5);

    const promiseB = mockUpdateCart({
      lines: [{ merchandiseId: VARIANT_456, quantity: 1 }],
    });
    expect(store.getState().data.totalQuantity).toBe(6);

    resolveUpdate(0, {
      cart: null,
      userErrors: [
        {
          code: "INVALID",
          message: "Existing line rejected",
          field: ["input", "lines", "0", "merchandiseId"],
        },
        {
          code: "INVALID",
          message: "Unknown merchandise rejected",
          field: ["input", "lines", "1", "merchandiseId"],
        },
      ],
    });
    await promiseA;

    expect(getCartLines(store.getState().data)[0].quantity).toBe(2);
    expect(store.getState().data.totalQuantity).toBe(5);
    expect(store.getState().errors.lines.get("line-1")?.userErrors).toHaveLength(1);
    expect(store.getState().errors.cart.userErrors).toHaveLength(1);

    resolveUpdate(
      1,
      serverResult({
        totalQuantity: 3,
        lines: [
          {
            id: "line-1",
            quantity: 2,
            cost: { totalAmount: { amount: "20", currencyCode: "USD" } },
          },
          {
            id: "line-new",
            quantity: 1,
            cost: { totalAmount: { amount: "10", currencyCode: "USD" } },
          },
        ],
      }),
    );
    await promiseB;

    expect(store.getState().data.totalQuantity).toBe(3);
  });

  it("lines add: matched line rolled back to baseline when cart is null", async () => {
    store.hydrate(
      makeCartState({
        lines: [lineWithMerchandise("line-1", 2, VARIANT_123)],
        totalQuantity: 2,
      }),
    );

    const externalPromise = mockUpdateCart({
      lines: [{ merchandiseId: VARIANT_123, quantity: 3 }],
    });

    expect(getCartLines(store.getState().data)[0].quantity).toBe(5);
    expect(store.getState().pending.lines).toContain("line-1");

    resolveUpdate(0, {
      cart: null,
      userErrors: [{ code: "INVALID", message: "Bad", field: ["lines", "0"] }],
    });
    await externalPromise;

    expect(getCartLines(store.getState().data)[0].quantity).toBe(2);
    expect(store.getState().pending.lines).toEqual(new Set());
    expect(store.getState().data.totalQuantity).toBe(2);
    expect(store.getState().errors.lines.get("line-1")?.userErrors).toEqual([
      { code: "INVALID", message: "Bad", field: ["lines", "0"] },
    ]);
  });

  it("lines update: cart: null rolls back quantity to baseline and surfaces line errors", async () => {
    store.hydrate(
      makeCartState({
        lines: [makeLine({ id: "line-1", quantity: 3 })],
        totalQuantity: 3,
      }),
    );

    const externalPromise = mockUpdateCart({ lines: [{ id: "line-1", quantity: 10 }] });
    expect(getCartLines(store.getState().data)[0].quantity).toBe(10);
    expect(store.getState().pending.lines).toContain("line-1");

    resolveUpdate(0, {
      cart: null,
      userErrors: [{ code: "INVALID", message: "Line bad", field: ["lines", "0"] }],
    });
    await externalPromise;

    expect(getCartLines(store.getState().data)[0].quantity).toBe(3);
    expect(store.getState().pending.lines).not.toContain("line-1");
    expect(store.getState().errors.lines.get("line-1")?.userErrors).toHaveLength(1);
  });

  it("lines remove: cart: null restores the optimistically-removed line", async () => {
    store.hydrate(
      makeCartState({
        lines: [makeLine({ id: "line-1", quantity: 3 })],
        totalQuantity: 3,
      }),
    );

    const externalPromise = mockUpdateCart({ lines: [{ id: "line-1", quantity: 0 }] });
    expect(getCartLines(store.getState().data)).toHaveLength(0);

    resolveUpdate(0, {
      cart: null,
      userErrors: [{ code: "INVALID", message: "Cannot remove", field: ["lines", "0"] }],
    });
    await externalPromise;

    expect(getCartLines(store.getState().data)).toHaveLength(1);
    expect(getCartLines(store.getState().data)[0].id).toBe("line-1");
    expect(getCartLines(store.getState().data)[0].quantity).toBe(3);
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("discount: cart: null rolls back to baseline and surfaces discount errors", async () => {
    store.hydrate(
      makeCartState({
        discountCodes: [{ code: "ORIGINAL", applicable: true }],
      }),
    );

    const externalPromise = mockUpdateCart({ discountCodes: ["NEW"] });
    expect(store.getState().data.discountCodes.map((d) => d.code)).toEqual(["NEW"]);
    expect(store.getState().pending.discountCodes.size).toBeGreaterThan(0);

    resolveUpdate(0, {
      cart: null,
      userErrors: [{ code: "INVALID", message: "Bad code", field: ["discountCodes", "0"] }],
    });
    await externalPromise;

    expect(store.getState().data.discountCodes).toEqual([{ code: "ORIGINAL", applicable: true }]);
    expect(store.getState().pending.discountCodes).toEqual(new Set());
    expect(store.getState().errors.discountCodes.get("NEW")?.userErrors).toHaveLength(1);
  });

  it("note: cart: null rolls back to baseline and surfaces note errors", async () => {
    store.hydrate(
      makeCartState({
        note: "Original note",
      }),
    );

    const externalPromise = mockUpdateCart({ note: "Bad note" });
    expect(store.getState().data.note).toBe("Bad note");
    expect(store.getState().pending.note).toBe(true);

    resolveUpdate(0, {
      cart: null,
      userErrors: [{ code: "INVALID", message: "Note too long" }],
    });
    await externalPromise;

    expect(store.getState().data.note).toBe("Original note");
    expect(store.getState().pending.note).toBe(false);
    expect(store.getState().errors.note.userErrors).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// handleFormSubmit — add intent
// ---------------------------------------------------------------------------

describe("CartStore.handleFormSubmit — add intent", () => {
  it("calls updateCart with merchandiseId and quantity from form", async () => {
    store.hydrate(makeCartState());

    const event = submitForm(
      { merchandiseId: "gid://shopify/ProductVariant/1", quantity: "2" },
      "intent",
      "add",
    );
    const promise = store.handleFormSubmit(event);
    await nextTick();

    expect(mockUpdateCart).toHaveBeenCalledTimes(1);
    expect(mockUpdateCart).toHaveBeenCalledWith(
      { lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 2 }] },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 2,
        cost: { totalAmount: { amount: "20", currencyCode: "USD" } },
        lines: [
          {
            id: "line-new",
            quantity: 2,
            merchandise: { id: "gid://shopify/ProductVariant/1" },
            cost: { totalAmount: { amount: "20", currencyCode: "USD" } },
          },
        ],
        discountCodes: [],
      },
    });

    await promise;
  });

  it("defaults quantity to 1 when field is missing", async () => {
    store.hydrate(makeCartState());

    const event = submitForm({ merchandiseId: "gid://shopify/ProductVariant/1" }, "intent", "add");
    const promise = store.handleFormSubmit(event);
    await nextTick();

    expect(mockUpdateCart).toHaveBeenCalledWith(
      { lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 1,
        cost: {},
        lines: [],
        discountCodes: [],
      },
    });
    await promise;
  });

  it("throws when merchandiseId is missing", async () => {
    store.hydrate(makeCartState());

    const event = submitForm({}, "intent", "add");
    await expect(store.handleFormSubmit(event)).rejects.toThrow("merchandiseId");
  });

  it("forwards sellingPlanId when present", async () => {
    store.hydrate(makeCartState());

    const event = submitForm(
      {
        merchandiseId: "gid://shopify/ProductVariant/1",
        quantity: "1",
        sellingPlanId: "gid://shopify/SellingPlan/1",
      },
      "intent",
      "add",
    );
    const promise = store.handleFormSubmit(event);
    await nextTick();

    expect(mockUpdateCart).toHaveBeenCalledWith(
      {
        lines: [
          {
            merchandiseId: "gid://shopify/ProductVariant/1",
            quantity: 1,
            sellingPlanId: "gid://shopify/SellingPlan/1",
          },
        ],
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 1,
        cost: {},
        lines: [],
        discountCodes: [],
      },
    });
    await promise;
  });

  it("rapid add form submissions both dispatch updateCart calls", async () => {
    store.hydrate(makeCartState());

    const e1 = submitForm(
      { merchandiseId: "gid://shopify/ProductVariant/1", quantity: "1" },
      "intent",
      "add",
    );
    store.handleFormSubmit(e1);

    const e2 = submitForm(
      { merchandiseId: "gid://shopify/ProductVariant/1", quantity: "3" },
      "intent",
      "add",
    );
    store.handleFormSubmit(e2);
    await nextTick();

    expect(mockUpdateCart).toHaveBeenCalledTimes(2);
    expect(mockUpdateCart.mock.calls[0][0]).toEqual({
      lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }],
    });
    expect(mockUpdateCart.mock.calls[1][0]).toEqual({
      lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 3 }],
    });
  });

  it("triggers add path when intent is empty but merchandiseId is present", async () => {
    store.hydrate(makeCartState());

    const event = submitForm(
      { merchandiseId: "gid://shopify/ProductVariant/1", quantity: "1" },
      "intent",
      "",
    );
    const promise = store.handleFormSubmit(event);
    await nextTick();

    expect(mockUpdateCart).toHaveBeenCalledWith(
      { lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 1,
        cost: {},
        lines: [],
        discountCodes: [],
      },
    });
    await promise;
  });
});

// ---------------------------------------------------------------------------
// Standard Actions readiness
// ---------------------------------------------------------------------------

describe("getShopifyStandardActions", () => {
  afterEach(() => {
    Object.defineProperty(document, "readyState", {
      value: "complete",
      configurable: true,
    });
  });

  it("explains how to add the Standard Actions script when the tag is missing", async () => {
    Object.defineProperty(window, "Shopify", {
      value: {},
      configurable: true,
      writable: true,
    });
    resetStandardActionsForTests();

    await expect(getShopifyStandardActions()).rejects.toThrow(
      `include ${SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT}`,
    );
  });

  it("explains that Standard Actions has not loaded when the script tag is present", async () => {
    Object.defineProperty(window, "Shopify", {
      value: {},
      configurable: true,
      writable: true,
    });
    const script = document.createElement("script");
    script.type = "application/json";
    script.src = SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT;
    document.head.append(script);
    resetStandardActionsForTests();

    await expect(getShopifyStandardActions()).rejects.toThrow(
      "Ensure the Shopify script tag has loaded before calling cart actions.",
    );
  });

  it("waits for DOMContentLoaded before configuring Standard Actions", async () => {
    const updateCart = createStandardActionsMock();
    const getCart = vi.fn();
    Object.defineProperty(window, "Shopify", {
      value: { actions: { updateCart, getCart } },
      configurable: true,
      writable: true,
    });
    resetStandardActionsForTests();
    Object.defineProperty(document, "readyState", {
      value: "loading",
      configurable: true,
    });

    const actionsPromise = getShopifyStandardActions();
    await Promise.resolve();

    expect(updateCart.configure).not.toHaveBeenCalled();

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await expect(actionsPromise).resolves.toBe(window.Shopify?.actions);
    expect(updateCart.configure).toHaveBeenCalledTimes(1);
  });

  it("form submissions wait for configured Standard Actions", async () => {
    const updateCart = createStandardActionsMock();
    const getCart = vi.fn();
    Object.defineProperty(window, "Shopify", {
      value: { actions: { updateCart, getCart } },
      configurable: true,
      writable: true,
    });
    resetStandardActionsForTests();
    Object.defineProperty(document, "readyState", {
      value: "loading",
      configurable: true,
    });

    const localStore = createCartStore();
    const event = submitForm({ merchandiseId: "gid://shopify/ProductVariant/1" }, "intent", "add");
    const promise = localStore.handleFormSubmit(event);
    await nextTick();

    expect(updateCart).not.toHaveBeenCalled();

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await vi.waitFor(() => expect(updateCart).toHaveBeenCalledTimes(1));
    expect(updateCart).toHaveBeenCalledWith(
      { lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }] },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    resolveUpdate(0, {
      cart: {
        id: "gid://shopify/Cart/123",
        totalQuantity: 1,
        cost: {},
        lines: [],
        discountCodes: [],
      },
    });
    await promise;
    localStore.destroy();
  });
});

// ---------------------------------------------------------------------------
// Trampoline handler + configureCartEndpoint
// ---------------------------------------------------------------------------

describe("configureCartEndpoint", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  function triggerConfigure() {
    const line = makeLine({ id: "line-1", quantity: 3 });
    store.hydrate(makeCartState({ lines: [line], totalQuantity: 3 }));
    const event = submitForm({ lineId: "line-1" }, "intent", "increase");
    store.handleFormSubmit(event);
  }

  function extractConfiguredHandler() {
    triggerConfigure();
    if (!configuredUpdateCartHandler) {
      throw new Error("Expected updateCart.configure handler to be installed");
    }
    return configuredUpdateCartHandler;
  }

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, "Shopify", {
      value: { actions: { updateCart: mockUpdateCart, getCart: mockGetCart } },
      configurable: true,
      writable: true,
    });
    resetStandardActionsForTests();
  });

  it("configure is called once with a handler when cart sync attaches", () => {
    triggerConfigure();
    expect(configuredUpdateCartHandler).toBeTypeOf("function");
  });

  it("with configureCartEndpoint, handler POSTs to the configured endpoint", async () => {
    configureCartEndpoint("/api/cart");
    const handler = extractConfiguredHandler();

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ cart: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const defaultHandler = vi.fn();
    const payload = { lines: [{ id: "line-1", quantity: 4 }] };
    await handler(defaultHandler, payload, {});

    expect(defaultHandler).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/cart",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: expect.any(AbortSignal),
      }),
    );

    const fetchBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(fetchBody.lines).toEqual([{ id: "line-1", quantity: 4 }]);
  });

  it("reset does not affect endpoint configuration", async () => {
    configureCartEndpoint("/api/cart");
    const handler = extractConfiguredHandler();
    store.reset();

    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ cart: null }), { status: 200 }));

    await handler(vi.fn(), { lines: [{ id: "x", quantity: 1 }] });
    expect(mockFetch).toHaveBeenCalledWith("/api/cart", expect.anything());
  });

  it("destroy does not affect app endpoint configuration", async () => {
    configureCartEndpoint("/api/cart");
    const handler = extractConfiguredHandler();
    store.destroy();

    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ cart: null }), { status: 200 }));

    await handler(vi.fn(), { lines: [{ id: "x", quantity: 1 }] });
    expect(mockFetch).toHaveBeenCalledWith("/api/cart", expect.anything());
  });

  it("handler includes timeout signal", async () => {
    configureCartEndpoint("/api/cart");
    const handler = extractConfiguredHandler();

    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ cart: null }), { status: 200 }));

    await handler(vi.fn(), { lines: [{ id: "x", quantity: 1 }] });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.signal).toBeDefined();
  });

  it("handler composes caller signal with timeout", async () => {
    configureCartEndpoint("/api/cart");
    const handler = extractConfiguredHandler();

    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ cart: null }), { status: 200 }));

    const callerController = new AbortController();
    await handler(
      vi.fn(),
      { lines: [{ id: "x", quantity: 1 }] },
      { signal: callerController.signal },
    );

    const [, init] = mockFetch.mock.calls[0];
    expect(init.signal).toBeDefined();
  });

  it("handler throws CartNetworkError on non-2xx response", async () => {
    configureCartEndpoint("/api/cart");
    const handler = extractConfiguredHandler();

    mockFetch.mockResolvedValueOnce(new Response("Internal Server Error", { status: 500 }));

    await expect(handler(vi.fn(), { lines: [{ id: "x", quantity: 1 }] })).rejects.toThrow(
      CartNetworkError,
    );
  });

  it("same endpoint is a no-op", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    configureCartEndpoint("/api/cart");
    configureCartEndpoint("/api/cart");
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("different endpoint warns and replaces handler", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    configureCartEndpoint("/api/cart");
    configureCartEndpoint("/custom/cart");
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("/custom/cart"));

    const handler = extractConfiguredHandler();
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ cart: null }), { status: 200 }));
    await handler(vi.fn(), { lines: [{ id: "x", quantity: 1 }] });
    expect(mockFetch).toHaveBeenCalledWith("/custom/cart", expect.anything());

    consoleSpy.mockRestore();
  });
});
