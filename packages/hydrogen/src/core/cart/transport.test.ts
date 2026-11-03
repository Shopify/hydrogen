// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { assert } from "../test-utils";
import {
  configureCartEndpoint,
  createCartStore,
  resetStandardActionsForTests,
  type CartTransport,
  type CartTransportResult,
  type CartTransportUpdate,
  type CartStore,
  type CreateCartStoreOptions,
} from "./cart";
import { EMPTY_CART_DATA, type CartData, type CartLine } from "./state";

type TransportCart = CartData & { id: string };

const money = (amount: number) => ({ amount: amount.toFixed(2), currencyCode: "USD" });

function makeLine(id: string, quantity: number, merchandiseId = `${id}-variant`): CartLine {
  return {
    id,
    quantity,
    merchandise: { id: merchandiseId, product: { title: "Board" } },
    cost: {
      totalAmount: money(quantity * 10),
      subtotalAmount: money(quantity * 10),
      amountPerQuantity: money(10),
      compareAtAmountPerQuantity: null,
    },
  };
}

function makeCart(
  id: string,
  lines: CartLine[],
  extra: Omit<Partial<CartData>, "id"> = {},
): TransportCart {
  const totalQuantity = lines.reduce((total, line) => total + line.quantity, 0);
  const total = money(totalQuantity * 10);
  return {
    ...EMPTY_CART_DATA,
    id,
    totalQuantity,
    cost: { subtotalAmount: total, totalAmount: total, checkoutChargeAmount: total },
    lines: { nodes: lines },
    discountCodes: [],
    attributes: [],
    ...extra,
  };
}

const lineIds = (store: CartStore) => store.getState().data.lines.nodes.map((line) => line.id);
const quantityOf = (store: CartStore, id: string) =>
  store.getState().data.lines.nodes.find((line) => line.id === id)?.quantity;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

type PendingCall = {
  update: CartTransportUpdate;
  signal: AbortSignal;
  resolve(result: CartTransportResult): void;
  reject(error: unknown): void;
};

/** A transport whose changes settle only when the test resolves them. */
function controlledTransport(loaded: TransportCart | null = null) {
  const calls: PendingCall[] = [];
  const getCart = vi.fn(async (_cartId: string | null, _options: { signal: AbortSignal }) => ({
    cart: loaded,
  }));
  const transport: CartTransport = {
    getCart,
    updateCart: (update, { signal }) =>
      new Promise((resolve, reject) => calls.push({ update, signal, resolve, reject })),
  };
  return { transport, calls, getCart };
}

/** A transport that answers every change at once with `respond(update)`. */
function echoTransport(respond: (update: CartTransportUpdate) => CartTransportResult) {
  const updates: CartTransportUpdate[] = [];
  const transport: CartTransport = {
    getCart: vi.fn(async () => ({ cart: null })),
    updateCart: async (update) => {
      updates.push(update);
      return respond(update);
    },
  };
  return { transport, updates };
}

const stores: CartStore[] = [];
function connectedStore(options: CreateCartStoreOptions): CartStore {
  const store = createCartStore(options);
  stores.push(store);
  store.connect();
  return store;
}

function shopifyCartEvent(cartId: string, lineId: string) {
  return Object.assign(new Event("shopify:cart:lines-update"), {
    action: "add",
    context: "standard-action",
    lines: [{ merchandiseId: "gid://shopify/ProductVariant/SHOPIFY", quantity: 1 }],
    promise: Promise.resolve({
      cart: {
        id: cartId,
        totalQuantity: 1,
        cost: { totalAmount: { amount: "99", currencyCode: "USD" } },
        lines: [makeLine(lineId, 1, "gid://shopify/ProductVariant/SHOPIFY")],
        discountCodes: [],
      },
    }),
  });
}

