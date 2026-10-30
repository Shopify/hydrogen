import type { UpdateCartPayload } from "../../vendor/standard-actions";
import type { CartData, CartCost, Money } from "../core/cart/state";
import type { UcpCart, UcpChildCart, UcpTotal, UcpRequest } from "./types";

export function minorToMoney(amount: number, currencyCode: string): Money {
  if (!Number.isSafeInteger(amount)) throw new Error("UCP amount must be a safe integer");
  const digits =
    new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).resolvedOptions()
      .maximumFractionDigits ?? 2;
  const value = String(Math.abs(amount)).padStart(digits + 1, "0");
  return {
    currencyCode,
    amount: `${amount < 0 ? "-" : ""}${digits ? `${value.slice(0, -digits)}.${value.slice(-digits)}` : value}`,
  };
}
function cost(totals: UcpTotal[], currency: string): CartCost {
  const total = totals.find((t) => t.type === "total");
  if (!total) throw new Error("UCP cart is missing total");
  const totalAmount = minorToMoney(total.amount, currency);
  return {
    totalAmount,
    checkoutChargeAmount: totalAmount,
    subtotalAmount: minorToMoney(
      totals.find((t) => t.type === "subtotal")?.amount ?? total.amount,
      currency,
    ),
  };
}
export function ucpCartToCartData(cart: UcpCart, id: string = cart.id): CartData {
  const children = (cart.carts ?? [cart]).filter((c) => c.currency && c.line_items && c.totals);
  const groups = children.map((c) => ({
    seller: { shop: c.shop ?? "" },
    cartId: c.id,
    currencyCode: c.currency,
    cost: cost(c.totals, c.currency),
    discountCodes: (c.discounts?.codes ?? [])
      .filter((code) => typeof code === "string")
      .map((code) => ({
        code,
        applicable: (c.discounts?.applied ?? []).some((d) => d.code === code || d.title === code),
      })),
    checkoutUrl: c.continue_url ?? null,
  }));
  const nodes = children.flatMap((c) =>
    c.line_items.map((l) => ({
      id: l.id,
      quantity: l.quantity,
      seller: { shop: c.shop ?? l.shop ?? "" },
      cartId: c.id,
      merchandise: { id: l.item.id, product: { title: l.item.title } },
      cost: {
        ...cost(l.totals, c.currency),
        amountPerQuantity: minorToMoney(l.item.price, c.currency),
        compareAtAmountPerQuantity: null,
      },
    })),
  );
  let combined: CartCost | undefined;
  if (groups.length && new Set(groups.map((g) => g.currencyCode)).size === 1) {
    const currency = groups[0]?.currencyCode;
    if (currency)
      combined = cost(
        ["subtotal", "total"].map((type) => ({
          type,
          amount: children.reduce(
            (n, c) =>
              n +
              (c.totals.find((t) => t.type === type)?.amount ??
                c.totals.find((t) => t.type === "total")?.amount ??
                0),
            0,
          ),
        })),
        currency,
      );
  }
  return {
    id,
    groups,
    lines: { nodes },
    totalQuantity: nodes.reduce((n, l) => n + l.quantity, 0),
    attributes: [],
    discountCodes: [
      ...new Map(groups.flatMap((g) => g.discountCodes).map((d) => [d.code, d])).values(),
    ],
    checkoutUrl:
      cart.continue_url ?? (children.length === 1 ? (children[0]?.continue_url ?? null) : null),
    ...(combined ? { cost: combined } : {}),
  };
}
function existingCodes(child: UcpChildCart | undefined): string[] {
  return (child?.discounts?.codes ?? []).filter((code) => typeof code === "string");
}
export function cartPayloadToUcpUpdate(
  child: UcpChildCart | undefined,
  payload: UpdateCartPayload,
): NonNullable<UcpRequest["cart"]> {
  const lines = (child?.line_items ?? []).map((l) => ({
    id: l.id,
    item: { id: l.item.id },
    quantity: l.quantity,
  }));
  for (const change of payload.lines ?? []) {
    const index = lines.findIndex((l) =>
      change.id ? l.id === change.id : l.item.id === change.merchandiseId,
    );
    if (index >= 0) {
      const line = lines[index];
      if (!line) continue;
      line.quantity = change.id ? change.quantity : line.quantity + change.quantity;
      if (change.quantity === 0) lines.splice(index, 1);
    } else if (change.quantity > 0 && change.merchandiseId)
      lines.push({ id: "", item: { id: change.merchandiseId }, quantity: change.quantity });
  }
  return {
    line_items: lines.map((l) => ({
      ...(l.id ? { id: l.id } : {}),
      item: l.item,
      quantity: l.quantity,
    })),
    discounts: { codes: payload.discountCodes ?? existingCodes(child) },
  };
}
