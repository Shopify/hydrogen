---
"@shopify/hydrogen": patch
---

The Customer Account authorize route now redirects to the failed-login path when the OAuth token request times out, can't reach Shopify, or gets a response body that isn't JSON. These failures used to reject `handleShopifyRoutes()`, so the customer saw the app's error page instead.

`customerSession.handleOAuthCallback()` now throws `CustomerAccountOAuthError` with the `token_exchange_failed` code for these failures, with the original error as `cause`. If you call `handleOAuthCallback()` directly and catch `CustomerAccountApiError` to handle token request timeouts, catch `CustomerAccountOAuthError` instead.
