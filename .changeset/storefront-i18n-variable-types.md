---
"@shopify/hydrogen": patch
---

The Storefront client now injects the request's market only into variables declared as `$country: CountryCode` or `$language: LanguageCode`. Same-named variables of any other type, such as `$country: String!`, keep the caller's value and retain their declared requiredness in the `graphql()` variables type.
