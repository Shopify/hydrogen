---
"@shopify/hydrogen": minor
---

Keep carts in your store's Universal Commerce Protocol (UCP) cart. Create a transport with `createUcpCartTransport({ agentProfile })` from the new server-only entry point `@shopify/hydrogen/ucp`, and pass it to `createCartServerHandlers({ transport })`. The browser cart, its hooks, and `/api/cart` stay the same. UCP carts don't support buyer identity, notes, cart attributes, line attributes, or selling plans, so `transport` can't be combined with `fragment` or `customerSession`. Because each UCP update replaces the whole cart, the cart store sends one change at a time to a UCP cart. Storefront API carts keep sending changes in parallel.
