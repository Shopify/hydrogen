import { describe, expect, it } from "vitest";

import { toStandardActionsCart } from "./standard-actions-adapter";

const CART_LINE = {
  id: "gid://shopify/CartLine/1",
  quantity: 2,
  cost: { totalAmount: { amount: "20.00", currencyCode: "USD" } },
  merchandise: {
    id: "gid://shopify/ProductVariant/1",
    availableForSale: true,
  },
};

const CART_WITH_LINE_CONNECTION = {
  id: "gid://shopify/Cart/123",
  totalQuantity: 2,
  cost: { totalAmount: { amount: "20.00", currencyCode: "USD" } },
  lines: { nodes: [CART_LINE] },
  discountCodes: [],
};

describe("toStandardActionsCart", () => {
  it("adapts SFAPI line connections to the flat Standard Actions cart shape", () => {
    expect(toStandardActionsCart(CART_WITH_LINE_CONNECTION)).toEqual({
      ...CART_WITH_LINE_CONNECTION,
      lines: [CART_LINE],
    });
  });

  it("preserves custom merchandise fields while adapting lines", () => {
    const result = toStandardActionsCart(CART_WITH_LINE_CONNECTION);

    expect(result?.lines[0]).toEqual(CART_LINE);
  });

  it("keeps null cart responses as null", () => {
    expect(toStandardActionsCart(null)).toBeNull();
  });
});
