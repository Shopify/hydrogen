---
"@shopify/hydrogen": patch
---

Since 2026.10.2, the Storefront client injects the request's market only into variables declared as `$country: CountryCode` or `$language: LanguageCode`. If your query declared a nullable `$country` or `$language` with another type, such as `$country: String`, and relied on the client filling in the market, that variable is now sent as `null`, and the variables type doesn't flag it because it's optional. Declare it as `$country: CountryCode` or `$language: LanguageCode` to keep injection, or pass `client.i18n.country` / `client.i18n.language` explicitly.
