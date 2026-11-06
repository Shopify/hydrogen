---
"@shopify/hydrogen": minor
---

Add `defineShopifyI18n`, a module-scope, serializable internationalization definition that resolves the request locale on the app's behalf.

```ts
export const i18n = defineShopifyI18n({
  defaultLocale: { language: "EN", country: "US" },
  routing: {
    type: "pathname", // or "domain" with a `hostname` per locale
    locales: [
      { language: "FR", country: "CA" }, // served at /fr-ca
      { language: "PT_BR", country: "BR", pathSegment: "br" },
    ],
  },
});
```

- `createShopifyRequestContext({request, i18n, locale?})` now accepts the definition and matches the locale from the request URL (or the forwarded `x-storefront-url` header). Pass `locale` to pin one explicitly, for example in static rendering; it is validated against the definition and throws when unsupported.
- The resolved `{language, country, pathPrefix}` is now `requestContext.locale` and `storefrontClient.locale` (type `ShopifyMatchedLocale`).
- **Deprecated**, to be removed in the next major release:
  - Passing a fixed `{language, country, pathPrefix}` as `i18n`. It keeps working as before: that locale is used for every request, with no URL matching. Pass a `defineShopifyI18n` definition instead.
  - `requestContext.i18n` and `storefrontClient.i18n`. They still hold the resolved locale, the same object as `.locale`. Read `.locale` instead. The definition is not exposed on the context: import it from the module where you define it.
  - The `I18nConfig` type. Use `ShopifyLocale` for `{language, country}`, `ShopifyMatchedLocale` for the resolved locale, and `ShopifyI18n` for the definition.
- Pathname routing: the default locale is served unprefixed only; prefixes derive as `/{language}-{country}` unless `pathSegment` overrides them. Domain routing: exact hostname match, one hostname per locale, and the default locale must be listed so it has a canonical host. Unknown prefixes and hostnames (localhost, preview URLs) resolve to `defaultLocale`. Definitions are validated when defined so misconfiguration fails at startup.
- New helpers: `matchLocale` (accepts a `Request`, `URL`, URL string, or pathname, and throws for a string that is neither), `resolveSupportedLocale` (validates an explicitly chosen locale, or its path segment, against the definition and throws `UnsupportedLocaleError` otherwise), `getSupportedLocales`, `getLocalePathSegment` (the segment that identifies a locale in a URL or route param, defined for every locale regardless of routing type), `getLocalizedHref` (rewrites an href into another locale; a path under pathname routing, an absolute URL under domain routing), and `isSameLocale`.
- Static rendering with per-locale routes: put the locale in a `[locale]` route segment, generate its params from `getSupportedLocales(i18n).map(getLocalePathSegment)`, resolve the param with `resolveSupportedLocale(param, i18n)`, and pass the result as `locale` to `createShopifyRequestContext`. A request handler rewrites incoming URLs into that internal shape (domain routing: hostname → segment; pathname routing: unprefixed default → default segment).
- `handleShopifyRoutes` registered handlers now match with the request's locale prefix stripped, so `/fr-ca/api/cart` reaches the `/api/cart` handler. This also applies to a `pathPrefix` passed the deprecated way: localized handler paths that used to fall through to your app now reach the handler.