/** Standard Actions as the live script behaves: it dispatches the event, then resolves. */
function installStandardActions(respond: (payload: Record<string, unknown>) => unknown) {
  const updateCart = Object.assign(
    vi.fn((payload: Record<string, any>, options?: { event?: { detail?: unknown } }) => {
      const promise = Promise.resolve(respond(payload));
      const kind = payload.lines
        ? "lines"
        : payload.discountCodes
          ? "discount"
          : payload.note !== undefined
            ? "note"
            : "attributes";
      const event = Object.assign(new Event(`shopify:cart:${kind}-update`), {
        action: payload.lines?.some((line: { merchandiseId?: string }) => line.merchandiseId)
          ? "add"
          : "update",
        context: "standard-action",
        lines: payload.lines,
        discountCodes: payload.discountCodes?.map((code: string) => ({ code })),
        note: payload.note,
        attributes: payload.attributes,
        detail: options?.event?.detail,
        promise,
      });
      document.dispatchEvent(event);
      return promise;
    }),
    { configure: vi.fn(() => true), isDefault: vi.fn(() => false) },
  );
  Object.defineProperty(window, "Shopify", {
    value: { actions: { updateCart, getCart: vi.fn(async () => ({ cart: null })) } },
    configurable: true,
    writable: true,
  });
  return updateCart;
}

beforeEach(() => {
  resetStandardActionsForTests();
  delete (window as { Shopify?: unknown }).Shopify;
});

