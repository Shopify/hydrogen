---
'@shopify/hydrogen': patch
---

Reject cart mutations from other origins before reading the body or accessing customer session data. Cart POST handlers require a matching `Origin` header or, when absent, a matching `Referer`. Behind a trusted proxy, provide the public origin through `sessionManager.getSessionOrigin()`; direct server-side callers must include the source header explicitly.
