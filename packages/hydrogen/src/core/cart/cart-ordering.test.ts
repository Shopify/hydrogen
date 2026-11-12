// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { assert } from "../test-utils";
import {
  configureCartEndpoint,
  createCartStore,
  resetStandardActionsForTests,
  type CartStore,
  type CreateCartStoreOptions,
} from "./cart";
import type { CartData, CartLine } from "./state";
import { EMPTY_CART_DATA } from "./state";

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve: ((value: T) => void) | undefined;
  let reject: ((reason: unknown) => void) | undefined;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  assert(resolve, "Expected the promise executor to run");
  assert(reject, "Expected the promise executor to run");
  return { promise, resolve, reject };
}

type ConfiguredHandler = (
  defaultHandler: () => Promise<unknown>,
  payload: unknown,
  options?: { signal?: AbortSignal; event?: { detail?: Record<string, unknown> } },
) => Promise<unknown>;

type PostCall = {
  body: { lines?: Array<Record<string, unknown>> };
  signal: AbortSignal;
  response: Deferred<Response>;
};

const VARIANT_A = "gid://shopify/ProductVariant/a";
const VARIANT_B = "gid://shopify/ProductVariant/b";
const VARIANT_C = "gid://shopify/ProductVariant/c";
const VARIANT_D = "gid://shopify/ProductVariant/d";
const LINE_A = "gid://shopify/CartLine/a";

function makeLine(id: string, quantity: number, merchandiseId: string): CartLine {
  const amount = { amount: "10", currencyCode: "USD" };
  return {
    id,
    quantity,
    attributes: [],
    sellingPlanAllocation: null,
    merchandise: { id: merchandiseId, title: "Small", product: { title: "Shirt" } },
    cost: {
      totalAmount: amount,
      subtotalAmount: amount,
      amountPerQuantity: amount,
      compareAtAmountPerQuantity: null,
    },
  };
}

const lineA = (quantity = 1) => makeLine(LINE_A, quantity, VARIANT_A);
const lineFor = (variant: string) =>
  makeLine(variant.replace("ProductVariant", "CartLine"), 1, variant);

function makeCart(lines: CartLine[]): CartData {
  return {
    ...EMPTY_CART_DATA,
    id: "gid://shopify/Cart/test",
    totalQuantity: lines.reduce((total, line) => total + line.quantity, 0),
    lines: { nodes: lines },
    discountCodes: [],
  };
}

function serverBody(lines: CartLine[], extra: Record<string, unknown> = {}): unknown {
  return { cart: { ...makeCart(lines), lines }, ...extra };
}

function submitForm(fields: Record<string, string>, intent: string): SubmitEvent {
  const form = document.createElement("form");
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }
  const button = document.createElement("button");
  button.name = "intent";
  button.value = intent;
  form.append(button);
  document.body.append(form);
  let submitted: SubmitEvent | undefined;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitted = event;
  });
  button.click();
  form.remove();
  assert(submitted, "Expected the form to submit");
  return submitted;
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let store: CartStore;
let posts: PostCall[];
let getBody: unknown;

function lineIds(): string[] {
  return store
    .getState()
    .data.lines.nodes.map((line) => line.id)
    .toSorted();
}

function quantityOf(lineId: string): number | undefined {
  return store.getState().data.lines.nodes.find((line) => line.id === lineId)?.quantity;
}

function startStore(options: CreateCartStoreOptions = {}): void {
  configureCartEndpoint("/api/cart");
  store = createCartStore(options);
  store.connect();
}

function add(variant: string): Promise<void> {
  return store.handleFormSubmit(submitForm({ merchandiseId: variant, quantity: "1" }, "add"));
}

function setQuantity(lineId: string, quantity: number): Promise<void> {
  return store.handleFormSubmit(submitForm({ lineId, quantity: String(quantity) }, "set"));
}

function post(index: number): PostCall {
  const call = posts[index];
  assert(call, `Expected POST ${index} to have been sent`);
  return call;
}

function respond(index: number, body: unknown, status = 200): void {
  post(index).response.resolve(Response.json(body, { status }));
}

async function expectPostCount(count: number): Promise<void> {
  await vi.waitFor(() => expect(posts).toHaveLength(count));
  await flush();
  expect(posts).toHaveLength(count);
}

