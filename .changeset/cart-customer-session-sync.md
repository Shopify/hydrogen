---
'@shopify/hydrogen': minor
---

Associate new carts with Customer Account sessions by passing `customerSession` to `createCartServerHandlers`. Authenticated cart reads also mark checkout URLs with `logged_in=true`. Customer Account server handlers now accept `onAuthenticated`, `onTokenRefresh`, and `onLogout` lifecycle hooks for secure application-owned integrations such as synchronizing existing cart buyer identity. Authentication hooks receive the new access token; refresh hooks receive a discriminated result describing the token and refresh outcome. Rejected hooks commit session changes and return a sanitized server error.
