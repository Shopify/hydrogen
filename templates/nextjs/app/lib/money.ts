import { formatMoney } from "@shopify/hydrogen";

type MoneyValue = {
  amount: string;
  currencyCode: string;
};

export function formatPrice(money: MoneyValue, locale = "en-US") {
  return formatMoney(money, { locale }).toString();
}

export function formatPercentOff(price: MoneyValue, compareAtPrice: MoneyValue | null | undefined) {
  if (!compareAtPrice) return null;
  const priceAmount = Number.parseFloat(price.amount);
  const compareAmount = Number.parseFloat(compareAtPrice.amount);
  if (!Number.isFinite(priceAmount) || !Number.isFinite(compareAmount) || compareAmount <= 0) {
    return null;
  }
  const percent = Math.round(((compareAmount - priceAmount) / compareAmount) * 100);
  return percent > 0 ? `-${percent}%` : null;
}
