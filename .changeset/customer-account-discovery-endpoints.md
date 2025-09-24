---
'@shopify/hydrogen': minor
---

Discover Customer Account API and authentication URLs dynamically via .well-known endpoints on the storefront domain. This eliminates hardcoded shopify.com URLs and reduces maintenance burden as authentication paths evolve.

## New Features

- Dynamic discovery of Customer Account endpoints via `.well-known/openid-configuration` and `.well-known/customer-account-api`
- Automatic fallback to legacy shopify.com URLs when discovery fails
- In-memory caching with 1-hour TTL to minimize network requests
- Configurable via `useDiscovery` and `storefrontDomain` options in `createCustomerAccountClient`

## Breaking Changes

None. Discovery is enabled by default but gracefully falls back to legacy URLs, maintaining full backward compatibility.

## Migration

No action required. Discovery is enabled automatically and uses the storefront domain from `env.PUBLIC_STORE_DOMAIN` or extracts it from the request URL. To disable discovery:

```typescript
const customerAccount = createCustomerAccountClient({
  // ... other options
  useDiscovery: false, // Disable discovery, use legacy URLs
});
```
