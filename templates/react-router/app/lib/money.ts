import { formatMoney, type MoneyV2 } from "@shopify/hydrogen";

export function formatPrice(money: MoneyV2, locale = "en-US"): string {
  return formatMoney(money, { locale }).toString();
}

export function compareMoney(a: MoneyV2 | null | undefined, b: MoneyV2 | null | undefined): number {
  if (!a || !b) return 0;
  return Number.parseFloat(a.amount) - Number.parseFloat(b.amount);
}

export function salePercent(
  price: MoneyV2,
  compareAtPrice: MoneyV2 | null | undefined,
): number | null {
  if (!compareAtPrice) return null;
  const current = Number.parseFloat(price.amount);
  const compare = Number.parseFloat(compareAtPrice.amount);
  if (!Number.isFinite(current) || !Number.isFinite(compare) || compare <= current) return null;
  return Math.round(((compare - current) / compare) * 100);
}
