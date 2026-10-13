import { formatMoney as formatHydrogenMoney, type MoneyV2 } from "@shopify/hydrogen";

const DEFAULT_LOCALE = "en-US";
const DEFAULT_FORMAT_OPTIONS = { locale: DEFAULT_LOCALE };

export function formatMoney(money: MoneyV2): string {
  return formatHydrogenMoney(money, DEFAULT_FORMAT_OPTIONS).toString();
}