afterEach(() => {
  for (const store of stores.splice(0)) store.destroy();
  resetStandardActionsForTests();
  delete (window as { Shopify?: unknown }).Shopify;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("cart transport", () => {
  it("loads and changes the cart without Standard Actions on the page", async () => {
    const readActions = vi.fn();
    Object.defineProperty(window, "Shopify", {
      value: {
        get actions() {
          readActions();
          return undefined;
        },
      },
      configurable: true,
    });
    const { transport, calls, getCart } = controlledTransport(
      makeCart("cart-1", [makeLine("l1", 1)]),
    );
    const store = connectedStore({ transport });

    await vi.waitFor(() => expect(lineIds(store)).toEqual(["l1"]));
    expect(getCart).toHaveBeenCalledWith(null, { signal: expect.any(AbortSignal) });

    const added = store.addLines([{ merchandiseId: "v2", quantity: 1 }], {
      products: [{ id: "v2", title: "Wax", product: { title: "Wax" }, price: money(5) }],
    });
    expect(lineIds(store)).toEqual(["optimistic:v2", "l1"]);
    expect(store.getState().pending.lines.has("optimistic:v2")).toBe(true);

    await vi.waitFor(() => expect(calls).toHaveLength(1));
    calls[0].resolve({ cart: makeCart("cart-1", [makeLine("l2", 1, "v2"), makeLine("l1", 1)]) });
    await added;

    expect(lineIds(store)).toEqual(["l2", "l1"]);
    expect(store.getState().pending.lines.size).toBe(0);
    expect(readActions).not.toHaveBeenCalled();
  });

  it("sends cart form submissions to the transport", async () => {
    const { transport, updates } = echoTransport(() => ({
      cart: makeCart("cart-1", [makeLine("l1", 2)]),
    }));
    const store = connectedStore({
      transport,
      initialData: { cart: makeCart("cart-1", [makeLine("l1", 1)]) },
    });
    const form = document.createElement("form");
    form.innerHTML = `<input name="lineId" value="l1"><button value="increase">+</button>`;
    document.body.append(form);
    let submit: SubmitEvent | undefined;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submit = event;
    });
    form.querySelector("button")?.click();
    assert(submit, "Expected a submit event");

    await store.handleFormSubmit(submit);

    expect(updates).toEqual([{ cartId: "cart-1", lines: [{ id: "l1", quantity: 2 }] }]);
    expect(quantityOf(store, "l1")).toBe(2);
  });

  it("ignores Standard Actions events for another cart", async () => {
    const { transport } = controlledTransport();
    const store = connectedStore({
      transport,
      initialData: { cart: makeCart("ucp:abc", [makeLine("ucp-line", 1)]) },
    });
    const empty = connectedStore({ transport, initialData: { cart: null } });

    document.dispatchEvent(shopifyCartEvent("gid://shopify/Cart/SHOPIFY", "shopify-line"));
    await flush();

    expect(lineIds(store)).toEqual(["ucp-line"]);
    expect(store.getState().data.cost.totalAmount).toEqual(money(10));
    expect(empty.getState().data.id).toBeNull();
    expect(store.getState().pending.lines.size).toBe(0);
  });

  it("keeps two stores with different transports apart", async () => {
    const updateCart = installStandardActions(() => ({
      cart: makeCart("gid://shopify/Cart/1", [makeLine("shopify-line", 2)]),
    }));
    const shopify = connectedStore({
      initialData: { cart: makeCart("gid://shopify/Cart/1", [makeLine("shopify-line", 1)]) },
    });
    const { transport, updates } = echoTransport(() => ({
      cart: makeCart("multi:1", [makeLine("multi-line", 5)]),
    }));
    const multi = connectedStore({
      transport,
      initialData: { cart: makeCart("multi:1", [makeLine("multi-line", 1)]) },
    });

    await multi.updateLines([{ id: "multi-line", quantity: 5 }]);
    await shopify.updateLines([{ id: "shopify-line", quantity: 2 }]);
    await flush();

    expect(updateCart).toHaveBeenCalledTimes(1);
    expect(updateCart.mock.calls[0][0]).toEqual({ lines: [{ id: "shopify-line", quantity: 2 }] });
    expect(updates).toEqual([{ cartId: "multi:1", lines: [{ id: "multi-line", quantity: 5 }] }]);
    expect(lineIds(shopify)).toEqual(["shopify-line"]);
    expect(quantityOf(shopify, "shopify-line")).toBe(2);
    expect(lineIds(multi)).toEqual(["multi-line"]);
    expect(multi.getState().data.id).toBe("multi:1");
  });

  it("names the cart in every load and change", async () => {
    const base = makeCart("cart-1", [makeLine("l1", 1), makeLine("l2", 1)]);
    const { transport, updates } = echoTransport(() => ({ cart: base }));
    const getCart = vi.spyOn(transport, "getCart").mockResolvedValue({ cart: base });
    const store = connectedStore({ transport, initialData: { cart: base } });

    await store.addLines([{ merchandiseId: "v3", quantity: 2, sellingPlanId: "plan" }]);
    await store.updateLines([
      { id: "l1", quantity: 3 },
      { id: "l2", quantity: 4 },
    ]);
    await store.removeLines(["l2"]);
    await store.setDiscountCodes(["SAVE"]);
    await store.setNote("Gift");
    await store.setAttributes([{ key: "gift", value: "yes" }]);
    store.refresh();
    await vi.waitFor(() => expect(store.getState().revalidating).toBeFalsy());

    expect(updates).toEqual([
      { cartId: "cart-1", lines: [{ merchandiseId: "v3", quantity: 2, sellingPlanId: "plan" }] },
      {
        cartId: "cart-1",
        lines: [
          { id: "l1", quantity: 3 },
          { id: "l2", quantity: 4 },
        ],
      },
      { cartId: "cart-1", lines: [{ id: "l2", quantity: 0 }] },
      { cartId: "cart-1", discountCodes: ["SAVE"] },
      { cartId: "cart-1", note: "Gift" },
      { cartId: "cart-1", attributes: [{ key: "gift", value: "yes" }] },
    ]);
    expect(getCart).toHaveBeenCalledWith("cart-1", { signal: expect.any(AbortSignal) });
  });

  it("sends one change at a time with the cart ID from the previous result", async () => {
    const { transport, calls } = controlledTransport();
    const store = connectedStore({ transport, initialData: { cart: null } });

    const first = store.addLines([{ merchandiseId: "v1", quantity: 1 }]);
    const second = store.addLines([{ merchandiseId: "v2", quantity: 1 }]);
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    await flush();
    expect(calls).toHaveLength(1);
    expect(calls[0].update.cartId).toBeNull();

    calls[0].resolve({ cart: makeCart("cart-1", [makeLine("l1", 1, "v1")]) });
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].update.cartId).toBe("cart-1");

    // A transport may hand back a new ID on any write.
    calls[1].resolve({
      cart: makeCart("cart-2", [makeLine("l1", 1, "v1"), makeLine("l2", 1, "v2")]),
    });
    await Promise.all([first, second]);
    expect(store.getState().data.id).toBe("cart-2");

    const note = store.setNote("Gift");
    await vi.waitFor(() => expect(calls).toHaveLength(3));
    expect(calls[2].update).toEqual({ cartId: "cart-2", note: "Gift" });
    calls[2].resolve({ cart: makeCart("cart-2", [], { note: "Gift" }) });
    await note;
  });

  it("skips queued changes that a newer change to the same line replaced", async () => {
    const { transport, calls } = controlledTransport(makeCart("cart-1", [makeLine("l1", 4)]));
    const store = connectedStore({
      transport,
      initialData: { cart: makeCart("cart-1", [makeLine("l1", 1)]) },
    });

    const first = store.updateLines([{ id: "l1", quantity: 2 }]);
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    const later = [3, 4].map((quantity) => store.updateLines([{ id: "l1", quantity }]));
    expect(quantityOf(store, "l1")).toBe(4);
    expect(calls[0].signal.aborted).toBe(true);
    calls[0].resolve({ cart: makeCart("cart-1", [makeLine("l1", 2)]) });
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    calls[1].resolve({ cart: makeCart("cart-1", [makeLine("l1", 4)]) });
    await Promise.all([first, ...later]);
    await vi.waitFor(() => expect(store.getState().revalidating).toBeFalsy());

    expect(calls.map((call) => call.update)).toEqual([
      { cartId: "cart-1", lines: [{ id: "l1", quantity: 2 }] },
      { cartId: "cart-1", lines: [{ id: "l1", quantity: 4 }] },
    ]);
    expect(quantityOf(store, "l1")).toBe(4);
  });

  it("shows user errors next to the line and rolls back a failed change", async () => {
    const { transport, calls } = controlledTransport();
    const store = connectedStore({
      transport,
      initialData: { cart: makeCart("cart-1", [makeLine("l1", 1)]) },
    });

    const capped = store.updateLines([{ id: "l1", quantity: 5 }]);
    expect(store.getState().pending.lines.has("l1")).toBe(true);
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    calls[0].resolve({
      cart: makeCart("cart-1", [makeLine("l1", 1)]),
      userErrors: [
        { code: "MAXIMUM_EXCEEDED", message: "Only 1 left", field: ["lines", "0", "quantity"] },
      ],
    });
    await capped;
    expect(store.getState().errors.lines.get("l1")?.userErrors).toEqual([
      { code: "MAXIMUM_EXCEEDED", message: "Only 1 left", field: ["lines", "0", "quantity"] },
    ]);
    expect(quantityOf(store, "l1")).toBe(1);

    const failed = store.updateLines([{ id: "l1", quantity: 2 }]);
    expect(quantityOf(store, "l1")).toBe(2);
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    calls[1].reject(new Error("Transport down"));
    await expect(failed).rejects.toThrow("Transport down");
    expect(quantityOf(store, "l1")).toBe(1);
    expect(store.getState().pending.lines.size).toBe(0);
    expect(store.getState().errors.network).toEqual([{ message: "Transport down" }]);
  });

  it("puts the transport's cart into state as returned", async () => {
    const groups = [{ seller: "shop-a.example", checkoutUrl: "https://shop-a.example/c/1" }];
    const { transport, calls } = controlledTransport(
      makeCart("cart-1", [makeLine("l1", 1)], { groups, checkoutUrl: null }),
    );
    const store = connectedStore({ transport });
    await vi.waitFor(() => expect(store.getState().data.groups).toEqual(groups));

    const nextGroups = [...groups, { seller: "shop-b.example", checkoutUrl: null }];
    const change = store.updateLines([{ id: "l1", quantity: 2 }]);
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    calls[0].resolve({ cart: makeCart("cart-1", [makeLine("l1", 2)], { groups: nextGroups }) });
    await change;

    expect(store.getState().data.groups).toEqual(nextGroups);
    expect(store.getState().data.cost.totalAmount).toEqual(money(20));
  });

  it("updates quantity inputs of forms that post to the cart endpoint", () => {
    configureCartEndpoint("/api/cart");
    document.body.innerHTML = `<form action="/api/cart"><input type="hidden" name="lineId" value="l1"><input type="number" name="quantity" value="1"></form>`;
    const { transport } = controlledTransport();
    const store = connectedStore({
      transport,
      initialData: { cart: makeCart("cart-1", [makeLine("l1", 1)]) },
    });

    void store.updateLines([{ id: "l1", quantity: 4 }]);

    expect(document.querySelector<HTMLInputElement>('input[name="quantity"]')?.value).toBe("4");
  });

  it("treats empty line changes as no-ops", async () => {
    const { transport, calls } = controlledTransport();
    const store = connectedStore({
      transport,
      initialData: { cart: makeCart("cart-1", [makeLine("l1", 1)]) },
    });

    await Promise.all([store.addLines([]), store.updateLines([]), store.removeLines([])]);
    await flush();

    expect(calls).toHaveLength(0);
    expect(store.getState().pending.lines.size).toBe(0);
  });

  it("holds the next change until a superseded call settles", async () => {
    const { transport, calls } = controlledTransport();
    const store = connectedStore({
      transport,
      initialData: { cart: makeCart("cart-1", [makeLine("l1", 1)]) },
    });

    const first = store.updateLines([{ id: "l1", quantity: 2 }]);
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    const second = store.updateLines([{ id: "l1", quantity: 3 }]);
    await flush();

    expect(calls[0].signal.aborted).toBe(true);
    expect(calls).toHaveLength(1);
    calls[0].resolve({ cart: makeCart("cart-1", [makeLine("l1", 2)]) });
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    calls[1].resolve({ cart: makeCart("cart-1", [makeLine("l1", 3)]) });
    await Promise.all([first, second]);
    expect(quantityOf(store, "l1")).toBe(3);
  });

  it("sends later changes after a call that ignores its signal times out", async () => {
    const nativeTimeout = AbortSignal.timeout.bind(AbortSignal);
    vi.spyOn(AbortSignal, "timeout").mockImplementation(() => nativeTimeout(20));
    const updates: CartTransportUpdate[] = [];
    const transport: CartTransport = {
      getCart: async () => ({ cart: null }),
      updateCart: (update) => {
        updates.push(update);
        return updates.length === 1
          ? new Promise(() => {})
          : Promise.resolve({ cart: makeCart("cart-1", [makeLine("l1", 1)], { note: "Gift" }) });
      },
    };
    const store = connectedStore({
      transport,
      initialData: { cart: makeCart("cart-1", [makeLine("l1", 1)]) },
    });

    const stuck = store.updateLines([{ id: "l1", quantity: 2 }]);
    const queued = store.setNote("Queued");

    await expect(stuck).rejects.toMatchObject({ name: "TimeoutError" });
    await expect(queued).rejects.toMatchObject({ name: "TimeoutError" });
    await store.setNote("Gift");
    expect(updates).toEqual([
      { cartId: "cart-1", lines: [{ id: "l1", quantity: 2 }] },
      { cartId: "cart-1", note: "Gift" },
    ]);
    expect(store.getState().data.note).toBe("Gift");
  });

  it("keeps a multi-line change's other lines when a newer change replaces one", async () => {
    const { transport, calls } = controlledTransport(
      makeCart("cart-1", [makeLine("l1", 4), makeLine("l2", 3)]),
    );
    const store = connectedStore({
      transport,
      initialData: { cart: makeCart("cart-1", [makeLine("l1", 1), makeLine("l2", 1)]) },
    });

    const both = store.updateLines([
      { id: "l1", quantity: 2 },
      { id: "l2", quantity: 3 },
    ]);
    const one = store.updateLines([{ id: "l1", quantity: 4 }]);
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    calls[0].resolve({ cart: makeCart("cart-1", [makeLine("l1", 2), makeLine("l2", 3)]) });
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    calls[1].resolve({ cart: makeCart("cart-1", [makeLine("l1", 4), makeLine("l2", 3)]) });
    await Promise.all([both, one]);
    await vi.waitFor(() => expect(store.getState().revalidating).toBeFalsy());

    expect(calls.map((call) => call.update)).toEqual([
      {
        cartId: "cart-1",
        lines: [
          { id: "l1", quantity: 2 },
          { id: "l2", quantity: 3 },
        ],
      },
      { cartId: "cart-1", lines: [{ id: "l1", quantity: 4 }] },
    ]);
    expect(quantityOf(store, "l1")).toBe(4);
    expect(quantityOf(store, "l2")).toBe(3);
  });
});

