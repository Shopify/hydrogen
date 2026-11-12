import { describe, expect, it } from "vitest";

import { StorefrontApiError, StorefrontTimeoutError } from "../../client/errors";
import {
  createRateLimitResponseHeaders,
  getSafeRetryAfterValue,
  isStorefrontRateLimitError,
} from "./rate-limit";

describe("isStorefrontRateLimitError", () => {
  it("matches a StorefrontApiError with status 429", () => {
    expect(isStorefrontRateLimitError(new StorefrontApiError("x", { status: 429 }))).toBe(true);
  });

  it("rejects other statuses, network failures, timeouts, and plain errors", () => {
    expect(isStorefrontRateLimitError(new StorefrontApiError("x", { status: 500 }))).toBe(false);
    expect(isStorefrontRateLimitError(new StorefrontApiError("x", { status: 401 }))).toBe(false);
    expect(isStorefrontRateLimitError(new StorefrontApiError("x"))).toBe(false);
    expect(isStorefrontRateLimitError(new StorefrontTimeoutError(1000))).toBe(false);
    expect(isStorefrontRateLimitError(new Error("429"))).toBe(false);
    expect(isStorefrontRateLimitError({ status: 429 })).toBe(false);
    expect(isStorefrontRateLimitError(undefined)).toBe(false);
  });
});

describe("getSafeRetryAfterValue", () => {
  it("forwards delay-seconds", () => {
    expect(getSafeRetryAfterValue("5")).toBe("5");
    expect(getSafeRetryAfterValue("120")).toBe("120");
    expect(getSafeRetryAfterValue("0")).toBe("0");
    // Server advice passes verbatim; Hydrogen never caps it.
    expect(getSafeRetryAfterValue("99999999999")).toBe("99999999999");
  });

  it("forwards an IMF-fixdate unchanged", () => {
    expect(getSafeRetryAfterValue("Wed, 21 Oct 2015 07:28:00 GMT")).toBe(
      "Wed, 21 Oct 2015 07:28:00 GMT",
    );
  });

  it("drops missing, empty, padded, negative, fractional, and malformed values", () => {
    expect(getSafeRetryAfterValue(undefined)).toBeUndefined();
    expect(getSafeRetryAfterValue(null)).toBeUndefined();
    expect(getSafeRetryAfterValue("")).toBeUndefined();
    expect(getSafeRetryAfterValue("-1")).toBeUndefined();
    expect(getSafeRetryAfterValue("1.5")).toBeUndefined();
    expect(getSafeRetryAfterValue("soon")).toBeUndefined();
    expect(getSafeRetryAfterValue("5; x-internal=1")).toBeUndefined();
    expect(getSafeRetryAfterValue(" 5")).toBeUndefined();
    expect(getSafeRetryAfterValue("2015-10-21T07:28:00Z")).toBeUndefined();
    expect(getSafeRetryAfterValue("Wed, 30 Feb 2015 07:28:00 GMT")).toBeUndefined();
    expect(
      getSafeRetryAfterValue("Wed, 21 Oct 2015 07:28:00 GMT\r\nx-internal: 1"),
    ).toBeUndefined();
  });
});

describe("createRateLimitResponseHeaders", () => {
  it("adds retry-after to the base headers and copies nothing else", () => {
    const error = new StorefrontApiError("x", { status: 429, retryAfter: "7", requestId: "r1" });
    const headers = createRateLimitResponseHeaders(error, { "set-cookie": "session=1" });

    expect(headers.get("retry-after")).toBe("7");
    expect(headers.get("set-cookie")).toBe("session=1");
    expect(headers.get("cache-control")).toBe("no-store");
    expect([...headers.keys()].toSorted()).toEqual(["cache-control", "retry-after", "set-cookie"]);
  });

  it("omits retry-after when the upstream value is missing or invalid", () => {
    expect(
      createRateLimitResponseHeaders(new StorefrontApiError("x", { status: 429 })).has(
        "retry-after",
      ),
    ).toBe(false);
    expect(
      createRateLimitResponseHeaders(
        new StorefrontApiError("x", { status: 429, retryAfter: "later" }),
      ).has("retry-after"),
    ).toBe(false);
  });
});
