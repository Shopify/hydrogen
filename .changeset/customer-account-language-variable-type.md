---
"@shopify/hydrogen": patch
---

The Customer Account client now fills an omitted `$language` only when the document declares it as `$language: LanguageCode`, matching the Storefront client. A same-named variable of any other type, such as `$language: String!`, is left to the caller and keeps its declared requiredness in the variables type. A value you pass still wins over the request context.

If a nullable `$language` of another type relied on the autofill, the client now leaves it out of the request when you omit it, so its GraphQL default or `null` applies. Declare it as `LanguageCode` or pass the value explicitly.
