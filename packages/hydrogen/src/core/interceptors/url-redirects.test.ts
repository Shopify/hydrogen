import { describe, it, expect, vi, beforeEach } from "vitest";

import { createStorefrontClient } from "../../client/client";
import type { RedirectOptions } from "../handle-shopify-redirects";
import { createStorefrontRequestContext } from "../headers";
import { assert } from "../test-utils";
import { handleUrlRedirects as handleUrlRedirectsImpl } from "./url-redirects";

type TestStorefrontConfig = {
  storeDomain: string;
  i18n: { country: "US"; language: "EN" };
};

const defaultConfig: TestStorefrontConfig = {
  storeDomain: "test-store.myshopify.com",
  i18n: { country: "US", language: "EN" },
};

function createPrivateStorefrontClient(
  request: Request,
  config: TestStorefrontConfig = defaultConfig,
) {
  return createStorefrontClient({
    type: "private",
    config: {
      storeDomain: config.storeDomain,
      i18n: config.i18n,
      privateStorefrontToken: "test-private-token",
      buyerIp: "127.0.0.1",
      requestContext: createStorefrontRequestContext(request),
    },
  });
}

function handleUrlRedirects(request: Request, config: TestStorefrontConfig = defaultConfig) {
  return handleUrlRedirectsImpl({
    request,
    storefrontClient: createPrivateStorefrontClient(request, config),
  } satisfies RedirectOptions);
}

describe("handleUrlRedirects", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns 301 with Location when a redirect target is found", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            urlRedirects: {
              edges: [{ node: { target: "/new-page" } }],
            },
          },
        }),
      ),
    );

    const result = await handleUrlRedirects(
      new Request("https://my-app.com/old-page"),
      defaultConfig,
    );

    assert(result, "expected redirect response");
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("/new-page");
  });

  it("merges original query params onto redirect target", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            urlRedirects: {
              edges: [{ node: { target: "/new-page" } }],
            },
          },
        }),
      ),
    );

    const result = await handleUrlRedirects(
      new Request("https://my-app.com/old-page?utm_source=test"),
      defaultConfig,
    );

    assert(result, "expected redirect response");
    expect(result.headers.get("location")).toBe("/new-page?utm_source=test");
  });

  it("returns null when no redirect is found", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { urlRedirects: { edges: [] } },
        }),
      ),
    );

    const result = await handleUrlRedirects(
      new Request("https://my-app.com/no-redirect"),
      defaultConfig,
    );

    expect(result).toBeNull();
  });

  it("sends correct GraphQL query to Storefront API", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { urlRedirects: { edges: [] } } })),
    );

    await handleUrlRedirects(new Request("https://my-app.com/old-page"), defaultConfig);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const body = JSON.parse(init.body) as { variables?: { query?: string } };
    expect(body.variables?.query).toBe("path:/old-page");
  });

  it("strips trailing slashes from the redirect query path", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { urlRedirects: { edges: [] } } })),
    );

    await handleUrlRedirects(new Request("https://my-app.com/old-page/"), defaultConfig);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const body = JSON.parse(init.body) as { variables?: { query?: string } };
    expect(body.variables?.query).toBe("path:/old-page");
  });

  it("lowercases the query path", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { urlRedirects: { edges: [] } } })),
    );

    await handleUrlRedirects(new Request("https://my-app.com/Old-Page"), defaultConfig);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const body = JSON.parse(init.body) as { variables?: { query?: string } };
    expect(body.variables?.query).toBe("path:/old-page");
  });
});
