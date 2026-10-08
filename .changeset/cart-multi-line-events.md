---
"@shopify/hydrogen": patch
---

The cart store now applies `updateCart` calls that update or remove several lines at once. Each line is projected, marked pending, rolled back on failure and settled from the response, where before the event was ignored and the UI kept the old lines.
