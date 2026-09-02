/**
 * Module-scoped cache for Intl.NumberFormat instances.
 *
 * Constructing an Intl.NumberFormat is expensive — it resolves the locale
 * chain, loads currency data, and builds the formatting pattern. The
 * .format() call on an existing instance is cheap by comparison.
 *
 * In a storefront, the same locale + currency + options combination is
 * hit repeatedly (every cart line, every product in a collection grid),
 * so reusing instances avoids redundant construction.
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

export function getFormatter(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`;

  let formatter = formatterCache.get(key);
  if (formatter) return formatter;

  formatter = new Intl.NumberFormat(locale, options);
  formatterCache.set(key, formatter);
  return formatter;
}
