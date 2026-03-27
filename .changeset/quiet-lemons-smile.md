---
'skeleton': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

Remove redundant Storefront API proxy route from skeleton template. The server now automatically proxies requests to `/api/:version/graphql.json` via `createRequestHandler` with `proxyStandardRoutes: true` (enabled by default since December 2025).

Developers no longer need a manual route file for the tokenless Storefront API. Existing apps with this route can safely delete it - the server-level proxy provides the same functionality with better cookie forwarding and analytics integration.
