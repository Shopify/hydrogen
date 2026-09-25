---
'@shopify/hydrogen': patch
---

Add an optional `sessionKey` to `createCustomerSession` for isolating Customer Account tokens and pending login state when sharing session storage. The default remains `"customerAccount"`, preserving existing sessions.
