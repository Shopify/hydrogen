---
'demo-store': patch
'@shopify/cli-hydrogen': patch
'@shopify/create-hydrogen': patch
---

Sitemaps are fundamentally broken if you have more than 250 products because of Storefront API limitations. Sitemaps aren't essential for SEO, but an incorrect sitemap is more likely to be detrimental. We are removing all sitemap functionality until we offer a proper solution.
