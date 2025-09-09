---
'@shopify/hydrogen-react': patch
---

Fix TypeScript enum compatibility between Storefront and Customer Account APIs

Updated codegen configuration to reference Storefront API's LanguageCode and CurrencyCode enums for Customer Account API types. This ensures type compatibility when passing values like i18n.language between the APIs without TypeScript errors.