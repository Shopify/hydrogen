---
"@shopify/hydrogen": minor
---

Add `createAppProxyServerHandlers()`. Shopify apps such as Digital Downloads, reviews, wishlists, and loyalty programs serve pages and endpoints through app proxy URLs (`/apps/*`, `/a/*`, `/community/*`, `/tools/*`). Those links, including ones already in customers' inboxes, 404 on a headless storefront unless something forwards them to the store.

```ts
import { createAppProxyServerHandlers } from "@shopify/hydrogen";

const appProxyHandlers = createAppProxyServerHandlers({ prefixes: ["a"] }); // omit prefixes for all four

handleShopifyRoutes({
  request,
  requestContext,
  storefrontClient,
  handlers: [cartHandlers, appProxyHandlers],
});
```

Matching requests, for every HTTP method, are proxied to the configured store with the app's response passed through as-is: status, body, `content-type`, `content-disposition`, and redirects. Hydrogen sends `_fd=0` upstream so Shopify does not redirect the request back to the primary domain, and rewrites redirects that target the store origin onto the storefront origin. Handlers registered at a literal pathname still win. Nothing is proxied unless the group is registered, and the group does not require `sessionManager`. Like Hydrogen's other proxies, the group rejects requests with a `callback` query parameter (JSONP) and doesn't pass app `Set-Cookie` headers through on `GET` requests or HTML pages. The app's `Cache-Control` is kept by default; pass `personalized: true` to make proxied responses private and uncacheable when an app renders customer-specific pages.

To support it, registered route handlers gain two declarative options and one result kind: a pathname ending in `/*` matches as a prefix (literal pathnames win), a `method` of `"*"` matches every HTTP method, and handlers may return `{ type: "response", response }` to pass a `Response` through unchanged.
