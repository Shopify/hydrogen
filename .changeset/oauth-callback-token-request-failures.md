---
"@shopify/hydrogen": patch
---

The Customer Account authorize route now redirects to the failed-login path when the OAuth token request times out, can't reach Shopify, or gets a response body that isn't JSON. These failures used to reject `handleShopifyRoutes()`, so the customer saw the app's error page instead. The authorize route now also logs a `sign-in failed` warning with the error code whenever it redirects to the failed-login path.

`customerSession.handleOAuthCallback()` now throws `CustomerAccountOAuthError` for these failures, with the original error as `cause`. The code is `token_exchange_failed` when the token request fails or times out, and `invalid_token_response` when the response body isn't JSON. If you call `handleOAuthCallback()` directly and catch `CustomerAccountApiError` to handle token request timeouts, catch `CustomerAccountOAuthError` instead.
