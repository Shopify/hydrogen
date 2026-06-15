import { describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../../client";
import { gql } from "../../graphql";
import { createCartServerHandlers } from "../cart";
import { createStorefrontRequestContext } from "../headers";
import { createProductServerHandlers } from "./server-handlers";

const i18n = { country: "CA", language: "FR" } as const;
const selectedOptions = [{ name: "Color", value: "Red" }];

const productFragment = gql(`
  fragment ProductFragment on Product {
    description
  }
`);

const cartHandlers = createCartServerHandlers();
const productHandlers = createProductServerHandlers({ cartHandlers, fragment: productFragment });

type GraphQLBody = {
  query: string;
  variables: Record<string, unknown>;
};

function createTestStorefrontClient(response: unknown, headers = new Headers()) {
  let requestBody: GraphQLBody | undefined;
  const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body)) as GraphQLBody;
    return new Response(JSON.stringify(response), { headers });
  });

  const storefrontClient = createStorefrontClient({
    type: "private",
    config: {
      storeDomain: "shop.example.com",
      privateStorefrontToken: "private-token",
      buyerIp: "203.0.113.10",
      i18n,
      requestContext: createStorefrontRequestContext(new Request("https://shop.example.com")),
      fetch,
    },
  });

  return {
    fetch,
    storefrontClient,
    getRequestBody: () => requestBody,
  };
}

describe("createProductServerHandlers", () => {
  it("fetches products with handle and selected options", async () => {
    const product = { id: "gid://shopify/Product/1", title: "Snowboard" };
    const { fetch, getRequestBody, storefrontClient } = createTestStorefrontClient({
      data: { product },
    });

    const result = await productHandlers.get({
      storefrontClient,
      handle: "snowboard",
      selectedOptions,
    });

    expect(fetch).toHaveBeenCalledOnce();
    expect(getRequestBody()).toMatchObject({
      variables: {
        handle: "snowboard",
        selectedOptions,
        country: i18n.country,
        language: i18n.language,
      },
    });
    expect(getRequestBody()?.query).toContain("query Product");
    expect(getRequestBody()?.query).toContain("...ProductFragment");
    expect(result).toMatchObject({
      type: "json",
      data: { product },
    });
  });

  it("maps GraphQL errors and preserves proxy-safe headers", async () => {
    const headers = new Headers({
      "cache-control": "max-age=60",
      "content-length": "1024",
    });
    const { storefrontClient } = createTestStorefrontClient(
      {
        data: { product: null },
        errors: [{ message: "Product not found" }],
      },
      headers,
    );

    const result = await productHandlers.get({
      storefrontClient,
      handle: "missing-product",
    });

    expect(result.data).toEqual({
      product: null,
      errors: [{ message: "Product not found" }],
    });
    expect(new Headers(result.headers).get("cache-control")).toBe("max-age=60");
    expect(new Headers(result.headers).has("content-length")).toBe(false);
  });
});
