import type { ShopifyLocale } from "./types";

/**
 * A locale (or its path segment) is not one of the definition's supported locales.
 *
 * Thrown by `resolveSupportedLocale`, and therefore by `createShopifyRequestContext({locale})`
 * and `getLocalizedHref`. Catch it where an unknown locale is a routing outcome rather than a
 * bug, for example to return a 404 from a `[locale]` route segment.
 */
export class UnsupportedLocaleError extends Error {
  readonly requested: ShopifyLocale | string;
  readonly supported: readonly ShopifyLocale[];

  constructor(requested: ShopifyLocale | string, supported: readonly ShopifyLocale[]) {
    const requestedLabel =
      typeof requested === "string"
        ? `Path segment "${requested}"`
        : `Locale ${requested.language}-${requested.country}`;
    const supportedLabel = supported.map((l) => `${l.language}-${l.country}`).join(", ");
    super(
      `${requestedLabel} is not defined in this storefront's i18n. Supported locales: ${supportedLabel}.`,
    );
    this.name = "UnsupportedLocaleError";
    this.requested = requested;
    this.supported = supported;
  }
}
