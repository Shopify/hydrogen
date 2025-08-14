---
"@shopify/hydrogen-react": patch
---

Fixed parseMetafield to correctly handle money type metafields with currency_code

- Transform currency_code (from Storefront API) to currencyCode (expected by MoneyV2 type)
- Maintain backward compatibility for metafields already using currencyCode
- Add tests for both snake_case and camelCase formats

Fixes #3071