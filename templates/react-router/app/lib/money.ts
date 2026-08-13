import { formatMoney, type MoneyV2 } from "@shopify/hydrogen";

export function formatPrice(money: MoneyV2, locale = "en-US"): string {
  return formatMoney(money, { locale }).toString();
}

export function formatPriceRange(min: MoneyV2, max: MoneyV2, locale = "en-US"): string {
  return formatMoney([min, max], { locale }).toString();
}
