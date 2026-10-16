---
"@shopify/hydrogen": patch
---

The Storefront client now injects the request's market only into variables declared as `$country: CountryCode` or `$language: LanguageCode`. Same-named variables of any other type, such as `$country: String!`, keep the caller's value and retain their declared requiredness in the `graphql()` variables type.

If your query declared a nullable `$country` or `$language` with another type, such as `$country: String`, and relied on the client filling in the market, that variable is now sent as `null`, and the variables type doesn't flag it because it's optional. Declare it as `$country: CountryCode` or `$language: LanguageCode` to keep injection, or pass `client.i18n.country` / `client.i18n.language` explicitly.
