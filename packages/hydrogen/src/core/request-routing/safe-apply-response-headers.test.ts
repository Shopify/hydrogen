import { describe, expect, it } from "vitest";

import { createShopifyRequestContext } from "../request-context";
import { safeApplyResponseHeaders } from "./safe-apply-response-headers";

describe("safeApplyResponseHeaders", () => {
  it("clones responses with immutable headers before applying Hydrogen headers", () => {
    const response = Response.redirect("https://example.com/redirect", 302);
    const requestContext = createShopifyRequestContext({
      request: new Request("https://example.com"),
      i18n: { country: "US", language: "EN" },
    });

    const result = safeApplyResponseHeaders(response, requestContext);

    expect(result).not.toBe(response);
    expect(result.status).toBe(302);
    expect(result.headers.get("location")).toBe("https://example.com/redirect");
    expect(result.headers.get("powered-by")).toBe("Shopify, Hydrogen");
  });
});
