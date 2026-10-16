// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { getProductCardAttributes } from "./card";

describe("getProductCardAttributes", () => {
  it("returns only card identity attributes from the product handle", () => {
    expect(getProductCardAttributes({ handle: "blue-shirt" })).toEqual({
      "data-shopify-testid": "product-card",
      "data-shopify-product-handle": "blue-shirt",
    });
  });

  it("does not change the card's native product link", () => {
    const card = document.createElement("article");
    const link = document.createElement("a");
    link.setAttribute("href", "/products/blue-shirt");
    link.textContent = "Blue shirt";
    card.append(link);

    for (const [name, value] of Object.entries(
      getProductCardAttributes({ handle: "blue-shirt" }),
    )) {
      card.setAttribute(name, value);
    }

    expect(card.firstElementChild).toBe(link);
    expect(link.getAttribute("href")).toBe("/products/blue-shirt");
    expect(link.textContent).toBe("Blue shirt");
    expect(card.hasAttribute("role")).toBe(false);
    expect(card.hasAttribute("href")).toBe(false);
  });
});
