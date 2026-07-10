// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  configureCartEndpoint,
  createCartStore,
  resetStandardActionsForTests,
  type CartStore,
} from "./cart";
import type { CartData, CartLine } from "./state";
import { EMPTY_CART_DATA } from "./state";

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  promise.catch(() => {});
  return { promise, resolve, reject };
}

function makeLine(id: string, quantity: number, merchandiseId?: string): CartLine {
  const amount = { amount: "10", currencyCode: "USD" };
  return {
    id,
    quantity,
    ...(merchandiseId && {
      merchandise: { id: merchandiseId, title: "Small", product: { title: "Shirt" } },
    }),
    cost: {
      totalAmount: amount,
      subtotalAmount: amount,
      amountPerQuantity: amount,
      compareAtAmountPerQuantity: null,
    },
  };
}

function makeCart(lines: CartLine[]): CartData {
  return {
    ...EMPTY_CART_DATA,
    id: "gid://shopify/Cart/test",
    totalQuantity: lines.reduce((total, line) => total + line.quantity, 0),
    lines: { nodes: lines },
    discountCodes: [],
  };
}

function product(merchandiseId: string): Record<string, unknown> {
  return {
    id: merchandiseId,
    title: "Small",
    product: { title: "Shirt" },
    price: { amount: "10", currencyCode: "USD" },
  };
}

function dispatchAdd(
  lines: Array<{ merchandiseId: string; quantity: number }>,
  products: Array<Record<string, unknown>>,
  deferred: Deferred<unknown>,
): void {
  const event = Object.assign(new Event("shopify:cart:lines-update"), {
    action: "add" as const,
    context: "standard-action" as const,
    lines,
    promise: deferred.promise,
    detail: { products },
  });
  document.dispatchEvent(event);
}

function dispatchDiscount(discountCodes: string[], deferred: Deferred<unknown>): void {
  const event = Object.assign(new Event("shopify:cart:discount-update"), {
    discountCodes: discountCodes.map((code) => ({ code })),
    promise: deferred.promise,
  });
  document.dispatchEvent(event);
}

function submitLine(lineId: string, intent = "increase", quantity?: number): SubmitEvent {
  const form = document.createElement("form");
  const lineInput = document.createElement("input");
  lineInput.name = "lineId";
  lineInput.value = lineId;
  if (quantity !== undefined) {
    const quantityInput = document.createElement("input");
    quantityInput.name = "quantity";
    quantityInput.value = String(quantity);
    form.append(quantityInput);
  }
  const button = document.createElement("button");
  button.name = "intent";
  button.value = intent;
  form.append(lineInput, button);
  document.body.append(form);
  let submitted!: SubmitEvent;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitted = event;
  });
  button.click();
  form.remove();
  return submitted;
}

function serverResult(lines: CartLine[]): unknown {
  return {
    cart: {
      id: "gid://shopify/Cart/test",
      totalQuantity: lines.reduce((total, line) => total + line.quantity, 0),
      cost: { totalAmount: { amount: "10", currencyCode: "USD" } },
      lines,
      discountCodes: [],
    },
  };
}

