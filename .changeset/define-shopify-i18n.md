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

- `createShopifyRequestContext({request, i18n, locale?})` now takes the definition and matches the locale from the request URL (or the forwarded `x-storefront-url` header). Pass `locale` to pin one explicitly, for example in static rendering; it is validated against the definition and throws when unsupported.
- **Breaking:** `requestContext.i18n` is now the definition. The resolved `{language, country, pathPrefix}` moved to `requestContext.locale` (type `ShopifyMatchedLocale`). `storefrontClient.i18n` and `storefrontClient.locale` mirror both. `@inContext` variable injection reads `requestContext.locale`.
- **Breaking:** the `I18nConfig` type is removed. Use `ShopifyLocale` for `{language, country}`, `ShopifyMatchedLocale` for the resolved locale, and `ShopifyI18n` for the definition.
- Pathname routing: the default locale is served unprefixed only; prefixes derive as `/{language}-{country}` unless `pathSegment` overrides them. Domain routing: exact hostname match, one hostname per locale, and the default locale must be listed so it has a canonical host. Unknown prefixes and hostnames (localhost, preview URLs) resolve to `defaultLocale`. Definitions are validated when defined so misconfiguration fails at startup.
- New helpers: `matchLocale` (accepts a `Request`, `URL`, or string), `resolveSupportedLocale` (validates an explicitly chosen locale against the definition), `getSupportedLocales`, `getLocalizedHref` (rewrites an href into another locale; a path under pathname routing, an absolute URL under domain routing), and `isSameLocale`.
- `handleShopifyRoutes` registered handlers now match with the request's locale prefix stripped, so `/fr-ca/api/cart` reaches the `/api/cart` handler.