describe("cart change methods with Standard Actions", () => {
  it("run through Standard Actions with optimistic and pending state", async () => {
    let respond: ((result: unknown) => void) | undefined;
    const updateCart = installStandardActions(() => new Promise((resolve) => (respond = resolve)));
    const store = connectedStore({
      initialData: { cart: makeCart("gid://shopify/Cart/1", [makeLine("l1", 1)]) },
    });

    const change = store.updateLines([{ id: "l1", quantity: 3 }]);
    await vi.waitFor(() => expect(updateCart).toHaveBeenCalledTimes(1));
    expect(updateCart.mock.calls[0][0]).toEqual({ lines: [{ id: "l1", quantity: 3 }] });
    expect(quantityOf(store, "l1")).toBe(3);
    expect(store.getState().pending.lines.has("l1")).toBe(true);

    assert(respond, "Expected Standard Actions to be waiting for a result");
    respond({ cart: makeCart("gid://shopify/Cart/1", [makeLine("l1", 3)]) });
    await change;
    expect(store.getState().pending.lines.size).toBe(0);
    expect(quantityOf(store, "l1")).toBe(3);
  });

  it("send each change type with the Standard Actions payload", async () => {
    const base = makeCart("gid://shopify/Cart/1", [makeLine("l1", 1)]);
    const updateCart = installStandardActions(() => ({ cart: base }));
    const store = connectedStore({ initialData: { cart: base } });

    await store.addLines([{ merchandiseId: "gid://shopify/ProductVariant/2", quantity: 1 }], {
      products: [{ id: "gid://shopify/ProductVariant/2", product: { title: "Wax" } }],
    });
    await store.removeLines(["l1"]);
    await store.setDiscountCodes(["SAVE"]);
    await store.setNote("Gift");
    await store.setAttributes([{ key: "gift", value: "yes" }]);

    expect(updateCart.mock.calls.map(([payload]) => payload)).toEqual([
      { lines: [{ merchandiseId: "gid://shopify/ProductVariant/2", quantity: 1 }] },
      { lines: [{ id: "l1", quantity: 0 }] },
      { discountCodes: ["SAVE"] },
      { note: "Gift" },
      { attributes: [{ key: "gift", value: "yes" }] },
    ]);
    expect(updateCart.mock.calls[0][1]?.event?.detail).toMatchObject({
      products: [{ id: "gid://shopify/ProductVariant/2", product: { title: "Wax" } }],
    });
  });

  it("keep a multi-line change's other lines when a newer change replaces one", async () => {
    const responses: Array<(result: unknown) => void> = [];
    const updateCart = installStandardActions(
      () => new Promise((resolve) => responses.push(resolve)),
    );
    const store = connectedStore({
      initialData: {
        cart: makeCart("gid://shopify/Cart/1", [makeLine("l1", 1), makeLine("l2", 1)]),
      },
    });

    const both = store.updateLines([
      { id: "l1", quantity: 2 },
      { id: "l2", quantity: 3 },
    ]);
    await vi.waitFor(() => expect(updateCart).toHaveBeenCalledTimes(1));
    const one = store.updateLines([{ id: "l1", quantity: 4 }]);
    await vi.waitFor(() => expect(updateCart).toHaveBeenCalledTimes(2));

    const firstOptions = updateCart.mock.calls[0][1] as { signal?: AbortSignal } | undefined;
    expect(firstOptions?.signal?.aborted).toBe(false);
    responses[0]({
      cart: makeCart("gid://shopify/Cart/1", [makeLine("l1", 2), makeLine("l2", 3)]),
    });
    responses[1]({
      cart: makeCart("gid://shopify/Cart/1", [makeLine("l1", 4), makeLine("l2", 3)]),
    });
    await Promise.all([both, one]);

    expect(quantityOf(store, "l1")).toBe(4);
    expect(quantityOf(store, "l2")).toBe(3);
  });

  it("makes no request on connect when consent already loaded and no cart exists", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    Object.defineProperty(window, "Shopify", {
      value: { customerPrivacy: { consentStatus: "loaded" } },
      configurable: true,
      writable: true,
    });
    configureCartEndpoint("/api/cart");
    const { transport, getCart } = controlledTransport();

    connectedStore({ initialData: { cart: null } });
    connectedStore({ transport, initialData: { cart: makeCart("cart-1", []) } });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(getCart).not.toHaveBeenCalled();
  });
});

