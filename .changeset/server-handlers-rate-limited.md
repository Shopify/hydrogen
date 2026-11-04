---
"@shopify/hydrogen": minor
---

Add optional `rateLimitHandling: "response"` to `createCartServerHandlers`, `createPredictiveSearchServerHandlers`, and `handleShopifyRoutes`. Each API keeps its previous rate-limit handling when the option is absent. With the option, a Storefront API HTTP `429` produces a caller `429`, a constant message, `Cache-Control: no-store`, and a validated `Retry-After` header. Each mapped failure is logged once through Hydrogen\'s logger.

Cart mutations keep the existing `cart_mutation_failed` code. Predictive search keeps `invalid_predictive_search_request`. Neither error-code union changes, so exhaustive switches and `Record` mappings remain valid. A rate-limited native cart form receives a plain-text `429` page. The router option maps thrown registered-handler errors, including synchronous throws, to a JSON error with generic code `rate_limited`. Without that option, thrown errors retain their previous propagation. A direct `cartHandlers.get()` still throws.

A route error result accepts optional `format: "text"` to send only its message as plain text. Results without it stay JSON. Predictive search logs failed Storefront API queries and no longer exposes their upstream diagnostic body in error messages.
