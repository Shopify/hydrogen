// @vitest-environment happy-dom
import { isDeepStrictEqual } from "node:util";

import * as fc from "fast-check";
import { afterEach, describe, expect, it } from "vitest";

import type { UpdateCartOptions, UpdateCartPayload } from "../../../vendor/standard-actions";
import { createCartStore, resetStandardActionsForTests, type CartStore } from "./cart";
import type { CartData, CartState } from "./state";

const VARIANTS = ["variant-1", "variant-2"];
const DISCOUNT_CODES = ["SAVE10", "FREESHIP"];
const NOTES = ["", "Gift wrap", "Leave at the door"];
const UNIT_PRICE = 10;
const VOLUME_UNIT_PRICE = 9;
const VOLUME_DISCOUNT_QUANTITY = 4;
const DISCOUNT_PER_CODE = 5;

// Response orderings multiply the cases to explore, so these run more than the default 100.
const RUNS = { numRuns: 1_000 };
// A property that holds runs all its sessions, which takes a few seconds on a CI runner. Vitest's
// 5-second default leaves a slow runner too little room.
const TIMEOUT_IN_MS = 30_000;

type FakeLine = { id: string; variant: string; quantity: number };
type FakeCart = { id: string; lines: FakeLine[]; discountCodes: string[]; note: string };
type FakeShopifyOptions = {
  /** Quantity of each variant already in the cart. Empty means Shopify has no cart yet. */
  initialQuantities: number[];
  /** Whether a cart of four or more units gets a lower unit price on every line. */
  volumeDiscount: boolean;
};

const money = (amount: number) => ({ amount: amount.toFixed(1), currencyCode: "USD" });

/** Announces a cart change the way Standard Actions does, so the store projects it at once. */
function dispatchStandardEvent(
  payload: UpdateCartPayload,
  requestOptions: UpdateCartOptions | undefined,
  promise: Promise<unknown>,
) {
  let event: Event | undefined;
  if (payload.lines) {
    const action = payload.lines.some((line) => line.merchandiseId)
      ? "add"
      : payload.lines.some((line) => line.quantity === 0)
        ? "remove"
        : "update";
    event = Object.assign(new Event("shopify:cart:lines-update"), {
      action,
      context: "standard-action",
      lines: payload.lines,
    });
  } else if (payload.discountCodes) {
    event = Object.assign(new Event("shopify:cart:discount-update"), {
      discountCodes: payload.discountCodes.map((code) => ({ code })),
    });
  } else if (payload.note !== undefined) {
    event = Object.assign(new Event("shopify:cart:note-update"), { note: payload.note });
  }
  if (!event) return;
  document.dispatchEvent(Object.assign(event, { promise, detail: requestOptions?.event?.detail }));
}

/**
 * Stands in for Shopify and its Standard Actions script.
 *
 * Shopify applies requests in the order the browser sent them, including requests the store
 * aborts afterwards. The scheduler picks when each response reaches the browser, so responses
 * arrive in any order. The browser learns a new cart's ID from the response that created it.
 */