type UcpLine = { id: string; item: { id: string }; quantity: number };
type UcpCart = { id: string; line_items: UcpLine[]; continue_url: string };
type UcpLineInput = { id?: string; item: { id: string }; quantity: number };

/** One merchant's UCP cart endpoint, kept in memory: create_cart, get_cart, update_cart (PUT). */
function fakeMerchant(shop: string) {
  const carts = new Map<string, UcpLine[]>();
  const log: string[] = [];
  let created = 0;
  const render = (id: string): UcpCart => {
    const lineItems = carts.get(id);
    assert(lineItems, `${shop} has no cart ${id}`);
    return { id, line_items: lineItems, continue_url: `https://${shop}/cart/c/${id}` };
  };
  return {
    log,
    async call(
      operation: "create_cart" | "get_cart" | "update_cart",
      args: { id?: string; cart?: { line_items: UcpLineInput[] } },
    ): Promise<UcpCart> {
      log.push(`${operation}${args.id ? `(${args.id})` : ""}`);
      const id = operation === "create_cart" ? `${shop}-cart-${++created}` : args.id;
      assert(id, `${operation} needs a cart id`);
      if (operation === "get_cart") return render(id);
      carts.set(
        id,
        (args.cart?.line_items ?? []).map((line, index) => ({
          id: line.id ?? `${id}-line-${index}`,
          item: line.item,
          quantity: line.quantity,
        })),
      );
      return render(id);
    },
  };
}
type FakeMerchant = ReturnType<typeof fakeMerchant>;

