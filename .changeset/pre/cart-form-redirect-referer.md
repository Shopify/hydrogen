---
"@shopify/hydrogen": patch
---

Redirect cart form submissions to `/` when the same-origin `Referer` path starts with `//`, instead of returning a path that resolves to another host.
