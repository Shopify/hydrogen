import { describe, it, expect, vi } from "vitest";

import type { PrivateStorefrontClient } from "../../client";
import type { RedirectOptions } from "../handle-shopify-redirects";
import { createShopifyRequestContext } from "../headers";
import { createShopifyRouteTemplates } from "../standard-routes/index";
import { assert } from "../test-utils";
import { handleAdminRedirect } from "./admin-redirect";

const DEFAULT_I18N = { country: "US", language: "EN", pathPrefix: "" } as const;
const DEFAULT_ROUTE_TEMPLATES = createShopifyRouteTemplates({});

function mockStorefrontClient(
  storeUrl = "https://test-store.myshopify.com",
): PrivateStorefrontClient {
  return {
    type: "private",
    i18n: DEFAULT_I18N,
    storeUrl,
    apiUrl: "https://test-store.myshopify.com/api/2026-04/graphql.json",
    graphql: vi.fn().mockRejectedValue(new Error("/admin redirect should not query SFAPI")),
    requestContext: createShopifyRequestContext({
      request: { headers: new Headers() },
      i18n: DEFAULT_I18N,
    }),
  } satisfies PrivateStorefrontClient;
}

function redirectOptions(
  request: Request,
  storefrontClient = mockStorefrontClient(),
): RedirectOptions {
  return { request, routeTemplates: DEFAULT_ROUTE_TEMPLATES, storefrontClient };
}

describe("handleAdminRedirect", () => {
  it("redirects /admin to the configured Storefront client URL", async () => {
    const request = new Request("https://my-app.com/admin");
    const storefrontClient = mockStorefrontClient();
    const result = await handleAdminRedirect(redirectOptions(request, storefrontClient));

    assert(result, "expected admin redirect response");
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("https://test-store.myshopify.com/admin");
    expect(storefrontClient.graphql).not.toHaveBeenCalled();
  });

  it("returns null for non-admin paths", async () => {
    const storefrontClient = mockStorefrontClient();
    const result = await handleAdminRedirect(
      redirectOptions(new Request("https://my-app.com/products"), storefrontClient),
    );
    expect(result).toBeNull();
    expect(storefrontClient.graphql).not.toHaveBeenCalled();
  });

  it("does not match /admin/something", async () => {
    const storefrontClient = mockStorefrontClient();
    const result = await handleAdminRedirect(
      redirectOptions(new Request("https://my-app.com/admin/products"), storefrontClient),
    );
    expect(result).toBeNull();
    expect(storefrontClient.graphql).not.toHaveBeenCalled();
  });
});
