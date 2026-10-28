import { describe, expect, it } from "vitest";

import { matchProductPage } from "./product-page";

const target = { title: "Agentic Spike Hoodie", handle: "agentic-spike-hoodie" };

describe("matchProductPage", () => {
  it("passes when the main heading names the product, whatever the URL", () => {
    const state = matchProductPage({
      ...target,
      url: "https://shop.example/us-en/shop/item-123",
      headings: ["  AGENTIC SPIKE\n Hoodie "],
    });
    expect(state.kind).toBe("correct");
  });

  it("falls back to the handle in the URL when the page has no main heading", () => {
    const state = matchProductPage({
      ...target,
      url: "https://shop.example/fr/products/agentic-spike-hoodie?Size=Large",
      headings: [],
    });
    expect(state.kind).toBe("correct");
  });

  it("fails an error page even though the URL names the product", () => {
    const state = matchProductPage({
      ...target,
      url: "https://shop.example/products/agentic-spike-hoodie",
      headings: ["Oops"],
    });
    expect(state).toMatchObject({ kind: "wrong", reason: expect.stringContaining('"Oops"') });
  });

  it("fails a different product's page", () => {
    const state = matchProductPage({
      ...target,
      url: "https://shop.example/products/agentic-spike-hoodie",
      headings: ["Agentic Spike Tee"],
    });
    expect(state.kind).toBe("wrong");
  });

  it("fails when the agent stopped somewhere else", () => {
    const state = matchProductPage({
      ...target,
      url: "https://shop.example/collections/all",
      headings: [],
    });
    expect(state).toMatchObject({
      kind: "wrong",
      reason: expect.stringContaining("no main heading"),
    });
  });
});