function createFakeShopify(scheduler: fc.Scheduler, options: FakeShopifyOptions) {
  const carts = new Map<string, FakeCart>();
  let browserCartId: string | null = null;
  let lineCount = 0;

  function createCart(): FakeCart {
    const cart = { id: `cart-${carts.size + 1}`, lines: [], discountCodes: [], note: "" };
    carts.set(cart.id, cart);
    return cart;
  }

  function addLine(cart: FakeCart, variant: string, quantity: number) {
    const existing = cart.lines.find((line) => line.variant === variant);
    if (existing) {
      existing.quantity += quantity;
      return;
    }
    lineCount += 1;
    cart.lines.push({ id: `line-${lineCount}`, variant, quantity });
  }

  function applyUpdate(cart: FakeCart, payload: UpdateCartPayload) {
    for (const line of payload.lines ?? []) {
      if (line.merchandiseId) {
        addLine(cart, line.merchandiseId, line.quantity);
        continue;
      }
      const existing = cart.lines.find((candidate) => candidate.id === line.id);
      if (existing) existing.quantity = line.quantity;
    }
    cart.lines = cart.lines.filter((line) => line.quantity > 0);
    if (payload.discountCodes) cart.discountCodes = [...payload.discountCodes];
    if (payload.note !== undefined) cart.note = payload.note;
  }

  function toCartData(cart: FakeCart): CartData {
    const totalQuantity = cart.lines.reduce((total, line) => total + line.quantity, 0);
    const discounted = options.volumeDiscount && totalQuantity >= VOLUME_DISCOUNT_QUANTITY;
    const unitPrice = discounted ? VOLUME_UNIT_PRICE : UNIT_PRICE;
    const subtotal = totalQuantity * unitPrice;
    const total = Math.max(0, subtotal - cart.discountCodes.length * DISCOUNT_PER_CODE);
    return {
      id: cart.id,
      checkoutUrl: `https://shop.example/checkout/${cart.id}`,
      totalQuantity,
      note: cart.note,
      attributes: [],
      cost: {
        subtotalAmount: money(subtotal),
        totalAmount: money(total),
        checkoutChargeAmount: money(total),
      },
      lines: {
        nodes: cart.lines.map((line) => ({
          id: line.id,
          quantity: line.quantity,
          attributes: [],
          sellingPlanAllocation: null,
          merchandise: { id: line.variant, title: "Default", product: { title: "Product" } },
          cost: {
            totalAmount: money(line.quantity * unitPrice),
            subtotalAmount: money(line.quantity * unitPrice),
            amountPerQuantity: money(unitPrice),
            compareAtAmountPerQuantity: null,
          },
        })),
      },
      discountCodes: cart.discountCodes.map((code) => ({ code, applicable: true })),
    };
  }

  /** Resolves when the scheduler delivers the response, or rejects when the request aborts first. */
  function deliver<T>(label: string, signal: AbortSignal | undefined, respond: () => T) {
    const delivery = scheduler.schedule(Promise.resolve(), label);
    return new Promise<T>((resolve, reject) => {
      const abort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
      if (signal?.aborted) return abort();
      signal?.addEventListener("abort", abort, { once: true });
      void delivery.then(() => {
        if (!signal?.aborted) resolve(respond());
      });
    });
  }

  const updateCart = Object.assign(
    (payload: UpdateCartPayload, requestOptions?: UpdateCartOptions) => {
      const targetId = payload.cartId ?? browserCartId;
      const existing = targetId ? carts.get(targetId) : undefined;
      const cart = existing ?? createCart();
      applyUpdate(cart, payload);
      const result = { cart: toCartData(cart) };
      const { cartId: _cartId, ...change } = payload;
      const promise = deliver(
        `Shopify answers ${JSON.stringify(change)}`,
        requestOptions?.signal,
        () => {
          if (!existing) browserCartId = cart.id;
          return result;
        },
      );
      // The store reads the outcome from the event's promise or from this one, not always both.
      promise.catch(() => {});
      dispatchStandardEvent(payload, requestOptions, promise);
      return promise;
    },
    { configure: () => true, isDefault: () => false },
  );

  function getCart(payload?: { cartId?: string }, requestOptions?: { signal?: AbortSignal }) {
    const targetId = payload?.cartId ?? browserCartId;
    const cart = targetId ? carts.get(targetId) : undefined;
    const result = { cart: cart ? toCartData(cart) : null };
    return deliver("Shopify answers a cart load", requestOptions?.signal, () => result);
  }

  if (options.initialQuantities.length > 0) {
    const cart = createCart();
    options.initialQuantities.forEach((quantity, index) =>
      addLine(cart, VARIANTS[index], quantity),
    );
    browserCartId = cart.id;
  }

  return {
    actions: { updateCart, getCart },
    /** Changes the cart without the store knowing, as another tab or a server action does. */
    addElsewhere(variant: string) {
      const cart = (browserCartId ? carts.get(browserCartId) : undefined) ?? createCart();
      addLine(cart, variant, 1);
      browserCartId = cart.id;
    },
    /** The cart a page reload would show: the one the browser's cart cookie points to. */
    currentCart(): CartData | null {
      const cart = browserCartId ? carts.get(browserCartId) : undefined;
      return cart ? toCartData(cart) : null;
    },
  };
}

