// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CONSENT_TRACKING_API_LOADED_EVENT,
  VISITOR_CONSENT_COLLECTED_EVENT,
} from "../shopify-scripts/index";
import { assert } from "../test-utils";
import {
  configureCartEndpoint,
  createCartStore,
  resetStandardActionsForTests,
  revalidateConnectedCartCheckoutUrls,
  type CartStore,
  type CreateCartStoreOptions,
} from "./cart";
import type { CartData, CartLine } from "./state";
import { EMPTY_CART_DATA } from "./state";

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  assert(resolve, "Expected the promise executor to run");
  return { promise, resolve };
}

type ConfiguredHandler = (
  defaultHandler: () => Promise<unknown>,
  payload: unknown,
  options?: { signal?: AbortSignal; event?: { detail?: Record<string, unknown> } },
) => Promise<unknown>;

type PostCall = {
  url: string;
  body: { cartId?: string; lines?: Array<Record<string, unknown>> };
  response: Deferred<Response>;
};

type GetCall = { url: string; init: RequestInit };

const VARIANT_A = "gid://shopify/ProductVariant/a";
const VARIANT_B = "gid://shopify/ProductVariant/b";
const VARIANT_C = "gid://shopify/ProductVariant/c";
const LINE_A = "gid://shopify/CartLine/a";
const SERVER_TOTAL = { amount: "20", currencyCode: "USD" };

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

function makeCart(lines: CartLine[], id = "gid://shopify/Cart/seller"): CartData {
  return {
    ...EMPTY_CART_DATA,
    id,
    checkoutUrl: "https://seller.example/checkouts/1",
    totalQuantity: lines.reduce((total, line) => total + line.quantity, 0),
    lines: { nodes: lines },
    discountCodes: [],
  };
}

function serverBody(lines: CartLine[], id?: string): unknown {
  return {
    cart: makeCart(lines, id),
    userErrors: [],
    warnings: [],
    ordering: "sequential",
  };
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

let stores: CartStore[];
let posts: PostCall[];
let gets: GetCall[];
let getBody: unknown;
let shopifyReads: number;
let updateCart: ReturnType<typeof vi.fn>;
let getCart: ReturnType<typeof vi.fn>;

function startStore(options: CreateCartStoreOptions = {}): CartStore {
  const store = createCartStore(options);
  stores.push(store);
  store.connect();
  return store;
}

function add(store: CartStore, variant: string): Promise<void> {
  return store.handleFormSubmit(submitForm({ merchandiseId: variant, quantity: "1" }, "add"));
}

function post(index: number): PostCall {
  const call = posts[index];
  assert(call, `Expected POST ${index} to have been sent`);
  return call;
}

function respond(index: number, body: unknown): void {
  post(index).response.resolve(Response.json(body));
}

async function expectPostCount(count: number): Promise<void> {
  await vi.waitFor(() => expect(posts).toHaveLength(count));
  await flush();
  expect(posts).toHaveLength(count);
}

function installStandardActions(): void {
  let handler: ConfiguredHandler | null = null;
  updateCart = Object.assign(
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
  getCart = vi.fn();
  const shopify = { actions: { updateCart, getCart } };
  Object.defineProperty(window, "Shopify", {
    get: () => {
      shopifyReads += 1;
      return shopify;
    },
    configurable: true,
  });
}

beforeEach(() => {
  stores = [];
  posts = [];
  gets = [];
  getBody = { cart: null, ordering: "sequential" };
  shopifyReads = 0;
  installStandardActions();
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init: RequestInit = {}) => {
      if (init.method !== "POST") {
        gets.push({ url, init });
        return Promise.resolve(Response.json(getBody));
      }
      const response = createDeferred<Response>();
      posts.push({ url, body: JSON.parse(String(init.body)), response });
      return response.promise;
    }),
  );
  resetStandardActionsForTests();
});

afterEach(() => {
  for (const store of stores) store.destroy();
  for (const call of posts) call.response.resolve(Response.json({ cart: null }));
  vi.unstubAllGlobals();
  resetStandardActionsForTests();
  Object.defineProperty(window, "Shopify", { value: undefined, configurable: true });
});

