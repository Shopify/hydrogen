import { afterEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../../client/client";
import { StorefrontApiError } from "../../client/errors";
import { gql } from "../../graphql";
import { createShopifyRequestContext } from "../request-context";
import { safeApplyResponseHeaders } from "./safe-apply-response-headers";

describe("safeApplyResponseHeaders", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clones responses with immutable headers before applying Hydrogen headers", () => {
    const response = Response.redirect("https://example.com/redirect", 302);
    const requestContext = createShopifyRequestContext({
      request: new Request("https://example.com"),
      i18n: { defaultLocale: { country: "US", language: "EN" } },
    });

    const result = safeApplyResponseHeaders(response, requestContext);

    expect(result).not.toBe(response);
    expect(result.status).toBe(302);
    expect(result.headers.get("location")).toBe("https://example.com/redirect");
    expect(result.headers.get("powered-by")).toBe("Shopify, Hydrogen");
  });

  it.each([false, true])(
    "finalizes a custom returned 429 (immutable headers: %s)",
    async (immutable: boolean) => {
      const requestContext = createShopifyRequestContext({
        request: new Request("https://example.com/custom"),
        i18n: { country: "US", language: "EN" },
      });
      const client = createStorefrontClient({
        type: "public",
        requestContext,
        config: {
          storeDomain: "test.myshopify.com",
          publicStorefrontToken: "token",
          fetch: vi.fn().mockResolvedValue(
            new Response("upstream details", {
              status: 429,
              headers: { "retry-after": "60" },
            }),
          ),
        },
      });
      async function customHandler() {
        try {
          await client.graphql(gql(`query { shop { name } }`));
          return new Response("unexpected success");
        } catch (error) {
          if (!(error instanceof StorefrontApiError)) throw error;
          return new Response(
            JSON.stringify({ errors: [{ message: "Please try again later." }] }),
            {
              status: error.status,
              headers: {
                "content-type": "application/json",
                "cache-control": "public, max-age=300",
                "oxygen-cache-control": "public, max-age=3600",
                "surrogate-control": "max-age=600",
              },
            },
          );
        }
      }
      const response = await customHandler();
      if (immutable) {
        // Simulate the immutable header guard on a fetched response without a network request.
        vi.spyOn(response.headers, "set").mockImplementation(() => {
          throw new TypeError("immutable headers");
        });
      }

      const result = safeApplyResponseHeaders(response, requestContext);

      expect(result === response).toBe(!immutable);
      expect(result.status).toBe(429);
      expect(result.headers.get("powered-by")).toBe("Shopify, Hydrogen");
      expect(result.headers.get("cache-control")).toBe("no-store");
      expect(result.headers.get("oxygen-cache-control")).toBeNull();
      expect(result.headers.get("surrogate-control")).toBeNull();
      expect(result.headers.get("retry-after")).toBe("60");
      expect(await result.json()).toEqual({ errors: [{ message: "Please try again later." }] });
    },
  );
});
