import { formatMoney as formatMoneyValue, type MoneyV2 } from "@shopify/hydrogen";

const DEFAULT_LOCALE = "en-US";

export function formatMoney(money: MoneyV2): string {
  return formatMoneyValue(money, { locale: DEFAULT_LOCALE }).toString();
}
