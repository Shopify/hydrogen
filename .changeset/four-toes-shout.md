---
'@shopify/hydrogen': major
---

The default [caching strategy](https://shopify.dev/docs/custom-storefronts/hydrogen/data-fetching/cache#caching-strategies) has been updated. The new default caching strategy provides a `max-age` value of 1 second, and a `stale-while-revalidate` value of 1 day. If you would keep the old caching values, update your queries to use `CacheShort`:

```diff
 const {product} = await storefront.query(
   `#graphql
     query Product($handle: String!) {
       product(handle: $handle) { id title }
     }
   `,
   {
     variables: {handle: params.productHandle},
+    /**
+     * Override the default caching strategy with the old caching values
+     */
+    cache: storefront.CacheShort(),
   },
 );
```
