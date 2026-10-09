---
"@shopify/hydrogen": patch
---

Apply private, no-store cache directives to any response containing `Set-Cookie`, including application-owned cookies, instead of checking specific Shopify cookie names. Remove conflicting CDN cache directives from these responses.
