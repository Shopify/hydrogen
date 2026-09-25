---
"@shopify/hydrogen": patch
---

**Breaking:** Remove the `locations`, `path`, and `extensions` fields from `StorefrontApiError` and its `toJSON()` output. `createStorefrontClient` never populated them. `StorefrontApiError` is only thrown for HTTP, network, timeout, and response-parsing failures. GraphQL errors, including `THROTTLED`, are returned in `result.errors`, so read `extensions.code` there:

```ts
const result = await storefront.query(QUERY);
if (result.errors?.some((error) => error.extensions?.code === "THROTTLED")) {
  // retry
}
```
