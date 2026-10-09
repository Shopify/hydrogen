---
"@shopify/hydrogen": minor
---

Forward UCP `/buy/{items}` permalinks to the configured Shopify store from `handleShopifyRoutes`, alongside the existing `/cart/{items}` handoff. The forward keeps the path and query untouched and uses the UCP redirect-resolution shape (303 with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`). In-app navigation to a buy permalink through `Shopify.routes.navigate` becomes a document navigation so the forward can run.
