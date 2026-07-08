import { defaultI18n } from "@shared/config";
import type { I18nConfig } from "@shopify/hydrogen";

/**
 * Markets resolver (`hydrogen-markets` / `references/nextjs.md` host-based
 * shape). Reads the forwarded storefront URL (`x-storefront-url`, set by
 * `proxy.ts` via `requestContext.getForwardedRequestHeaders()`) and resolves a
 * market from a `MARKET_BY_HOST` allowlist, defaulting to the shared config's
 * `defaultI18n` (US/EN).
 *
 * This is a single-market example, so the allowlist is empty (everything falls
 * back to the default) — but the helper is wired so multi-market is an
 * extension, not a rewrite. `Market` is `I18nConfig` so the resolved value is
 * directly assignable to `createShopifyRequestContext({ i18n })`.
 */
export type Market = I18nConfig;

export const DEFAULT_MARKET: Market = defaultI18n;

const MARKET_BY_HOST: Record<string, Market> = {
  // Single-market example: only the default. Add host -> market mappings here
  // when the storefront goes multi-market (values must be valid
  // ShopifyCountryCode / ShopifyLanguageCode pairs).
};

export function getMarketFromHeaders(headers: Pick<Headers, "get">): Market {
  const forwardedUrl = headers.get("x-storefront-url");
  if (!forwardedUrl) return DEFAULT_MARKET;

  try {
    const { hostname } = new URL(forwardedUrl);
    const host = hostname.toLowerCase();
    return MARKET_BY_HOST[host] ?? DEFAULT_MARKET;
  } catch {
    return DEFAULT_MARKET;
  }
}

/** The static client uses the default market (no `headers()` access). */
export function getDefaultMarket(): Market {
  return DEFAULT_MARKET;
}
