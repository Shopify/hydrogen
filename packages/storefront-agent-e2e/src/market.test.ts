import { describe, expect, it } from "vitest";

import { marketInstruction } from "./market";

describe("marketInstruction", () => {
  it("names the market and tells the agent to switch to it", () => {
    expect(
      marketInstruction({ country: "GB", countryName: "United Kingdom", currency: "GBP" }),
    ).toBe(
      "Shop in the United Kingdom store (prices in GBP): if the store shows another country or currency, switch to United Kingdom.",
    );
  });
});
