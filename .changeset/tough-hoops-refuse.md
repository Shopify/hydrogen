---
'@shopify/hydrogen': patch
---

Keep customers logged in when a Customer Account API token refresh fails due to a transient error. The session is now only cleared when the refresh token is missing or the token endpoint returns `invalid_grant`, so other OAuth errors, HTTP failures, and network failures can be retried on a subsequent request.
