import { describe, it, expect } from "vitest";

import { assert } from "../../test-utils";
import { handleQueryParamRedirect } from "./query-param-redirect";

describe("handleQueryParamRedirect", () => {
  it("redirects when return_to param is present", () => {
    const result = handleQueryParamRedirect(
      new Request("https://my-app.com/login?return_to=/dashboard"),
    );

    assert(result, "expected redirect response");
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("/dashboard");
  });

  it("redirects when redirect param is present", () => {
    const result = handleQueryParamRedirect(
      new Request("https://my-app.com/login?redirect=/account"),
    );

    assert(result, "expected redirect response");
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("/account");
  });

  it("prefers return_to over redirect", () => {
    const result = handleQueryParamRedirect(
      new Request("https://my-app.com/login?return_to=/first&redirect=/second"),
    );

    assert(result, "expected redirect response");
    expect(result.headers.get("location")).toBe("/first");
  });

  it("returns null when neither param is present", () => {
    const result = handleQueryParamRedirect(new Request("https://my-app.com/login"));
    expect(result).toBeNull();
  });

  it("redirects to the normalized path rather than the raw value", () => {
    const result = handleQueryParamRedirect(
      new Request("https://my-app.com/login?return_to=/x/../dashboard"),
    );

    assert(result, "expected redirect response");
    expect(result.headers.get("location")).toBe("/dashboard");
  });

  it.each([
    "https://evil.com/phishing",
    "javascript:alert(1)",
    "https://my-app.com/dashboard",
    "https:evil.com/phishing",
    "//evil.com/phishing",
    "/\\evil.com/phishing",
    "/x/..//evil.com/phishing",
  ])("rejects return_to %s", (returnTo) => {
    const result = handleQueryParamRedirect(
      new Request(`https://my-app.com/login?return_to=${encodeURIComponent(returnTo)}`),
    );
    expect(result).toBeNull();
  });
});
