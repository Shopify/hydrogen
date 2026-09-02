/**
 * Common currency format patterns for E2E tests.
 *
 * These regexes match typical Shopify-formatted prices for different currencies.
 * Extract them here for reuse across tests that validate internationalization
 * or market-specific pricing.
 */
export const CURRENCY_FORMATS = {
  USD: /^\$[\d,]+\.\d{2}$/,
  CAD: /^CA\$[\d,]+\.\d{2}$/,
} as const;
