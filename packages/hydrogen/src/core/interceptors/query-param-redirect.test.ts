import { describe, it, expect } from "vitest";

import { assert } from "../test-utils";
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

  it("rejects cross-domain redirects", () => {
    const result = handleQueryParamRedirect(
      new Request("https://my-app.com/login?return_to=https://evil.com/phishing"),
    );
    expect(result).toBeNull();
  });

  it("rejects javascript: protocol redirects", () => {
    const result = handleQueryParamRedirect(
      new Request("https://my-app.com/login?return_to=javascript:alert(1)"),
    );
    expect(result).toBeNull();
  });

  it("allows same-origin absolute URLs", () => {
    const result = handleQueryParamRedirect(
      new Request("https://my-app.com/login?return_to=https://my-app.com/dashboard"),
    );

    assert(result, "expected redirect response");
    expect(result.headers.get("location")).toBe("https://my-app.com/dashboard");
  });
});
