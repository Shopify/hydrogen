---
'@shopify/hydrogen': patch
---

Calls to `withCache` can now be shown in the `/debug-network` tool when using the Worker runtime. For this to work, use the new `request` parameter in `createWithCache`:

```diff
export default {
  fetch(request, env, executionContext) {
    // ...
    const withCache = createWithCache({
      cache,
      waitUntil,
+     request,
    });
    // ...
  },
}
```
