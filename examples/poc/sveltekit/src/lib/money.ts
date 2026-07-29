import { formatMoney as kitFormatMoney, type MoneyV2 } from "@shopify/hydrogen";

const DEFAULT_LOCALE = "en-US";

export function formatMoney(money: MoneyV2): string {
  return kitFormatMoney(money, { locale: DEFAULT_LOCALE }).toString();
}
