---
"@shopify/hydrogen": patch
---

HTML pages now include a `Link: </.well-known/ucp>; rel="ucp"` response header, so AI agents can find your store's Universal Commerce Protocol (UCP) profile from any page, the same way they do on Online Store themes. If you already call `requestContext.applyResponseHeaders()`, you don't need to change anything. Existing `Link` headers are kept, and the header isn't added if a response already has a `rel="ucp"` link. It's also left off Oxygen deployment URLs on `myshopify.dev`, where the profile isn't served.
