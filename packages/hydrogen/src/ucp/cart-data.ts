import type { CartData, CartLine, CartUserError, CartWarning, Money } from "../core/cart/state";
import type { CartErrorCode, CartWarningCode } from "../graphql/generated/storefront-api-types";
import { isObject, isUcpResponse, type UcpMessage, type UcpResponse } from "./mcp";

export const DISCOUNT_CAPABILITY = "dev.ucp.shopping.discount";
export const CATALOG_LOOKUP_CAPABILITY = "dev.ucp.shopping.catalog.lookup";

type UcpTotal = { type: string; amount: number };

export type UcpLineItem = {
  id: string;
  item: { id: string; title: string; price: number; image_url?: string };
  quantity: number;
  totals?: UcpTotal[];
};

export type UcpCart = UcpResponse & {
  id: string;
  line_items: UcpLineItem[];
  currency: string;
  totals?: UcpTotal[];
  // Automatic discounts have a title but no code.
  discounts?: { codes?: string[]; applied?: Array<{ code?: string }> };
  continue_url?: string;
  expires_at?: string;
};

type UcpCatalogVariant = {
  id: string;
  title?: string;
  options?: Array<{ name: string; label: string }>;
};

type UcpCatalogProduct = {
  id: string;
  title: string;
  handle?: string;
  variants?: UcpCatalogVariant[];
};

export type UcpCatalog = UcpResponse & { products?: UcpCatalogProduct[] };

export function isUcpCart(value: unknown): value is UcpCart {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.currency === "string" &&
    Array.isArray(value.line_items) &&
    value.line_items.every(isUcpLineItem) &&
    isOptionalTotals(value.totals) &&
    isOptionalDiscounts(value.discounts) &&
    (value.expires_at === undefined || typeof value.expires_at === "string") &&
    isUcpResponse(value)
  );
}

function isUcpLineItem(value: unknown): value is UcpLineItem {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.quantity === "number" &&
    isObject(value.item) &&
    typeof value.item.id === "string" &&
    typeof value.item.title === "string" &&
    typeof value.item.price === "number" &&
    (value.item.image_url === undefined || typeof value.item.image_url === "string") &&
    isOptionalTotals(value.totals)
  );
}

function isOptionalTotals(value: unknown): value is UcpTotal[] | undefined {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every(
        (total) =>
          isObject(total) && typeof total.type === "string" && typeof total.amount === "number",
      ))
  );
}

function isOptionalDiscounts(value: unknown): value is UcpCart["discounts"] {
  if (value === undefined) return true;
  if (!isObject(value)) return false;
  const { codes, applied } = value;
  return (
    (codes === undefined || (Array.isArray(codes) && codes.every((c) => typeof c === "string"))) &&
    (applied === undefined ||
      (Array.isArray(applied) &&
        applied.every(
          (entry) =>
            isObject(entry) && (entry.code === undefined || typeof entry.code === "string"),
        )))
  );
}

export function isUcpCatalog(value: unknown): value is UcpCatalog {
  return (
    isObject(value) &&
    (value.products === undefined || Array.isArray(value.products)) &&
    isUcpResponse(value)
  );
}

export type CatalogEntry = { product: UcpCatalogProduct; variant: UcpCatalogVariant };

export function hasCapability(response: UcpResponse, capability: string): boolean {
  return Object.hasOwn(response.ucp?.capabilities ?? {}, capability);
}

export function indexCatalog(catalog: UcpCatalog | null): Map<string, CatalogEntry> {
  const entries = new Map<string, CatalogEntry>();
  for (const product of catalog?.products ?? []) {
    for (const variant of product.variants ?? []) {
      entries.set(variant.id, { product, variant });
    }
  }
  return entries;
}

export function minorToDecimal(amount: number, currencyCode: string): string {
  const digits =
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
    }).resolvedOptions().maximumFractionDigits ?? 2;
  const sign = amount < 0 ? "-" : "";
  const minor = String(Math.abs(Math.trunc(amount))).padStart(digits + 1, "0");
  if (digits === 0) return sign + minor;
  return `${sign}${minor.slice(0, -digits)}.${minor.slice(-digits)}`;
}

export function toCartData(cart: UcpCart, catalog: Map<string, CatalogEntry>): CartData {
  const money = (amount: number): Money => ({
    amount: minorToDecimal(amount, cart.currency),
    currencyCode: cart.currency,
  });
  const total = (totals: UcpTotal[] | undefined, type: string): Money =>
    money(totals?.find((entry) => entry.type === type)?.amount ?? 0);
  const applied = new Set(
    cart.discounts?.applied?.flatMap(({ code }) =>
      code === undefined ? [] : [code.toLowerCase()],
    ),
  );

  const lines = cart.line_items.map(({ id, item, quantity, totals }): CartLine => {
    const entry = catalog.get(item.id);
    return {
      id,
      quantity,
      attributes: [],
      sellingPlanAllocation: null,
      cost: {
        amountPerQuantity: money(item.price),
        subtotalAmount: total(totals, "subtotal"),
        totalAmount: total(totals, "total"),
        compareAtAmountPerQuantity: null,
      },
      merchandise: {
        id: item.id,
        title: item.title,
        selectedOptions:
          entry?.variant.options?.map(({ name, label }) => ({ name, value: label })) ?? [],
        product: entry
          ? {
              id: entry.product.id,
              title: entry.product.title,
              ...(entry.product.handle && { handle: entry.product.handle }),
            }
          : { title: item.title },
        image: item.image_url ? { url: item.image_url } : null,
      },
    };
  });

  return {
    id: cart.id,
    checkoutUrl: cart.continue_url ?? null,
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    cost: {
      subtotalAmount: total(cart.totals, "subtotal"),
      totalAmount: total(cart.totals, "total"),
      checkoutChargeAmount: total(cart.totals, "total"),
    },
    note: null,
    attributes: [],
    lines: { nodes: lines },
    discountCodes: (cart.discounts?.codes ?? []).map((code) => ({
      code,
      applicable: applied.has(code.toLowerCase()),
    })),
  };
}

// Only codes whose meaning matches a Storefront API code map to it. CartWarning.code isn't
// nullable, so warnings without a matching code are left out.
const ERROR_CODES: Partial<Record<string, CartErrorCode>> = { invalid: "INVALID" };
const WARNING_CODES: Partial<Record<string, CartWarningCode>> = {
  discount_code_invalid: "DISCOUNT_NOT_FOUND",
};

export function toUserErrors(messages: UcpMessage[] = []): CartUserError[] {
  return messages
    .filter((message) => message.type === "error")
    .map(({ code, content }) => ({
      code: (code && ERROR_CODES[code]) || null,
      message: content ?? code ?? "Cart error",
    }));
}

export function toWarnings(messages: UcpMessage[] = []): CartWarning[] {
  return messages.flatMap(({ type, code, content }) => {
    const warningCode = type === "warning" && code ? WARNING_CODES[code] : undefined;
    return warningCode ? [{ code: warningCode, message: content ?? code ?? "" }] : [];
  });
}
