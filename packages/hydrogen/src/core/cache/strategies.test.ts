import { describe, expect, it } from "vitest";

import { Cache } from "./index";

describe("Cache", () => {
  it("uses classic Hydrogen values for short and long presets", () => {
    expect(Cache.short()).toEqual({
      mode: "public",
      maxAge: 1,
      staleWhileRevalidate: 9,
    });
    expect(Cache.long()).toEqual({
      mode: "public",
      maxAge: 3600,
      staleWhileRevalidate: 82800,
    });
  });

  it("normalizes duration objects to seconds", () => {
    expect(
      Cache({
        maxAge: { minutes: 1, seconds: 30 },
        staleWhileRevalidate: { hours: 2 },
        staleIfError: { days: 1 },
      }),
    ).toEqual({
      mode: "public",
      maxAge: 90,
      staleWhileRevalidate: 7200,
      staleIfError: 86400,
    });
  });

  it("allows preset overrides using the same duration shape", () => {
    expect(Cache.long({ staleIfError: { minutes: 5 } })).toEqual({
      mode: "public",
      maxAge: 3600,
      staleWhileRevalidate: 82800,
      staleIfError: 300,
    });
  });

  it("rejects invalid runtime values", () => {
    expect(() => Cache({ maxAge: Number.POSITIVE_INFINITY })).toThrow(
      "Cache durations must be finite, non-negative numbers.",
    );
    expect(() => Cache({ maxAge: -1 })).toThrow(
      "Cache durations must be finite, non-negative numbers.",
    );
    expect(() => Reflect.apply(Cache, undefined, [{ mode: "no-store" }])).toThrow(
      "'mode' must be either 'public' or 'private'",
    );
  });
});
