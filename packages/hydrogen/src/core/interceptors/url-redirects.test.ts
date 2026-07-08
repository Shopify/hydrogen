import { describe, it, expect, vi, beforeEach } from "vitest";

import { createStorefrontClient } from "../../client/client";
import type { RedirectOptions } from "../handle-shopify-redirects";
import { createShopifyRequestContext } from "../headers";
import { createShopifyRouteTemplates } from "../standard-routes/index";
import { assert } from "../test-utils";
import { handleUrlRedirects as handleUrlRedirectsImpl } from "./url-redirects";

type TestStorefrontConfig = {
  storeDomain: string;
};

const DEFAULT_I18N = { country: "US", language: "EN", pathPrefix: "" } as const;
const DEFAULT_ROUTE_TEMPLATES = createShopifyRouteTemplates({});

const defaultConfig: TestStorefrontConfig = {
  storeDomain: "test-store.myshopify.com",
};

function createPrivateStorefrontClient(
  request: Request,
  fixture: TestStorefrontConfig = defaultConfig,
) {
  return createStorefrontClient({
    type: "private",
    requestContext: createShopifyRequestContext({ request, i18n: DEFAULT_I18N }),
    config: {
      storeDomain: fixture.storeDomain,
      privateStorefrontToken: "test-private-token",
      buyerIp: "127.0.0.1",
    },
  });
}

function handleUrlRedirects(request: Request, fixture: TestStorefrontConfig = defaultConfig) {
  const options = {
    request,
    routeTemplates: DEFAULT_ROUTE_TEMPLATES,
    storefrontClient: createPrivateStorefrontClient(request, fixture),
  } satisfies RedirectOptions;

  return handleUrlRedirectsImpl(options);
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
