---
"@shopify/hydrogen": minor
---

Add standard route templates for cart, search, policy, and collection-listing pages so custom storefront routes can be matched, resolved, and redirected consistently.

Recognize both `/collections` and the legacy `/products` path as collection-listing routes, while keeping `/collections` as the canonical generated path.

Predictive search query suggestions now honor the configured `search` route, and browser matching prefers all configured route templates before Shopify defaults.
