---
'@shopify/hydrogen': patch
---

Add an experimental `createWithCache_unstable` utility, which creates a function similar to `useQuery` from Hydrogen v1. Use this utility to query third-party APIs and apply custom cache options.

To setup the utility, update your `server.ts`:

```js
import {
  createStorefrontClient,
  createWithCache_unstable,
  CacheLong,
} from '@shopify/hydrogen';

// ...

  const cache = await caches.open('hydrogen');
  const withCache = createWithCache_unstable({cache, waitUntil});

  // Create custom utilities to query third-party APIs:
  const fetchMyCMS = (query) => {
    // Prefix the cache key and make it unique based on arguments.
    return withCache(['my-cms', query], CacheLong(), () => {
      const cmsData = await (await fetch('my-cms.com/api', {
        method: 'POST',
        body: query
      })).json();

      const nextPage = (await fetch('my-cms.com/api', {
        method: 'POST',
        body: cmsData1.nextPageQuery,
      })).json();

      return {...cmsData, nextPage}
    });
  };

  const handleRequest = createRequestHandler({
    build: remixBuild,
    mode: process.env.NODE_ENV,
    getLoadContext: () => ({
      session,
      waitUntil,
      storefront,
      env,
      fetchMyCMS,
    }),
  });
```

**Note:** The utility is unstable and subject to change before stabalizing in the 2023.04 release.
