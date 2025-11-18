---
'@shopify/hydrogen': minor
---

Customer Account API and authentication URLs are now dynamically discovered via .well-known endpoints on the storefront domain. This eliminates hardcoded shopify.com URLs and reduces maintenance burden as authentication paths evolve.

Discovery is always enabled and happens automatically in the background. If discovery fails or is unavailable, the system seamlessly falls back to legacy shopify.com URLs, ensuring continued functionality without any required changes.

## Features

- Dynamic discovery of Customer Account endpoints via `.well-known/openid-configuration` and `.well-known/customer-account-api`
- Automatic fallback to legacy shopify.com URLs when discovery fails
- In-memory caching with 1-hour TTL to minimize network requests
- Optional `storefrontDomain` parameter in `createCustomerAccountClient` to specify the domain for discovery (defaults to extracting from request URL)
