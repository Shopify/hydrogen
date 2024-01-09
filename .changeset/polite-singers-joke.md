---
'@shopify/hydrogen': patch
---

Fix the `<Seo />` component to render canonical URLs without trailing slashes. For example, both https://hydrogen.shop/collections/freestyle/ and https://hydrogen.shop/collections/freestyle return a canonical link of https://hydrogen.shop/collections/freestyle.

Thank you @joshuafredrickson for reporting.
