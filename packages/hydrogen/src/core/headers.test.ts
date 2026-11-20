import { describe, expect, it } from "vitest";

import { applyPrivateResponseCacheHeaders, extractHeaders, getSetCookieValues } from "./headers";

describe("extractHeaders", () => {
  it("extracts present headers and skips missing ones", () => {
    const headers = new Map([
      ["content-type", "application/json"],
      ["accept", "text/html"],
    ]);

    const result = extractHeaders(
      (key) => headers.get(key) ?? null,
      ["content-type", "accept", "x-missing-header"],
    );

    expect(result).toEqual([
      ["content-type", "application/json"],
      ["accept", "text/html"],
    ]);
  });

  it("returns empty array when no headers match", () => {
    const result = extractHeaders(() => null, ["a", "b", "c"]);
    expect(result).toEqual([]);
  });

  it("returns [key, value] tuples", () => {
    const result = extractHeaders((key) => (key === "x-test" ? "value" : null), ["x-test"]);

    expect(result).toEqual([["x-test", "value"]]);
  });
});

describe("applyPrivateResponseCacheHeaders", () => {
  it("sets a private Cache-Control and drops vendor cache headers", () => {
    const headers = new Headers({
      "cache-control": "public, max-age=3600",
      "cdn-cache-control": "public, max-age=3600",
      "cloudflare-cdn-cache-control": "public, max-age=3600",
      "oxygen-cache-control": "public, max-age=3600",
      "vercel-cdn-cache-control": "public, max-age=3600",
      "surrogate-control": "max-age=3600",
      "content-type": "text/html",
    });

    applyPrivateResponseCacheHeaders(headers);

    expect(Array.from(headers.entries())).toEqual([
      ["cache-control", "private, no-store, max-age=0, must-revalidate"],
      ["content-type", "text/html"],
    ]);
  });
});

describe("getSetCookieValues", () => {
  it("uses Headers.getSetCookie when available", () => {
    const headers = new Headers();
    headers.append("set-cookie", "a=1; Path=/");
    headers.append("set-cookie", "b=2; Path=/");

    expect(getSetCookieValues(headers)).toEqual(["a=1; Path=/", "b=2; Path=/"]);
  });

  it("falls back to get('set-cookie') when getSetCookie is missing", () => {
    const headers = {
      get(name: string) {
        return name.toLowerCase() === "set-cookie" ? "session=1; Path=/" : null;
      },
    } as Headers;

    expect(getSetCookieValues(headers)).toEqual(["session=1; Path=/"]);
  });

  it("returns an empty array when getSetCookie is missing and no set-cookie header exists", () => {
    const headers = {
      get() {
        return null;
      },
    } as Headers;

    expect(getSetCookieValues(headers)).toEqual([]);
  });
});
