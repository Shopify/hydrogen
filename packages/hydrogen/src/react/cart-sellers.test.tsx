// @vitest-environment happy-dom
import { act, render, screen } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetStandardActionsForTests } from "../core/cart/cart";
import type { CartData, CartLine } from "../core/cart/state";
import { EMPTY_CART_DATA } from "../core/cart/state";
import { assert } from "../core/test-utils";
import { CartProvider, createCartComponents } from "./cart";

type Deferred<T> = { promise: Promise<T>; resolve(value: T): void };

function createDeferred<T>(): Deferred<T> {
  let resolve: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  assert(resolve, "Expected the promise executor to run");
  return { promise, resolve };
}

type Request = { url: string; method: string; body: unknown; response: Deferred<Response> };

const VARIANT = "gid://shopify/ProductVariant/1";

function makeLine(quantity: number): CartLine {
  const amount = { amount: "10", currencyCode: "USD" };
  return {
    id: "gid://shopify/CartLine/1",
    quantity,
    attributes: [],
    sellingPlanAllocation: null,
    merchandise: { id: VARIANT, title: "Small", product: { title: "Shirt" } },
    cost: {
      totalAmount: amount,
      subtotalAmount: amount,
      amountPerQuantity: amount,
      compareAtAmountPerQuantity: null,
    },
  };
}

function makeCart(quantity: number, id: string): CartData {
  return {
    ...EMPTY_CART_DATA,
    id,
    totalQuantity: quantity,
    lines: { nodes: quantity > 0 ? [makeLine(quantity)] : [] },
    discountCodes: [],
  };
}

const HOME_CART = makeCart(1, "gid://shopify/Cart/home");
const ACME_CART = makeCart(2, "gid://shopify/Cart/acme");

const { useCart, useCarts, useCartForm, useCartActions } = createCartComponents<{
  get: () => Promise<{ data: { cart: CartData } }>;
}>();

let requests: Request[];

function sellerRequests(): Request[] {
  return requests.filter((request) => request.url.includes("?seller="));
}

function respond(request: Request | undefined, body: unknown): void {
  assert(request, "Expected the request to have been sent");
  request.response.resolve(Response.json(body));
}

beforeEach(() => {
  requests = [];
  resetStandardActionsForTests();
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init: RequestInit = {}) => {
      const response = createDeferred<Response>();
      requests.push({
        url,
        method: init.method ?? "GET",
        body: init.body ? JSON.parse(String(init.body)) : undefined,
        response,
      });
      return response.promise;
    }),
  );
});

afterEach(() => {
  for (const request of requests) request.response.resolve(Response.json({ cart: null }));
  vi.unstubAllGlobals();
  resetStandardActionsForTests();
});

function SellerQuantity({ seller }: { seller: string }) {
  const quantity = useCart((state) => state.data.totalQuantity, { seller });
  const loading = useCart((state) => state.loading, { seller });
  return <span data-testid={`quantity-${seller}`}>{loading ? "loading" : String(quantity)}</span>;
}

function SellerAddButton({ seller }: { seller: string }) {
  const { formProps, register } = useCartForm({ seller });
  return (
    <form data-testid={`form-${seller}`} {...formProps()}>
      <input {...register("merchandiseId", { value: VARIANT })} />
      <button {...register("add")}>Add to {seller}</button>
    </form>
  );
}

function CartList() {
  countRender();
  const carts = useCarts((value) => value);
  return (
    <span data-testid="carts">
      {[
        `home:${carts.home.data.totalQuantity}`,
        ...carts.sellers.map(({ seller, state }) => `${seller}:${state.data.totalQuantity}`),
      ].join(",")}
    </span>
  );
}

let renderCount = 0;
function countRender(): void {
  renderCount += 1;
}

function reactErrors(consoleError: { mock: { calls: unknown[][] } }): string[] {
  return consoleError.mock.calls
    .map((call) => String(call[0]))
    .filter((message) => /getSnapshot|hydrat|Maximum update depth/i.test(message));
}

function clickAdd(seller: string): void {
  act(() => {
    screen.getByRole("button", { name: `Add to ${seller}` }).click();
  });
}

function text(testId: string): string | null {
  return screen.getByTestId(testId).textContent;
}

function renderWithProvider(
  initialData: Parameters<typeof CartProvider>[0]["initialData"],
  children: ReactNode,
) {
  return render(<CartProvider initialData={initialData}>{children}</CartProvider>);
}

