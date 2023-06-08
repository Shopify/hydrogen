---
'demo-store': patch
---

Remove wrong cache control headers from route. Demo store is setting `cache-control` header when it is not suppose to. The demo store server renders cart information. Cart information is consider personalized content and should never be cached in any way.

Route `($locale).api.countries.tsx` can have cache control header because it is an API endpoint that doesn't render the cart.