beforeEach(() => {
  posts = [];
  getBody = { cart: null };
  let handler: ConfiguredHandler | null = null;
  const updateCart = Object.assign(
    vi.fn(
      (
        payload: { lines?: Array<Record<string, unknown>> },
        options?: { signal?: AbortSignal; event?: { detail?: Record<string, unknown> } },
      ) => {
        assert(handler, "Expected the store to configure updateCart");
        const promise = handler(
          () => Promise.reject(new Error("default handler")),
          payload,
          options,
        );
        promise.catch(() => {});
        if (payload.lines) {
          const event = Object.assign(new Event("shopify:cart:lines-update"), {
            action: payload.lines.some((line) => line.merchandiseId) ? "add" : "update",
            context: "standard-action" as const,
            lines: payload.lines,
            detail: options?.event?.detail,
            promise,
          });
          document.dispatchEvent(event);
        }
        return promise;
      },
    ),
    {
      configure: vi.fn((config: { handler: ConfiguredHandler }) => {
        handler = config.handler;
        return true;
      }),
      isDefault: vi.fn(() => handler === null),
    },
  );
  Object.defineProperty(window, "Shopify", {
    value: { actions: { updateCart, getCart: vi.fn() } },
    configurable: true,
    writable: true,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init: RequestInit = {}) => {
      if (init.method !== "POST") return Promise.resolve(Response.json(getBody));
      assert(init.signal, "Expected the POST to carry a signal");
      const response = createDeferred<Response>();
      posts.push({ body: JSON.parse(String(init.body)), signal: init.signal, response });
      return response.promise;
    }),
  );
  resetStandardActionsForTests();
});

afterEach(() => {
  store.destroy();
  for (const call of posts) call.response.resolve(Response.json({ cart: null }));
  vi.unstubAllGlobals();
  resetStandardActionsForTests();
});

