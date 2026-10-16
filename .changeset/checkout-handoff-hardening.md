---
"@shopify/hydrogen": patch
---

`/checkout` and `/cart/<permalink>` redirects now send `Cache-Control: private, no-store, max-age=0, must-revalidate`, so shared caches can't store a buyer-specific checkout URL. The checkout redirect also no longer intercepts `/account/login`, `/account/authorize`, `/account/refresh`, or `/account/logout`, so apps that serve these routes with their own handlers now receive the requests.
