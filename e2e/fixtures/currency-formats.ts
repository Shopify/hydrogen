/**
 * Common currency format patterns for E2E tests.
 *
 * These regexes match typical Shopify-formatted prices for different currencies.
 * Extract them here for reuse across tests that validate internationalization
 * or market-specific pricing.
 */
export const CURRENCY_FORMATS = {
  USD: /^\$[\d,]+\.\d{2}$/,
  /** English-formatted CAD price, e.g. CA$1,121.00 */
  CAD_EN: /^CA\$[\d,]+\.\d{2}$/,
  /** French-Canadian-formatted CAD price, e.g. 1 121,00 $ */
  CAD_FR: /^[\d\u00A0\u202F ]+,\d{2}\s*\$$/,
} as const;
