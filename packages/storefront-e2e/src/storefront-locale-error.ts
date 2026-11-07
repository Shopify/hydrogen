/**
 * The page answered, but it set neither `window.Shopify.country` nor a locale. This is only an
 * absence: it is not a different locale, and it is not an unreadable page. A partial or invalid
 * value, a page that does not answer, or a closed page is a different error.
 */
export class LocaleUnavailableError extends Error {
  constructor() {
    super(
      "Storefront locale is not readable: window.Shopify.country and window.Shopify.locale were not set within 5 seconds. Open a storefront page first.",
    );
    this.name = "LocaleUnavailableError";
  }
}
