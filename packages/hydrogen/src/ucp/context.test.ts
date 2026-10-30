import { expect, it, vi } from "vitest";

import { createUcpCartTransport, type UcpCartTransportOptions } from "./transport";
import type { UcpCart, UcpCartContext } from "./types";
const child: UcpCart = {
  id: "child",
  currency: "USD",
  line_items: [
    {
      id: "line",
      item: { id: "item", title: "Item", price: 100 },
      quantity: 1,
      totals: [{ type: "total", amount: 100 }],
    },
  ],
  totals: [{ type: "total", amount: 100 }],
};
const context: UcpCartContext = {
  address_country: "US",
  address_region: "CA",
  postal_code: "94043",
  currency: "USD",
  language: "en-US",
  intent: "gift",
  location: "store-1",
  eligibility: ["com.example.loyalty"],
  payment: [{ handler: "com.example.payment", types: ["card"] }],
};
it.each(["static", "per-shop"] as const)(
  "sends %s context on creates and updates",
  async (mode) => {
    const call = vi.fn<UcpCartTransportOptions["call"]>().mockResolvedValue(child);
    const perShop = vi.fn((shop: string) => (shop === "shop" ? context : undefined));
    const transport = createUcpCartTransport({
      call,
      resolveShop: () => "shop",
      context: mode === "static" ? context : perShop,
    });
    const created = await transport.updateCart({ lines: [{ merchandiseId: "item", quantity: 1 }] });
    expect(call).toHaveBeenLastCalledWith(
      "create_cart",
      {
        shop: "shop",
        cart: {
          line_items: [{ item: { id: "item" }, quantity: 1 }],
          discounts: { codes: [] },
          context,
        },
      },
      { signal: undefined },
    );
    await transport.updateCart({
      cartId: created.cart.id ?? undefined,
      lines: [{ id: "line", quantity: 2 }],
    });
    expect(call).toHaveBeenLastCalledWith(
      "update_cart",
      {
        shop: "shop",
        id: "child",
        cart: {
          line_items: [{ id: "line", item: { id: "item" }, quantity: 2 }],
          discounts: { codes: [] },
          context,
        },
      },
      { signal: undefined },
    );
    if (mode === "per-shop") expect(perShop.mock.calls).toEqual([["shop"], ["shop"]]);
  },
);
it.each([undefined, () => undefined])("omits unprovided context", async (optionalContext) => {
  const call = vi.fn<UcpCartTransportOptions["call"]>().mockResolvedValue(child);
  const transport = createUcpCartTransport({
    call,
    resolveShop: () => "shop",
    context: optionalContext,
  });
  await transport.updateCart({ lines: [{ merchandiseId: "item", quantity: 1 }] });
  expect(call.mock.calls[0]?.[1].cart).not.toHaveProperty("context");
});
