---
'@shopify/hydrogen': patch
---

Fix the `/graphiql` route, which showed a blank page after GraphiQL 6 was released. The route now loads pinned versions of GraphiQL and its plugins from the CDN.
