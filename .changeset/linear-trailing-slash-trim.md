---
"@shopify/hydrogen": patch
---

Request paths with long runs of slashes no longer slow down standard route matching and URL redirect lookups. Trailing slashes are now trimmed in linear time.
