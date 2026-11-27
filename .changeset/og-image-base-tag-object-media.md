---
'@shopify/hydrogen': patch
---

`getSeoMeta` and the `Seo` component now output the base `og:image` tag (or `og:video` / `og:audio`) before the structured properties when `seo.media` is an object, so link previews in Slack, Facebook and other Open Graph consumers show the image.
