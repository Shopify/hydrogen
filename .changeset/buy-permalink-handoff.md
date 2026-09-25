---
'@shopify/hydrogen': minor
---

Forward UCP `/buy/{items}` permalinks to the configured Shopify store from `createRequestHandler`. GET requests receive a 303 redirect with `Cache-Control: no-store` and `Referrer-Policy: no-referrer`; other methods receive 405. Bare `/buy` pages and trailing-slash URLs still reach the app.

The redirect preserves the received path and query. Client-side navigations become full page loads, removing only React Router's `_routes` parameter without re-encoding the remaining query. The destination store must have UCP permalinks enabled.