describe("transaction cart store", () => {
  let store: CartStore;
  let transportDeferreds: Array<Deferred<unknown>>;
  let transportSignals: AbortSignal[];
  let dispatchEventsSynchronously: boolean;

  beforeEach(() => {
    transportDeferreds = [];
    transportSignals = [];
    dispatchEventsSynchronously = true;
    const updateCart = Object.assign(
      vi.fn(
        (
          payload: { lines?: Array<{ id?: string; quantity: number }> },
          options?: { signal?: AbortSignal },
        ) => {
          const deferred = createDeferred<unknown>();
          transportDeferreds.push(deferred);
          if (options?.signal) {
            transportSignals.push(options.signal);
            options.signal.addEventListener("abort", () => {
              deferred.reject(new DOMException("Aborted", "AbortError"));
            });
          }
          if (payload.lines) {
            const dispatchEvent = () => {
              const event = Object.assign(new Event("shopify:cart:lines-update"), {
                action: "update" as const,
                context: "standard-action" as const,
                lines: payload.lines,
                promise: dispatchEventsSynchronously
                  ? deferred.promise
                  : deferred.promise.then((result) => result),
              });
              document.dispatchEvent(event);
            };
            if (dispatchEventsSynchronously) dispatchEvent();
            if (!dispatchEventsSynchronously) queueMicrotask(dispatchEvent);
          }
          return deferred.promise;
        },
      ),
      { configure: vi.fn(() => true), isDefault: vi.fn(() => true) },
    );
    Object.defineProperty(window, "Shopify", {
      value: { actions: { updateCart, getCart: vi.fn() } },
      configurable: true,
      writable: true,
    });
    resetStandardActionsForTests();
    store = createCartStore({ initialData: { cart: EMPTY_CART_DATA } });
    store.connect();
  });

  afterEach(async () => {
    store.destroy();
    resetStandardActionsForTests();
    await Promise.resolve();
  });

  it("removes only a rejected unkeyed add transaction", async () => {
    const first = createDeferred<unknown>();
    const second = createDeferred<unknown>();
    dispatchAdd([{ merchandiseId: "variant-a", quantity: 1 }], [product("variant-a")], first);
    dispatchAdd([{ merchandiseId: "variant-a", quantity: 1 }], [product("variant-a")], second);

    expect(store.getState().data.lines.nodes[0].quantity).toBe(2);
    first.reject(new Error("first add failed"));
    await Promise.resolve();

    expect(store.getState().data.lines.nodes[0].quantity).toBe(1);
    expect(store.getState().pending.lines).toContain("optimistic:variant-a");
  });

  it("keeps non-overlapping items from an older add batch pending", async () => {
    const batch = createDeferred<unknown>();
    const newer = createDeferred<unknown>();
    dispatchAdd(
      [
        { merchandiseId: "variant-a", quantity: 2 },
        { merchandiseId: "variant-b", quantity: 1 },
      ],
      [product("variant-a"), product("variant-b")],
      batch,
    );
    dispatchAdd([{ merchandiseId: "variant-a", quantity: 1 }], [product("variant-a")], newer);

    newer.resolve(serverResult([makeLine("line-a", 3, "variant-a")]));
    await Promise.resolve();

    expect(store.getState().data.lines.nodes.find((line) => line.id === "line-a")?.quantity).toBe(
      3,
    );
    expect(
      store.getState().data.lines.nodes.find((line) => line.id === "optimistic:variant-b")
        ?.quantity,
    ).toBe(1);

    batch.reject(new Error("older batch failed"));
    await Promise.resolve();
    expect(store.getState().data.lines.nodes.map((line) => line.id)).toEqual(["line-a"]);
  });

  it("settles endpoint results that already contain a lines connection", async () => {
    const addition = createDeferred<unknown>();
    dispatchAdd([{ merchandiseId: "variant-a", quantity: 1 }], [product("variant-a")], addition);
    addition.resolve({
      cart: {
        ...makeCart([makeLine("line-a", 1, "variant-a")]),
        lines: { nodes: [makeLine("line-a", 1, "variant-a")] },
      },
    });
    await Promise.resolve();

    expect(store.getState().data.lines.nodes).toHaveLength(1);
    expect(store.getState().data.lines.nodes[0].id).toBe("line-a");
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("does not let one keyed line abort an unrelated line", async () => {
    store.hydrate(makeCart([makeLine("line-a", 1), makeLine("line-b", 1)]));
    const firstA = store.handleFormSubmit(submitLine("line-a"));
    await Promise.resolve();
    const lineB = store.handleFormSubmit(submitLine("line-b"));
    await Promise.resolve();
    const secondA = store.handleFormSubmit(submitLine("line-a"));
    await Promise.resolve();

    expect(transportSignals[0].aborted).toBe(true);
    expect(transportSignals[1].aborted).toBe(false);
    expect(transportSignals[2].aborted).toBe(false);
    store.destroy();
    await Promise.all([firstA, lineB, secondA]);
  });

  it("keeps the transport signal when its Standard Event is asynchronous", async () => {
    dispatchEventsSynchronously = false;
    store.hydrate(makeCart([makeLine("line-a", 1)]));
    const submission = store.handleFormSubmit(submitLine("line-a"));
    await Promise.resolve();
    await Promise.resolve();

    expect(transportSignals[0].aborted).toBe(false);
    expect(store.getState().data.lines.nodes[0].quantity).toBe(2);
    expect(store.getState().pending.lines).toEqual(new Set(["line-a"]));

    transportDeferreds[0].resolve(serverResult([makeLine("line-a", 2)]));
    await submission;
    expect(store.getState().pending.lines).toEqual(new Set());
  });

  it("retains references outside a transaction's scope", () => {
    const lineA = makeLine("line-a", 1);
    const lineB = makeLine("line-b", 1);
    store.hydrate(makeCart([lineA, lineB]));
    const originalLines = store.getState().data.lines.nodes;
    const lineUpdate = createDeferred<unknown>();
    const event = Object.assign(new Event("shopify:cart:lines-update"), {
      action: "update" as const,
      context: "standard-action" as const,
      lines: [{ id: "line-a", quantity: 2 }],
      promise: lineUpdate.promise,
    });
    document.dispatchEvent(event);

    const optimisticLines = store.getState().data.lines.nodes;
    expect(optimisticLines).not.toBe(originalLines);
    expect(optimisticLines[1]).toBe(lineB);

    const discount = createDeferred<unknown>();
    dispatchDiscount(["SAVE10"], discount);
    expect(store.getState().data.lines.nodes).toBe(optimisticLines);
    expect(store.getState().data.lines.nodes[1]).toBe(lineB);
  });

  it("keeps resolved warnings until a matching transaction starts", async () => {
    const lineId = "gid://shopify/CartLine/line-a";
    store.hydrate(makeCart([makeLine(lineId, 10), makeLine("line-b", 1)]));
    const overLimit = store.handleFormSubmit(submitLine(lineId, "set", 11));
    await Promise.resolve();
    transportDeferreds[0].resolve({
      cart: {
        id: "gid://shopify/Cart/test",
        totalQuantity: 11,
        cost: { totalAmount: { amount: "110", currencyCode: "USD" } },
        lines: [makeLine(lineId, 10), makeLine("line-b", 1)],
        discountCodes: [],
      },
      warnings: [{ code: "MAXIMUM_EXCEEDED", message: "Only 10 in stock", target: lineId }],
    });
    await overLimit;

    expect(store.getState().data.lines.nodes[0].quantity).toBe(10);
    expect(store.getState().errors.lines.get(lineId)?.warnings).toEqual([
      { code: "MAXIMUM_EXCEEDED", message: "Only 10 in stock" },
    ]);

    const unrelated = store.handleFormSubmit(submitLine("line-b"));
    await Promise.resolve();
    expect(store.getState().errors.lines.get(lineId)?.warnings).toHaveLength(1);

    const correction = store.handleFormSubmit(submitLine(lineId, "set", 10));
    await Promise.resolve();
    expect(store.getState().errors.lines.get(lineId)).toBeUndefined();

    store.destroy();
    await Promise.all([unrelated, correction]);
  });

  it("keeps network errors until a matching transaction starts", async () => {
    store.hydrate(makeCart([makeLine("line-a", 1), makeLine("line-b", 1)]));
    const failed = store.handleFormSubmit(submitLine("line-a"));
    await Promise.resolve();
    transportDeferreds[0].reject(new Error("offline"));
    await expect(failed).rejects.toThrow("offline");
    expect(store.getState().errors.network).toEqual([{ message: "offline" }]);

    const unrelated = store.handleFormSubmit(submitLine("line-b"));
    await Promise.resolve();
    expect(store.getState().errors.network).toEqual([{ message: "offline" }]);

    const retry = store.handleFormSubmit(submitLine("line-a"));
    await Promise.resolve();
    expect(store.getState().errors.network).toEqual([]);

    store.destroy();
    await Promise.all([unrelated, retry]);
  });

  it("uses merchandise error keys without adding cancellation keys", async () => {
    const failed = createDeferred<unknown>();
    dispatchAdd([{ merchandiseId: "variant-a", quantity: 1 }], [product("variant-a")], failed);
    failed.reject(new Error("add failed"));
    await Promise.resolve();
    expect(store.getState().errors.network).toEqual([{ message: "add failed" }]);

    const retry = createDeferred<unknown>();
    dispatchAdd([{ merchandiseId: "variant-a", quantity: 1 }], [product("variant-a")], retry);
    expect(store.getState().errors.network).toEqual([]);
    expect(store.getState().data.lines.nodes[0].quantity).toBe(1);
  });

  it("syncs an existing quantity input when add-to-cart changes its line", async () => {
    configureCartEndpoint("/api/cart");
    store.hydrate(makeCart([makeLine("line-a", 1, "variant-a")]));
    const form = document.createElement("form");
    form.setAttribute("action", "/api/cart");
    const lineId = document.createElement("input");
    lineId.type = "hidden";
    lineId.name = "lineId";
    lineId.setAttribute("value", "line-a");
    const quantity = document.createElement("input");
    quantity.name = "quantity";
    quantity.value = "1";
    form.append(lineId, quantity);
    document.body.append(form);

    const addition = createDeferred<unknown>();
    dispatchAdd([{ merchandiseId: "variant-a", quantity: 1 }], [], addition);
    expect(quantity.value).toBe("2");

    addition.reject(new Error("add failed"));
    await Promise.resolve();
    expect(quantity.value).toBe("1");
    form.remove();
  });
});
