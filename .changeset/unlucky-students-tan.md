---
'@shopify/hydrogen': patch
---

Fix: remove setting of `id_token` during Customer Account API token refresh because it does not get return in the API.