function submitForm(fields: Record<string, string>, intent: string): SubmitEvent {
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
  button.value = intent;
  form.appendChild(button);
  document.body.appendChild(form);

  let submitEvent: SubmitEvent | undefined;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitEvent = event;
  });
  button.click();
  form.remove();
  if (!submitEvent) throw new Error("Expected the form to submit");
  return submitEvent;
}

type Action =
  | { do: "add"; variant: string; quantity: number }
  | { do: "increase" | "decrease" | "remove"; variant: string }
  | { do: "set"; variant: string; quantity: number }
  | { do: "toggle-discount"; code: string }
  | { do: "note"; note: string }
  | { do: "add-elsewhere"; variant: string }
  | { do: "refresh" | "reset" };

const variant = fc.constantFrom(...VARIANTS);
// Plain objects read better than null-prototype ones in a counterexample.
const plain = { noNullPrototype: true };

/** What a shopper does through the cart's controls, plus the storefront's own refresh. */
const cartChanges: fc.Arbitrary<Action>[] = [
  fc.record({ do: fc.constant("add"), variant, quantity: fc.integer({ min: 1, max: 3 }) }, plain),
  fc.record({ do: fc.constant("increase"), variant }, plain),
  fc.record({ do: fc.constant("decrease"), variant }, plain),
  fc.record({ do: fc.constant("remove"), variant }, plain),
  fc.record({ do: fc.constant("set"), variant, quantity: fc.nat({ max: 5 }) }, plain),
  fc.record(
    { do: fc.constant("toggle-discount"), code: fc.constantFrom(...DISCOUNT_CODES) },
    plain,
  ),
  fc.record({ do: fc.constant("note"), note: fc.constantFrom(...NOTES) }, plain),
  fc.record({ do: fc.constant("refresh") }, plain),
];
const addElsewhere: fc.Arbitrary<Action> = fc.record(
  { do: fc.constant("add-elsewhere"), variant },
  plain,
);
const reset: fc.Arbitrary<Action> = fc.record({ do: fc.constant("reset") }, plain);

/** What the shopper asked for so far: the reference the cart is compared with. */
type Order = { quantities: Map<string, number>; discountCodes: Set<string>; note: string };

type Storefront = {
  store: CartStore;
  shopify: ReturnType<typeof createFakeShopify>;
  order: Order;
  failures: unknown[];
};

/**
 * Does what a storefront does for one action, and records what the shopper asked for. Skips an
 * action whose control the storefront would not offer.
 */
function perform(action: Action, { store, shopify, order, failures }: Storefront) {
  const { data } = store.getState();
  const submit = (
    fields: Record<string, string>,
    intent: string,
    detail?: Record<string, unknown>,
  ) => {
    store
      .handleFormSubmit(submitForm(fields, intent), detail)
      .catch((error: unknown) => failures.push(error));
  };
  const asked = (target: string) => order.quantities.get(target) ?? 0;
  // The cart route rejects discount and note changes until Shopify has created the cart.
  const hasCart = data.id !== null;

  switch (action.do) {
    case "add":
      order.quantities.set(action.variant, asked(action.variant) + action.quantity);
      return submit({ merchandiseId: action.variant, quantity: String(action.quantity) }, "add", {
        products: [{ id: action.variant, title: "Default", product: { title: "Product" } }],
      });
    case "increase":
    case "decrease":
    case "remove":
    case "set": {
      // A line's controls stay disabled until Shopify confirms the line.
      const line = data.lines.nodes.find(
        (candidate) =>
          candidate.merchandise?.id === action.variant && !candidate.id.startsWith("optimistic:"),
      );
      if (!line) return;
      if (action.do === "set") {
        order.quantities.set(action.variant, action.quantity);
        return submit({ lineId: line.id, quantity: String(action.quantity) }, "set");
      }
      const current = asked(action.variant);
      const next = { increase: current + 1, decrease: Math.max(0, current - 1), remove: 0 };
      order.quantities.set(action.variant, next[action.do]);
      return submit({ lineId: line.id }, action.do);
    }
    case "toggle-discount": {
      if (!hasCart) return;
      const applied = data.discountCodes.some((discount) => discount.code === action.code);
      if (applied) order.discountCodes.delete(action.code);
      else order.discountCodes.add(action.code);
      return submit({ discountCode: action.code }, applied ? "discount-remove" : "discount-apply");
    }
    case "note":
      if (!hasCart) return;
      order.note = action.note;
      return submit({ note: action.note }, "note-update");
    case "add-elsewhere":
      // The documented follow-up to a cart change the store did not make is refresh().
      order.quantities.set(action.variant, asked(action.variant) + 1);
      shopify.addElsewhere(action.variant);
      return store.refresh();
    case "refresh":
      return store.refresh();
    case "reset":
      // The store reloads after a reset only when it held a cart.
      if (hasCart) store.reset();
  }
}