describe("seller cart store", () => {
  it("rejects a handle outside the seller grammar", () => {
    expect(() => createCartStore({ seller: "Not A Handle" })).toThrow(TypeError);
    expect(() => createCartStore({ seller: "-leading" })).toThrow(TypeError);
  });

  it("loads and changes the seller cart at the seller endpoint without Standard Actions", async () => {
    getBody = { cart: makeCart([lineA()]), ordering: "sequential" };
    const store = startStore({ seller: "acme" });

    await vi.waitFor(() => expect(store.getState().data.id).toBe("gid://shopify/Cart/seller"));
    expect(gets).toEqual([
      { url: "/api/cart?seller=acme", init: expect.objectContaining({ cache: "no-store" }) },
    ]);

    const change = add(store, VARIANT_B);
    await expectPostCount(1);
    expect(post(0).url).toBe("/api/cart?seller=acme");
    expect(post(0).body).toEqual({ lines: [{ merchandiseId: VARIANT_B, quantity: 1 }] });
    respond(0, serverBody([lineA(), lineFor(VARIANT_B)]));
    await change;

    expect(updateCart).not.toHaveBeenCalled();
    expect(getCart).not.toHaveBeenCalled();
    expect(shopifyReads).toBe(0);
  });

  it("uses the configured cart endpoint", async () => {
    configureCartEndpoint("/storefront/cart");
    const store = startStore({ seller: "acme", initialData: { cart: makeCart([lineA()]) } });

    const change = add(store, VARIANT_B);
    await expectPostCount(1);
    expect(post(0).url).toBe("/storefront/cart?seller=acme");
    respond(0, serverBody([lineA(), lineFor(VARIANT_B)]));
    await change;
  });

  it("shows an added line's quantity at once and settles from the reply", async () => {
    const store = startStore({ seller: "acme", initialData: { cart: makeCart([lineA()]) } });

    const change = add(store, VARIANT_A);
    expect(store.getState().data.totalQuantity).toBe(2);
    expect(store.getState().pending.cost).toBe(true);

    await expectPostCount(1);
    respond(0, serverBody([{ ...lineA(2), cost: { ...lineA().cost, totalAmount: SERVER_TOTAL } }]));
    await change;

    expect(store.getState().pending.cost).toBe(false);
    expect(store.getState().data.lines.nodes).toHaveLength(1);
    expect(store.getState().data.lines.nodes[0]?.cost.totalAmount).toEqual(SERVER_TOTAL);
  });

  it("ignores home cart events", async () => {
    const store = startStore({ seller: "acme", initialData: { cart: makeCart([lineA()]) } });
    const before = store.getState();

    document.dispatchEvent(
      Object.assign(new Event("shopify:cart:lines-update"), {
        action: "add",
        context: "standard-action",
        lines: [{ merchandiseId: VARIANT_B, quantity: 1 }],
        promise: Promise.resolve({ cart: makeCart([lineA(), lineFor(VARIANT_B)]) }),
      }),
    );
    await flush();

    expect(store.getState()).toBe(before);
  });

  it("attaches no document listeners and skips checkout revalidation on consent", async () => {
    const addEventListener = vi.spyOn(document, "addEventListener");
    startStore({ seller: "acme", initialData: { cart: makeCart([lineA()]) } });

    expect(addEventListener).not.toHaveBeenCalled();

    revalidateConnectedCartCheckoutUrls();
    document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));
    document.dispatchEvent(new Event(VISITOR_CONSENT_COLLECTED_EVENT));
    await flush();

    expect(gets).toEqual([]);
    addEventListener.mockRestore();
  });

  it("keeps the home store concurrent after a sequential seller reply", async () => {
    configureCartEndpoint("/api/cart");
    getBody = { cart: makeCart([lineA()]), ordering: "sequential" };
    const seller = startStore({ seller: "acme" });
    await vi.waitFor(() => expect(seller.getState().data.id).toBe("gid://shopify/Cart/seller"));
    const sellerChange = add(seller, VARIANT_B);
    await expectPostCount(1);
    respond(0, serverBody([lineA(), lineFor(VARIANT_B)]));
    await sellerChange;
    startStore({
      seller: "globex",
      initialData: { cart: makeCart([lineA()]), ordering: "sequential" },
    });
    startStore({
      seller: "initech",
      initialData: Promise.resolve({ cart: makeCart([lineA()]), ordering: "sequential" as const }),
    });
    await flush();

    const home = startStore({
      initialData: { cart: makeCart([lineA()], "gid://shopify/Cart/home") },
    });
    const first = add(home, VARIANT_B);
    const second = add(home, VARIANT_C);

    await expectPostCount(3);
    expect(post(1).url).toBe("/api/cart");
    expect(post(2).url).toBe("/api/cart");
    respond(1, serverBody([lineA(), lineFor(VARIANT_B)], "gid://shopify/Cart/home"));
    respond(
      2,
      serverBody([lineA(), lineFor(VARIANT_B), lineFor(VARIANT_C)], "gid://shopify/Cart/home"),
    );
    await Promise.all([first, second]);
  });

  it("sends one change at a time per seller", async () => {
    const store = startStore({ seller: "acme", initialData: { cart: makeCart([lineA()]) } });

    const first = add(store, VARIANT_B);
    const second = add(store, VARIANT_C);

    await expectPostCount(1);
    respond(0, serverBody([lineA(), lineFor(VARIANT_B)]));
    await expectPostCount(2);
    respond(1, serverBody([lineA(), lineFor(VARIANT_B), lineFor(VARIANT_C)]));
    await Promise.all([first, second]);

    expect(
      store
        .getState()
        .data.lines.nodes.map((line) => line.id)
        .toSorted(),
    ).toEqual([LINE_A, lineFor(VARIANT_B).id, lineFor(VARIANT_C).id]);
  });

  it("lets two sellers' changes overlap", async () => {
    const acme = startStore({ seller: "acme", initialData: { cart: makeCart([lineA()]) } });
    const globex = startStore({
      seller: "globex",
      initialData: { cart: makeCart([lineA()], "gid://shopify/Cart/globex") },
    });

    const first = add(acme, VARIANT_B);
    const second = add(globex, VARIANT_B);

    await expectPostCount(2);
    expect(posts.map((call) => call.url)).toEqual([
      "/api/cart?seller=acme",
      "/api/cart?seller=globex",
    ]);
    respond(1, serverBody([lineA(), lineFor(VARIANT_B)], "gid://shopify/Cart/globex"));
    respond(0, serverBody([lineA(), lineFor(VARIANT_B)]));
    await Promise.all([first, second]);
  });

  it("sends adds one at a time until the seller cart exists", async () => {
    const store = startStore({ seller: "acme", initialData: { cart: null } });

    const first = add(store, VARIANT_B);
    const second = add(store, VARIANT_C);

    await expectPostCount(1);
    expect(post(0).body.cartId).toBeUndefined();
    respond(0, serverBody([lineFor(VARIANT_B)]));
    await expectPostCount(2);
    expect(post(1).body.cartId).toBe("gid://shopify/Cart/seller");
    respond(1, serverBody([lineFor(VARIANT_B), lineFor(VARIANT_C)]));
    await Promise.all([first, second]);

    expect(store.getState().data.totalQuantity).toBe(2);
  });

  it("never sends a change still queued when the store is destroyed", async () => {
    const store = startStore({ seller: "acme", initialData: { cart: makeCart([lineA()]) } });

    void add(store, VARIANT_B);
    void add(store, VARIANT_C);
    await expectPostCount(1);

    store.destroy();
    respond(0, serverBody([lineA(), lineFor(VARIANT_B)]));

    await expectPostCount(1);
  });

  it("syncs quantity inputs in forms that post to the seller endpoint", async () => {
    const store = startStore({ seller: "acme", initialData: { cart: makeCart([lineA()]) } });
    const sellerForm = document.createElement("form");
    sellerForm.setAttribute("action", "/api/cart?seller=acme");
    sellerForm.innerHTML = `<input name="lineId" value="${LINE_A}"><input name="quantity" value="1">`;
    const homeForm = document.createElement("form");
    homeForm.setAttribute("action", "/api/cart");
    homeForm.innerHTML = `<input name="lineId" value="${LINE_A}"><input name="quantity" value="1">`;
    document.body.append(sellerForm, homeForm);

    const change = store.handleFormSubmit(submitForm({ lineId: LINE_A }, "increase"));
    const sellerQuantity = sellerForm.querySelector<HTMLInputElement>('input[name="quantity"]');
    const homeQuantity = homeForm.querySelector<HTMLInputElement>('input[name="quantity"]');
    expect(sellerQuantity?.value).toBe("2");
    expect(homeQuantity?.value).toBe("1");

    await expectPostCount(1);
    respond(0, serverBody([lineA(2)]));
    await change;
    sellerForm.remove();
    homeForm.remove();
  });
});
