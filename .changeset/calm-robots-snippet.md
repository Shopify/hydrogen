---
'@shopify/hydrogen': patch
---

Fix `robots.maxSnippet` and `robots.maxVideoPreview` being left out of the robots meta tag when set to `0` in `getSeoMeta` and the `Seo` component.
