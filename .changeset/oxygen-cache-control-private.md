---
"@shopify/hydrogen": patch
---

Responses that Hydrogen makes private, such as personalized, session, and checkout redirect responses, now also drop `Oxygen-Cache-Control` and any other vendor `*-Cache-Control` header. Oxygen's full-page cache reads only `Oxygen-Cache-Control` and ignores `Cache-Control`, so before this change a route that opted into the full-page cache could still store a page with customer data and serve it to other visitors.
