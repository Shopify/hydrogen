import { describe, it, expect, vi } from "vitest";

import type { RequestScopedPrivateStorefrontClient } from "../../client";
import { gql } from "../../graphql";
import { createStorefrontRequestContext } from "../headers";
import { getCart, getCartId } from "./get-cart";
import { cartQueries, makeCartQueries } from "./queries";
import { EMPTY_CART_DATA } from "./state";

const MOCK_CART_LINE = {
  id: "gid://shopify/CartLine/1",
  quantity: 2,
  cost: { totalAmount: { amount: "20.00", currencyCode: "USD" } },
  merchandise: {
    id: "gid://shopify/ProductVariant/1",
    title: "Default",
    image: null,
    product: { title: "Widget" },
  },
};

const MOCK_CART = {
  id: "gid://shopify/Cart/123",
  checkoutUrl: "https://shop.example.com/checkout",
  totalQuantity: 2,
  note: "",
  cost: { totalAmount: { amount: "20.00", currencyCode: "USD" } },
  lines: { nodes: [MOCK_CART_LINE] },
  discountCodes: [],
};

const customCartFragment = gql(`
  fragment CartFragment on Cart {
    attributes {
      key
      value
    }
  }
`);

type MockStorefrontClientOptions = {
  errors?: Array<{ message: string }>;
  headers?: Headers;
  request?: Request;
  rejectWith?: Error;
};

function mockStorefrontClient(
  data: unknown,
  options: MockStorefrontClientOptions = {},
): RequestScopedPrivateStorefrontClient {
  const result = {
    data,
    ...(options.errors && { errors: options.errors }),
    headers: options.headers ?? new Headers(),
  };
  return {
    type: "private",
    storeUrl: "https://shop.example.com",
    apiUrl: "https://shop.example.com/api/2026-01/graphql.json",
    requestContext: createStorefrontRequestContext(
      options.request ?? new Request("https://shop.example.com/"),
    ),
    graphql: options.rejectWith
      ? vi.fn().mockRejectedValue(options.rejectWith)
      : vi.fn().mockResolvedValue(result),
  } satisfies RequestScopedPrivateStorefrontClient;
}

describe("getCart", () => {
  it("returns empty cart data when cartId is null", async () => {
    const storefront = mockStorefrontClient({ cart: MOCK_CART });
    const result = await getCart(null, storefront);
    expect(result.cart).toEqual(EMPTY_CART_DATA);
    expect(result.headers).toBeInstanceOf(Headers);
    expect(storefront.graphql).not.toHaveBeenCalled();
  });

  it("fetches cart data without flattening GraphQL fields", async () => {
    const storefront = mockStorefrontClient({ cart: MOCK_CART });
    const result = await getCart("gid://shopify/Cart/123", storefront);

    expect(result.cart).toEqual(MOCK_CART);
    expect(storefront.graphql).toHaveBeenCalledWith(cartQueries.cart, {
      variables: { id: "gid://shopify/Cart/123" },
    });
  });

  it("preserves nullable server note", async () => {
    const storefront = mockStorefrontClient({ cart: { ...MOCK_CART, note: null } });

    const result = await getCart("gid://shopify/Cart/123", storefront);

    expect(result.cart.note).toBeNull();
  });

  it("returns SFAPI response headers when cart is fetched", async () => {
    const headers = new Headers({ "server-timing": '_y;desc="unique"' });
    const storefront = mockStorefrontClient({ cart: MOCK_CART }, { headers });

    const result = await getCart("gid://shopify/Cart/123", storefront);

    expect(result.headers).toBe(headers);
  });

  it("returns empty cart with errors from SFAPI GraphQL response", async () => {
    const storefront = mockStorefrontClient(null, { errors: [{ message: "Cart not found" }] });
    const result = await getCart("gid://shopify/Cart/123", storefront);

    expect(result.cart).toEqual(EMPTY_CART_DATA);
    expect(result.errors).toEqual([{ message: "Cart not found" }]);
  });

  it("returns empty cart when SFAPI returns { data: null }", async () => {
    const storefront = mockStorefrontClient(null);
    const result = await getCart("gid://shopify/Cart/123", storefront);
    expect(result.cart).toEqual(EMPTY_CART_DATA);
  });

  it("returns empty cart when SFAPI returns { data: { cart: null } }", async () => {
    const storefront = mockStorefrontClient({ cart: null });
    const result = await getCart("gid://shopify/Cart/123", storefront);
    expect(result.cart).toEqual(EMPTY_CART_DATA);
  });

  it("throws on network failure", async () => {
    const storefront = mockStorefrontClient(null, { rejectWith: new Error("ECONNREFUSED") });
    await expect(getCart("gid://shopify/Cart/123", storefront)).rejects.toThrow("ECONNREFUSED");
  });

  it("passes correct query and variables to the storefront client", async () => {
    const storefront = mockStorefrontClient({ cart: MOCK_CART });
    await getCart("gid://shopify/Cart/456", storefront);

    expect(storefront.graphql).toHaveBeenCalledOnce();
    expect(storefront.graphql).toHaveBeenCalledWith(cartQueries.cart, {
      variables: { id: "gid://shopify/Cart/456" },
    });
  });

  it("uses an explicit custom cart query when provided", async () => {
    const storefront = mockStorefrontClient({ cart: MOCK_CART });
    const customQueries = makeCartQueries({ fragment: customCartFragment });

    await getCart("gid://shopify/Cart/456", storefront, customQueries.cart);

    expect(storefront.graphql).toHaveBeenCalledWith(customQueries.cart, {
      variables: { id: "gid://shopify/Cart/456" },
    });
  });
});

describe("getCartId", () => {
  it("reads cart ID from the cartId query param", () => {
    const request = new Request(
      "http://localhost/api/cart?cartId=gid%3A%2F%2Fshopify%2FCart%2Fquery-cart",
    );
    expect(getCartId(request)).toBe("gid://shopify/Cart/query-cart");
  });

  it("prefers cartId query param over cart cookie", () => {
    const request = new Request(
      "http://localhost/api/cart?cartId=gid%3A%2F%2Fshopify%2FCart%2Fquery-cart",
      {
        headers: { cookie: "cart=cookie-cart" },
      },
    );
    expect(getCartId(request)).toBe("gid://shopify/Cart/query-cart");
  });

  it("reads cart ID from a request context URL", () => {
    const context = createStorefrontRequestContext({
      headers: new Headers({ cookie: "cart=cookie-cart" }),
      url: "http://localhost/api/cart?cartId=gid%3A%2F%2Fshopify%2FCart%2Fcontext-query-cart",
    });

    expect(getCartId(context)).toBe("gid://shopify/Cart/context-query-cart");
  });

  it("falls back to request context cookie when URL is missing", () => {
    const context = createStorefrontRequestContext({
      headers: new Headers({ cookie: "cart=context-cookie-cart" }),
    });

    expect(getCartId(context)).toBe("gid://shopify/Cart/context-cookie-cart");
  });
});
