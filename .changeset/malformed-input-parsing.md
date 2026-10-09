---
"@shopify/hydrogen": patch
---

A malformed `cart` cookie is treated as a missing cart, and malformed percent sequences in collection filter keys stay literal, instead of failing the request.
