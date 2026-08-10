// Accessible button labels, sourced verbatim from shop-js `shopPayButton.buy`
// translations. Regionless lookups fall back to the first matching region below,
// so regional variants of the same language must stay grouped.
const SHOP_PAY_BUTTON_LABELS: Record<string, string> = {
  "bg-BG": "Покупка с Shop Pay",
  cs: "Koupit pomocí Shop Pay",
  da: "Køb med Shop Pay",
  de: "Mit Shop Pay kaufen",
  el: "Αγορά με Shop Pay",
  en: "Buy with Shop Pay",
  es: "Comprar con Shop Pay",
  fi: "Osta Shop Paylla",
  fr: "Acheter avec Shop Pay",
  hi: "Shop Pay से खरीदें",
  "hr-HR": "Kupi rabeći Shop Pay",
  hu: "Vásárlás a Shop Pay használatával",
  id: "Beli dengan Shop Pay",
  it: "Acquista con Shop Pay",
  ja: "Shop Payで購入",
  ko: "Shop Pay로 구매",
  "lt-LT": "Pirkti su „Shop Pay“",
  ms: "Beli menggunakan Shop Pay",
  nb: "Kjøp med Shop Pay",
  nl: "Kopen met Shop Pay",
  pl: "Kup przez Shop Pay",
  "pt-PT": "Comprar com o Shop Pay",
  "pt-BR": "Comprar com Shop Pay",
  "ro-RO": "Cumpără cu Shop Pay",
  ru: "Купить с помощью Shop Pay",
  "sk-SK": "Kúpiť cez Shop Pay",
  "sl-SI": "Kupite prek Shop Pay",
  sv: "Köp med Shop Pay",
  th: "ซื้อด้วย Shop Pay",
  tr: "Shop Pay ile satın al",
  vi: "Mua bằng Shop Pay",
  "zh-CN": "使用 Shop Pay 购买",
  "zh-TW": "使用 Shop Pay 購買",
};

const DEFAULT_LABEL = SHOP_PAY_BUTTON_LABELS.en;

/**
 * Resolves the localized accessible label for a BCP 47 language tag: exact
 * match, then base language, then the first regional variant of the base
 * language, then English.
 */
export function getShopPayButtonLabel(locale = "en"): string {
  const [language = "", region] = locale.trim().replace(/_/g, "-").split("-");
  const baseLanguage = language.toLowerCase();
  const normalized = region ? `${baseLanguage}-${region.toUpperCase()}` : baseLanguage;

  const exactLabel = SHOP_PAY_BUTTON_LABELS[normalized] ?? SHOP_PAY_BUTTON_LABELS[baseLanguage];
  if (exactLabel) return exactLabel;

  const regionalKey = Object.keys(SHOP_PAY_BUTTON_LABELS).find((key) =>
    key.startsWith(`${baseLanguage}-`),
  );
  return regionalKey ? SHOP_PAY_BUTTON_LABELS[regionalKey] : DEFAULT_LABEL;
}
