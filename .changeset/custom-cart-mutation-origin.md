---
'@shopify/hydrogen': patch
---

Clarify that app-owned cart-metafield mutation routes must provide their own CSRF protection before reading the body or cart cookie, including protection against sibling subdomains.
