---
'@shopify/remix-oxygen': patch
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

Subrequest Profiler (stable) - Provides an overview of network requests happening on the server side

#### How to use:

1. Run `h2 dev`
2. Visit http://localhost:3000/subrequest-profiler

#### Set request display name with `storefront.query`:

```tsx
context.storefront.query(
  HOMEPAGE_FEATURED_PRODUCTS_QUERY,
  {
    displayName: 'Feature products',
    variables: {
      country,
      language,
    },
  },
)
```

#### Set request debug information with `createWithCache`:

```tsx
const withCache = createWithCache({
  cache,
  waitUntil,
  request,
});

const data3p = async () => {
  return await withCache(
    ['Some unique cache keys'],
    CacheLong(),
    ({addDebugData}) => {
      return fetch('https://some-3p-endpoint.com').then(async (response) => {
        if (process.env.NODE_ENV === 'development') {
          addDebugData({
            displayName: '3p endpoint display name',
            response,
          });
        }

        return await response.json();
      });
    },
  );
};
```