/**
 * A stateless buyer-side cart across merchants, test-only. The cart ID encodes one child cart per
 * shop, and a variant ID starts with its shop.
 */
function multiMerchantTransport(merchants: Record<string, FakeMerchant>): CartTransport {
  const merchant = (shop: string) => {
    const found = merchants[shop];
    assert(found, `Unknown shop ${shop}`);
    return found;
  };
  const load = async (cartId: string | null): Promise<Record<string, UcpCart>> => {
    const children: Record<string, string> = cartId ? JSON.parse(cartId) : {};
    const entries = await Promise.all(
      Object.entries(children).map(
        async ([shop, id]) => [shop, await merchant(shop).call("get_cart", { id })] as const,
      ),
    );
    return Object.fromEntries(entries);
  };
  const toCart = (children: Record<string, UcpCart>): TransportCart =>
    makeCart(
      JSON.stringify(Object.fromEntries(Object.entries(children).map(([s, c]) => [s, c.id]))),
      Object.values(children).flatMap((child) =>
        child.line_items.map((line) => makeLine(line.id, line.quantity, line.item.id)),
      ),
    );

  return {
    async getCart(cartId) {
      return { cart: cartId ? toCart(await load(cartId)) : null };
    },
    async updateCart(update) {
      const children = await load(update.cartId);
      if (!("lines" in update)) {
        return {
          cart: null,
          userErrors: [{ code: "UNSUPPORTED", message: "Only lines can change" }],
        };
      }
      const byShop = new Map<string, typeof update.lines>();
      for (const [index, change] of update.lines.entries()) {
        const shop =
          "id" in change
            ? Object.keys(children).find((s) =>
                children[s]?.line_items.some((line) => line.id === change.id),
              )
            : change.merchandiseId.split("/")[0];
        if (!shop) {
          return {
            cart: toCart(children),
            userErrors: [{ message: "Unknown line", field: ["lines", String(index)] }],
          };
        }
        byShop.set(shop, [...(byShop.get(shop) ?? []), change]);
      }
      for (const [shop, changes] of byShop) {
        const current = children[shop];
        const lineItems: UcpLineInput[] = (current?.line_items ?? []).map((line) => ({ ...line }));
        for (const change of changes) {
          if ("id" in change) {
            const line = lineItems.find((item) => item.id === change.id);
            if (line) line.quantity = change.quantity;
            continue;
          }
          const line = lineItems.find((item) => item.item.id === change.merchandiseId);
          if (line) line.quantity += change.quantity;
          else lineItems.push({ item: { id: change.merchandiseId }, quantity: change.quantity });
        }
        children[shop] = await merchant(shop).call(current ? "update_cart" : "create_cart", {
          ...(current && { id: current.id }),
          cart: { line_items: lineItems.filter((line) => line.quantity > 0) },
        });
      }
      return { cart: toCart(children) };
    },
  };
}