/** What the store reports as still in progress. */
function describeActivity({ loading, revalidating, pending }: CartState) {
  return {
    loading,
    revalidating: revalidating === true,
    pendingLines: [...pending.lines],
    pendingDiscountCodes: [...pending.discountCodes],
    pendingNote: pending.note,
    pendingAttributes: pending.attributes,
    pendingCost: pending.cost === true,
  };
}

const SETTLED: ReturnType<typeof describeActivity> = {
  loading: false,
  revalidating: false,
  pendingLines: [],
  pendingDiscountCodes: [],
  pendingNote: false,
  pendingAttributes: false,
  pendingCost: false,
};

/** What a shopper reads off a cart: its lines with their prices, the total, the codes, the note. */
function describeCart(cart: CartData | null) {
  return {
    id: cart?.id ?? null,
    lines: (cart?.lines.nodes ?? [])
      .map((line) => ({
        id: line.id,
        variant: line.merchandise?.id,
        quantity: line.quantity,
        total: Number(line.cost.totalAmount.amount),
      }))
      .toSorted((left, right) => left.id.localeCompare(right.id)),
    totalQuantity: cart?.totalQuantity ?? 0,
    total: Number(cart?.cost.totalAmount.amount ?? 0),
    discountCodes: (cart?.discountCodes ?? [])
      .map(({ code, applicable }) => ({ code, applicable }))
      .toSorted((left, right) => left.code.localeCompare(right.code)),
    note: cart?.note ?? "",
  };
}

/** The part of a cart the shopper decides: how many of each variant, the codes, the note. */
function describeOrder(cart: CartData | null) {
  const quantities = new Map<string, number>();
  for (const line of cart?.lines.nodes ?? []) {
    const id = line.merchandise?.id ?? line.id;
    quantities.set(id, (quantities.get(id) ?? 0) + line.quantity);
  }
  return {
    quantities: [...quantities].toSorted(),
    totalQuantity: cart?.totalQuantity ?? 0,
    discountCodes: (cart?.discountCodes ?? []).map((discount) => discount.code).toSorted(),
    note: cart?.note ?? "",
  };
}

function describeAskedOrder(order: Order): ReturnType<typeof describeOrder> {
  const quantities = [...order.quantities].filter(([, quantity]) => quantity > 0).toSorted();
  return {
    quantities,
    totalQuantity: quantities.reduce((total, [, quantity]) => total + quantity, 0),
    discountCodes: [...order.discountCodes].toSorted(),
    note: order.note,
  };
}

type Session = Awaited<ReturnType<typeof runSession>>;

/**
 * Runs the actions against a connected store while the scheduler delivers Shopify's responses in
 * any order, and reports what the store showed along the way.
 */
