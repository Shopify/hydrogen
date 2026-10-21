import { formatMoney as formatHydrogenMoney, type MoneyV2 } from "@shopify/hydrogen";

/** Formats a Storefront API amount. Never compute amounts on the client. */
export function formatMoney(money: MoneyV2, locale = "en-US"): string {
  return formatHydrogenMoney(money, { locale }).toString();
}