describe("cart endpoint ordering", () => {
  it("sends changes concurrently by default", async () => {
    startStore({ initialData: { cart: makeCart([lineA()]) } });

    const first = add(VARIANT_B);
    const second = add(VARIANT_C);

    await expectPostCount(2);
    respond(0, serverBody([lineA(), lineFor(VARIANT_B)]));
    respond(1, serverBody([lineA(), lineFor(VARIANT_B), lineFor(VARIANT_C)]));
    await Promise.all([first, second]);
  });

  describe.each([
    ["synchronous", (data: { cart: CartData; ordering: "sequential" }) => data],
    ["promised", (data: { cart: CartData; ordering: "sequential" }) => Promise.resolve(data)],
  ])("when %s initial data is sequential", (_name, wrap) => {
    it("sends one change at a time and keeps every line", async () => {
      startStore({ initialData: wrap({ cart: makeCart([lineA()]), ordering: "sequential" }) });
      await vi.waitFor(() => expect(store.getState().data.id).toBe("gid://shopify/Cart/test"));

      const first = add(VARIANT_B);
      const second = add(VARIANT_C);

      await expectPostCount(1);
      respond(0, serverBody([lineA(), lineFor(VARIANT_B)]));
      await expectPostCount(2);
      respond(1, serverBody([lineA(), lineFor(VARIANT_B), lineFor(VARIANT_C)]));
      await Promise.all([first, second]);

      expect(lineIds()).toEqual([LINE_A, lineFor(VARIANT_B).id, lineFor(VARIANT_C).id]);
    });
  });

  it("turns sequential from a cart GET reply", async () => {
    getBody = { cart: makeCart([lineA()]), ordering: "sequential" };
    startStore();
    await vi.waitFor(() => expect(store.getState().data.id).toBe("gid://shopify/Cart/test"));

    const first = add(VARIANT_B);
    const second = add(VARIANT_C);

    await expectPostCount(1);
    respond(0, serverBody([lineA(), lineFor(VARIANT_B)]));
    await expectPostCount(2);
    respond(1, serverBody([lineA(), lineFor(VARIANT_B), lineFor(VARIANT_C)]));
    await Promise.all([first, second]);
  });

  it("turns sequential from a POST reply", async () => {
    startStore({ initialData: { cart: makeCart([lineA()]) } });

    const first = add(VARIANT_B);
    await expectPostCount(1);
    respond(0, serverBody([lineA(), lineFor(VARIANT_B)], { ordering: "sequential" }));
    await first;

    const second = add(VARIANT_C);
    const third = add(VARIANT_D);
    await expectPostCount(2);
    respond(1, serverBody([lineA(), lineFor(VARIANT_B), lineFor(VARIANT_C)]));
    await expectPostCount(3);
    respond(2, serverBody([lineA(), lineFor(VARIANT_B), lineFor(VARIANT_C), lineFor(VARIANT_D)]));
    await Promise.all([second, third]);
  });

  it("waits for a POST sent before the backend turned sequential", async () => {
    startStore({ initialData: { cart: makeCart([lineA()]) } });

    const first = add(VARIANT_B);
    await expectPostCount(1);
    getBody = { cart: makeCart([lineA()]), ordering: "sequential" };
    await store.fetch();

    const second = add(VARIANT_C);
    await expectPostCount(1);
    respond(0, serverBody([lineA(), lineFor(VARIANT_B)]));
    await expectPostCount(2);
    respond(1, serverBody([lineA(), lineFor(VARIANT_B), lineFor(VARIANT_C)]));
    await Promise.all([first, second]);
  });

  describe("when sequential", () => {
    beforeEach(() => {
      startStore({ initialData: { cart: makeCart([lineA()]), ordering: "sequential" } });
    });

    it("shows a queued change optimistically", async () => {
      void add(VARIANT_B);
      await expectPostCount(1);

      void setQuantity(LINE_A, 5);

      await vi.waitFor(() => expect(quantityOf(LINE_A)).toBe(5));
      expect(posts).toHaveLength(1);
    });

    it("never sends a queued change that a newer change replaced", async () => {
      const first = add(VARIANT_B);
      await expectPostCount(1);

      const replaced = setQuantity(LINE_A, 2);
      const latest = setQuantity(LINE_A, 3);
      respond(0, serverBody([lineA(), lineFor(VARIANT_B)]));

      await expectPostCount(2);
      expect(post(1).body.lines).toEqual([{ id: LINE_A, quantity: 3 }]);
      respond(1, serverBody([lineA(3), lineFor(VARIANT_B)]));
      await Promise.all([first, replaced, latest]);
      expect(quantityOf(LINE_A)).toBe(3);
    });

    it("keeps the queue closed until a replaced in-flight change gets its reply", async () => {
      const replaced = setQuantity(LINE_A, 2);
      await expectPostCount(1);

      const latest = setQuantity(LINE_A, 3);
      await replaced;

      expect(post(0).signal.aborted).toBe(false);
      await expectPostCount(1);
      respond(0, serverBody([lineA(2)]));
      await expectPostCount(2);
      respond(1, serverBody([lineA(3)]));
      await latest;
    });

    it("never sends a queued change after destroy()", async () => {
      void add(VARIANT_B);
      await expectPostCount(1);
      void setQuantity(LINE_A, 2);
      await vi.waitFor(() => expect(quantityOf(LINE_A)).toBe(2));

      store.destroy();
      respond(0, serverBody([lineA(), lineFor(VARIANT_B)]));

      await expectPostCount(1);
    });

    it("sends the next change after a failed one", async () => {
      const failedStatus = add(VARIANT_B);
      const failedNetwork = add(VARIANT_C);
      const last = add(VARIANT_D);
      await expectPostCount(1);

      respond(0, { message: "Internal Server Error" }, 500);
      await expect(failedStatus).rejects.toThrow();
      await expectPostCount(2);
      post(1).response.reject(new TypeError("Failed to fetch"));
      await expect(failedNetwork).rejects.toThrow("Failed to fetch");
      await expectPostCount(3);
      respond(2, serverBody([lineA(), lineFor(VARIANT_D)]));
      await last;
    });
  });

  it("sends adds one at a time after the first add creates the cart", async () => {
    startStore({ initialData: { cart: null, ordering: "sequential" } });

    const first = add(VARIANT_B);
    const second = add(VARIANT_C);
    const third = add(VARIANT_D);

    await expectPostCount(1);
    respond(0, serverBody([lineFor(VARIANT_B)]));
    await expectPostCount(2);
    respond(1, serverBody([lineFor(VARIANT_B), lineFor(VARIANT_C)]));
    await expectPostCount(3);
    respond(2, serverBody([lineFor(VARIANT_B), lineFor(VARIANT_C), lineFor(VARIANT_D)]));
    await Promise.all([first, second, third]);

    expect(lineIds()).toHaveLength(3);
  });
});