async function runSession(scheduler: fc.Scheduler, actions: Action[], options: FakeShopifyOptions) {
  const shopify = createFakeShopify(scheduler, options);
  Object.defineProperty(window, "Shopify", {
    value: { actions: shopify.actions },
    configurable: true,
    writable: true,
  });
  resetStandardActionsForTests();
  const store = createCartStore({ initialData: { cart: shopify.currentCart() } });
  store.connect();

  const order: Order = {
    quantities: new Map(
      options.initialQuantities.map((quantity, index) => [VARIANTS[index], quantity]),
    ),
    discountCodes: new Set(),
    note: "",
  };
  const failures: unknown[] = [];
  let unaskedState: unknown;
  let staleSettledState: unknown;
  const unsubscribe = store.subscribe((state) => {
    if (state.loading) return;
    const asked = describeAskedOrder(order);
    const shown = describeOrder(state.data);
    if (!isDeepStrictEqual(shown, asked)) unaskedState ??= { shown, asked };
    if (!isDeepStrictEqual(describeActivity(state), SETTLED)) return;
    const onShopify = describeCart(shopify.currentCart());
    const settled = describeCart(state.data);
    if (!isDeepStrictEqual(settled, onShopify)) staleSettledState ??= { shown: settled, onShopify };
  });

  try {
    scheduler.scheduleSequence(
      actions.map((action) => ({
        label: `action: ${Object.values(action).join(" ")}`,
        builder: async () => {
          // A throw would end the sequence early, and the session would look settled.
          try {
            perform(action, { store, shopify, order, failures });
          } catch (error) {
            failures.push(error);
          }
        },
      })),
    );
    await scheduler.waitIdle();
    return {
      failures,
      /** The first state that showed something other than what the shopper asked for. */
      unaskedState,
      /** The first state published as settled that differed from Shopify's cart. */
      staleSettledState,
      finalState: store.getState(),
      shopifyCart: shopify.currentCart(),
      asked: describeAskedOrder(order),
    };
  } finally {
    unsubscribe();
    store.destroy();
    // happy-dom reads form fields through WeakRef-backed caches, and a WeakRef keeps its target
    // alive until the current task ends. fast-check runs every case in one task, so end the task
    // here to let the forms of finished cases be collected.
    await new Promise((resolve) => setImmediate(resolve));
  }
}

/** Checks a property of the session over any starting cart, actions, and response order. */
function assertForAnySession(
  action: fc.Arbitrary<Action>,
  check: (session: Session) => void,
  { volumeDiscount = false } = {},
) {
  return fc.assert(
    fc.asyncProperty(
      fc.scheduler(),
      fc.array(fc.integer({ min: 1, max: 3 }), { maxLength: VARIANTS.length }),
      fc.array(action, { minLength: 1, maxLength: 8 }),
      async (scheduler, initialQuantities, actions) => {
        check(await runSession(scheduler, actions, { initialQuantities, volumeDiscount }));
      },
    ),
    RUNS,
  );
}

/** Every state the store published as settled matched Shopify's cart, and it ended up settled. */
function expectSettledCartToMatchShopify(session: Session) {
  expect(session.failures).toEqual([]);
  expect(session.staleSettledState).toBeUndefined();
  expect(describeActivity(session.finalState)).toEqual(SETTLED);
  expect(describeCart(session.finalState.data)).toEqual(describeCart(session.shopifyCart));
}

afterEach(() => {
  resetStandardActionsForTests();
});

describe("cart store against a fake Shopify", { timeout: TIMEOUT_IN_MS }, () => {
  it("shows Shopify's cart whenever nothing is pending, in any response order", async () => {
    await assertForAnySession(
      fc.oneof(...cartChanges, addElsewhere),
      expectSettledCartToMatchShopify,
    );
  });

  it("shows Shopify's price on every line after a change reprices the cart", async () => {
    await assertForAnySession(
      fc.oneof(...cartChanges, addElsewhere),
      expectSettledCartToMatchShopify,
      { volumeDiscount: true },
    );
  });

  it("returns to Shopify's cart after a reset, whatever was in flight", async () => {
    await assertForAnySession(fc.oneof(...cartChanges, reset), expectSettledCartToMatchShopify);
  });

  it("shows and sends what the shopper asked for, in any response order", async () => {
    await assertForAnySession(fc.oneof(...cartChanges), (session) => {
      expect(session.failures).toEqual([]);
      expect(session.unaskedState).toBeUndefined();
      expect(describeOrder(session.shopifyCart)).toEqual(session.asked);
    });
  });
});
