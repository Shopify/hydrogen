---
"@shopify/hydrogen": patch
---

Redirect targets such as `return_to` and the cart form's referrer now fall back to the home page when they are a `blob:` URL, or a same-origin URL with a user name or password. A `blob:` URL reports the origin of the URL it wraps, so it passed the same-origin check and was returned as a full URL instead of a path.
