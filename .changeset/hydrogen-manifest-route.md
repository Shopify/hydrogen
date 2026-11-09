---
"@shopify/hydrogen": minor
---

Serve a Hydrogen manifest at `/__shopify/hydrogen/manifest.json` from `handleShopifyRoutes`, so Shopify services can build URLs for a headless storefront. The route is always on and needs no new options: it reads the `routeTemplates` you already pass and the `defineShopifyI18n` definition in the request context.

```json
{
  "version": 1,
  "routes": { "product": "/p/:productHandle", "cart": "/basket", "...": "..." },
  "i18n": {
    "type": "pathname",
    "defaultLocale": { "language": "EN", "country": "US" },
    "locales": [
      { "language": "EN", "country": "US", "pathPrefix": "" },
      { "language": "FR", "country": "CA", "pathPrefix": "/fr-ca" }
    ]
  }
}
```

`routes` lists every standard route, filling in Shopify's default path for each one you don't override, and is `null` when `handleShopifyRoutes` receives no `routeTemplates`. `i18n` lists every supported locale, default first, with its `pathPrefix` under pathname routing or its `hostname` under domain routing, and is `null` when the request context uses the deprecated fixed-locale `i18n` input. Only those fields are published: extra keys on route templates or locale entries stay private. Every hostname in a domain-routed definition is published, so keep staging or unreleased hostnames out of it. The route answers `GET` and `HEAD` with a short public cache, and other methods with `405`.
