---
'@shopify/hydrogen': patch
---

Add an experimental `withCache_unstable` utility similar to `useQuery` from Hydrogen v1. To setup the utility, update your `server.ts`:

```diff
- const {storefront} = createStorefrontClient({
+ const {storefront, withCache_unstable} = createStorefrontClient({
    ...
  });

  const handleRequest = createRequestHandler({
    build: remixBuild,
    mode: process.env.NODE_ENV,
    getLoadContext: () => ({
      session,
      waitUntil,
      storefront,
      env,
+     withCache_unstable,
    }),
  });
```

Then use the utility within your loaders:

```ts
export async function loader({context: {storefront, withCache}}: LoaderArgs) {
  const data = await withCache(
    'test-with-cache',
    async () => {
      const result = await fetch('https://www.some.com/api');
      if (result.ok) {
        return result.json();
      } else {
        throw new Error('Error: ' + result.status);
      }
    },
    {
      strategy: storefront.CacheLong(),
    },
  );

  return json({data});
}
```

The utility is unstable and subject to change before stabalizing in the 2023.04 release.
