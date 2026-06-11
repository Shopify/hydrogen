import { formatMoney as kitFormatMoney, type MoneyV2 } from "@shopify/hydrogen";

const DEFAULT_LOCALE = "en-US";
const DEFAULT_OPTIONS = { locale: DEFAULT_LOCALE };

export function formatMoney(money: MoneyV2 | readonly MoneyV2[]): string {
  if (Array.isArray(money)) {
    return kitFormatMoney(money, DEFAULT_OPTIONS).toString();
  }
  return kitFormatMoney(money as MoneyV2, DEFAULT_OPTIONS).toString();
}