describe("seller carts in React", () => {
  it("reads an empty seller cart until a seller form creates the store", async () => {
    renderWithProvider(
      { cart: HOME_CART },
      <>
        <SellerQuantity seller="acme" />
        <SellerAddButton seller="acme" />
      </>,
    );

    expect(text("quantity-acme")).toBe("0");
    expect(screen.getByTestId("form-acme").getAttribute("action")).toBe("/api/cart?seller=acme");
    expect(sellerRequests()).toEqual([]);

    clickAdd("acme");

    expect(text("quantity-acme")).toBe("1");
    await vi.waitFor(() => expect(sellerRequests()).toHaveLength(1));
    expect(sellerRequests()[0]).toMatchObject({
      url: "/api/cart?seller=acme",
      method: "POST",
      body: { lines: [{ merchandiseId: VARIANT, quantity: 1 }] },
    });

    await act(async () =>
      respond(sellerRequests()[0], {
        cart: makeCart(1, "gid://shopify/Cart/acme"),
        userErrors: [],
        warnings: [],
        ordering: "sequential",
      }),
    );
    expect(text("quantity-acme")).toBe("1");
    expect(requests.filter((request) => request.method === "POST")).toHaveLength(1);
  });

  it("seeds seller stores from synchronous initial data", () => {
    renderWithProvider(
      { cart: HOME_CART, sellers: [{ seller: "acme", cart: ACME_CART }] },
      <SellerQuantity seller="acme" />,
    );

    expect(text("quantity-acme")).toBe("2");
    expect(sellerRequests()).toEqual([]);
  });

  it("seeds seller stores when promised initial data resolves", async () => {
    const data = createDeferred<{
      cart: CartData;
      sellers: Array<{ seller: string; cart: CartData }>;
    }>();
    renderWithProvider(data.promise, <SellerQuantity seller="acme" />);

    expect(text("quantity-acme")).toBe("0");

    await act(async () =>
      data.resolve({ cart: HOME_CART, sellers: [{ seller: "acme", cart: ACME_CART }] }),
    );

    expect(text("quantity-acme")).toBe("2");
    expect(sellerRequests()).toEqual([]);
  });

  it("selects every cart with a stable snapshot and updates when a seller appears", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    renderCount = 0;
    renderWithProvider(
      { cart: HOME_CART, sellers: [{ seller: "acme", cart: ACME_CART }] },
      <>
        <CartList />
        <SellerAddButton seller="acme" />
        <SellerAddButton seller="globex" />
      </>,
    );

    expect(text("carts")).toBe("home:1,acme:2");
    const rendersAfterMount = renderCount;
    expect(rendersAfterMount).toBeLessThanOrEqual(2);

    clickAdd("acme");
    expect(text("carts")).toBe("home:1,acme:3");

    clickAdd("globex");
    expect(text("carts")).toBe("home:1,acme:3,globex:1");
    expect(renderCount - rendersAfterMount).toBeLessThan(10);
    expect(reactErrors(consoleError)).toEqual([]);
    consoleError.mockRestore();
  });

  it("creates no extra seller stores or requests under StrictMode", async () => {
    render(
      <StrictMode>
        <CartProvider
          initialData={{ cart: HOME_CART, sellers: [{ seller: "acme", cart: ACME_CART }] }}
        >
          <CartList />
          <SellerAddButton seller="acme" />
        </CartProvider>
      </StrictMode>,
    );

    expect(text("carts")).toBe("home:1,acme:2");

    clickAdd("acme");

    await vi.waitFor(() => expect(sellerRequests()).toHaveLength(1));
    expect(sellerRequests()[0]).toMatchObject({ method: "POST", url: "/api/cart?seller=acme" });
    expect(text("carts")).toBe("home:1,acme:3");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(sellerRequests()).toHaveLength(1);
  });

  it("destroys seller stores on unmount", async () => {
    const { unmount } = renderWithProvider(
      { cart: HOME_CART, sellers: [{ seller: "acme", cart: ACME_CART }] },
      <SellerAddButton seller="acme" />,
    );

    clickAdd("acme");
    clickAdd("acme");
    await vi.waitFor(() => expect(sellerRequests()).toHaveLength(1));

    unmount();
    await act(async () => respond(sellerRequests()[0], { cart: ACME_CART }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sellerRequests()).toHaveLength(1);
  });

  it("refreshes a seller cart from useCartActions", async () => {
    let refresh: (() => void) | undefined;
    function Refresher() {
      refresh = useCartActions({ seller: "acme" }).refresh;
      return null;
    }
    renderWithProvider(
      { cart: HOME_CART, sellers: [{ seller: "acme", cart: ACME_CART }] },
      <Refresher />,
    );

    assert(refresh, "Expected the refresh action to render");
    act(() => refresh?.());

    await vi.waitFor(() => expect(sellerRequests()).toHaveLength(1));
    expect(sellerRequests()[0]).toMatchObject({ method: "GET", url: "/api/cart?seller=acme" });
  });

  it("hydrates server-rendered seller carts without a mismatch", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const initialData = { cart: HOME_CART, sellers: [{ seller: "acme", cart: ACME_CART }] };
    const app = (
      <CartProvider initialData={initialData}>
        <SellerQuantity seller="acme" />
        <SellerQuantity seller="globex" />
        <CartList />
      </CartProvider>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(app);
    document.body.append(container);

    const root = await act(async () => hydrateRoot(container, app));

    expect(container.textContent).toContain("2");
    expect(container.querySelector('[data-testid="carts"]')?.textContent).toBe("home:1,acme:2");
    expect(reactErrors(consoleError)).toEqual([]);
    act(() => root.unmount());
    container.remove();
    consoleError.mockRestore();
  });
});
