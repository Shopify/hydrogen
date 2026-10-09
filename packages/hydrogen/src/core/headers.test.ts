import { describe, expect, it } from "vitest";

import { extractHeaders } from "./headers";

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
