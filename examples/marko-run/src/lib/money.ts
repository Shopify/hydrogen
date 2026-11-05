import { formatMoney as hydrogenFormatMoney, type MoneyV2 } from "@shopify/hydrogen";

const DEFAULT_LOCALE = "en-US";

export function formatMoney(money: MoneyV2): string {
  return hydrogenFormatMoney(money, { locale: DEFAULT_LOCALE }).toString();
}
