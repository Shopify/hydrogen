---
"@shopify/hydrogen": patch
---

Fix the cart store skipping `updateCart` configuration when the app hydrates before the Standard Actions script has run. Direct `window.Shopify.actions.updateCart` calls now reach the endpoint set with `configureCartEndpoint()` instead of Shopify's default handler.
