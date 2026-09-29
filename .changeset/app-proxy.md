---
"@shopify/hydrogen": minor
---

Add an opt-in app proxy to `handleShopifyRoutes`. Shopify apps such as Digital Downloads, reviews, wishlists, and loyalty programs serve pages and endpoints through app proxy URLs (`/apps/*`, `/a/*`, `/community/*`, `/tools/*`). Those links, including ones already in customers' inboxes, 404 on a headless storefront unless something forwards them to the store.

```ts
handleShopifyRoutes({
  request,
  requestContext,
  sessionManager,
  storefrontClient,
  appProxy: true, // or { prefixes: ["a", "apps"] }
});
```

When enabled, matching requests are proxied to the configured store with the app's response passed through as-is: status, body, `content-type`, `content-disposition`, and redirects. Hydrogen sends `_fd=0` upstream so Shopify does not redirect the request back to the primary domain, and rewrites redirects that target the store origin onto the storefront origin. Registered handler groups still win for paths they own. The proxy is off by default because it forwards arbitrary app responses.
