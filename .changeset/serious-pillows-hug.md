---
'skeleton': patch
'@shopify/hydrogen': patch
---

[**Breaking change**]

Update `createWithCache` to make it harder to accidentally cache undesired results. `request` is now mandatory prop when initializing `createWithCache`.

```diff
// server.ts
export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    try {
      // ...
-     const withCache = createWithCache({cache, waitUntil});
+     const withCache = createWithCache({cache, waitUntil, request});
```

`createWithCache` now returns an object with two utility functions. The original `withCache` callback function is now `withCache.run`.

```diff
  const withCache = createWithCache({cache, waitUntil, request});

  const fetchMyCMS = (query) => {
-    return withCache(['my-cms', query], CacheLong(), async (params) => {
+    return withCache.run({
+      cacheKey: ['my-cms-composite', query],
+      cacheStrategy: CacheLong(),
+      shouldCacheResult: (body) => !body?.errors,
+    }, async(params) => {
      const response = await fetch('my-cms.com/api', {
        method: 'POST',
        body: query,
      });
      if (!response.ok) throw new Error(response.statusText);
      const {data, error} = await response.json();
      if (error || !data) throw new Error(error ?? 'Missing data');
      params.addDebugData({displayName: 'My CMS query', response});
      return data;
    });
  };
```

`withCache.fetch` is be used for caching simple fetch requests:

```ts
  const withCache = createWithCache({cache, waitUntil, request});

  const {data, response} = await withCache.fetch<{data: T; error: string}>(
    'my-cms.com/api',
    {
      method: 'POST',
      headers: {'Content-type': 'application/json'},
      body,
    },
    {
      cacheStrategy: options.cache ?? CacheLong(),
      shouldCacheResponse: (body) => !body?.error,
      cacheKey: ['my-cms', body],
      displayName: 'My CMS query',
    },
  );
```
