---
'@shopify/hydrogen': patch
---

Fixed `og:image` string shorthand to render as `<meta property="og:image">` instead of `<meta name="og:image">`. Open Graph meta tags require the `property` attribute, so previously these tags were not recognized by social platforms when using the string shorthand form. Other `og:*` tags and the object-form `og:image` were already correct.