describe("multi-merchant transport", () => {
  it("adds from two merchants at once without losing either child cart", async () => {
    const merchants = { a: fakeMerchant("a"), b: fakeMerchant("b") };
    const store = connectedStore({
      transport: multiMerchantTransport(merchants),
      initialData: { cart: null },
    });

    await Promise.all([
      store.addLines([{ merchandiseId: "a/board", quantity: 1 }]),
      store.addLines([{ merchandiseId: "b/wax", quantity: 2 }]),
    ]);
    await vi.waitFor(() => expect(store.getState().revalidating).toBeFalsy());

    expect(store.getState().data.id).toBe('{"a":"a-cart-1","b":"b-cart-1"}');
    expect(lineIds(store).toSorted()).toEqual(["a-cart-1-line-0", "b-cart-1-line-0"]);
    expect(store.getState().data.totalQuantity).toBe(3);
    expect(merchants.a.log).toContain("create_cart");
    expect(merchants.b.log).toEqual(expect.arrayContaining(["create_cart"]));
  });

  it("changes a persisted cart after a reload with a fresh transport", async () => {
    const merchants = { a: fakeMerchant("a"), b: fakeMerchant("b") };
    const before = connectedStore({
      transport: multiMerchantTransport(merchants),
      initialData: { cart: null },
    });
    await before.addLines([{ merchandiseId: "a/board", quantity: 1 }]);
    await before.addLines([{ merchandiseId: "b/wax", quantity: 2 }]);
    const persistedId = before.getState().data.id;
    expect(persistedId).toBe('{"a":"a-cart-1","b":"b-cart-1"}');
    before.destroy();

    // Reload: nothing survives except the persisted cart ID.
    const transport = multiMerchantTransport(merchants);
    const loaded = await transport.getCart(persistedId, { signal: new AbortController().signal });
    const after = connectedStore({ transport, initialData: loaded });
    merchants.a.log.length = 0;
    merchants.b.log.length = 0;

    await after.updateLines([{ id: "a-cart-1-line-0", quantity: 3 }]);

    expect(merchants.a.log).toEqual(["get_cart(a-cart-1)", "update_cart(a-cart-1)"]);
    expect(merchants.b.log).toEqual(["get_cart(b-cart-1)"]);
    expect(quantityOf(after, "a-cart-1-line-0")).toBe(3);
    expect(quantityOf(after, "b-cart-1-line-0")).toBe(2);
    expect(after.getState().errors.cart.userErrors).toEqual([]);
    expect(after.getState().data.id).toBe(persistedId);
  });

  it("shows a transport's unsupported change as a user error", async () => {
    const merchants = { a: fakeMerchant("a") };
    const store = connectedStore({
      transport: multiMerchantTransport(merchants),
      initialData: { cart: null },
    });
    await store.addLines([{ merchandiseId: "a/board", quantity: 1 }]);

    await store.setNote("Gift");

    expect(store.getState().errors.note.userErrors).toEqual([
      { code: "UNSUPPORTED", message: "Only lines can change" },
    ]);
    expect(store.getState().data.note).toBe("");
  });
});
