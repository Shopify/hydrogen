---
"@shopify/hydrogen": patch
---

Storefront responses now include a `Link: </.well-known/ucp>; rel="ucp"` header, so AI agents can discover your store's Universal Commerce Protocol (UCP) profile from any URL, as they already can on Online Store themes. `requestContext.applyResponseHeaders()` adds it to every response. Any existing `Link` header is kept, and the UCP link isn't added again if the response already has a `rel="ucp"` link. The header is left off Oxygen deployment URLs on `myshopify.dev`, because the profile isn't served there.

On Oxygen custom domains, Shopify serves `/.well-known/ucp` before the request reaches your app. Everywhere else, `handleShopifyRoutes` serves it, starting with [#3976](https://github.com/Shopify/hydrogen/pull/3976). This header ships together with or after that change.

If you use Next.js, call `applyResponseHeaders()` on the `NextResponse.next()` response in `proxy.ts` and then remove its `Link` header, as the Next.js template now does. Next.js lets a `Link` header set by the proxy replace the one a route handler returns, so leaving it in place would drop your route handlers' own links. Next.js pages then don't send the UCP header.
