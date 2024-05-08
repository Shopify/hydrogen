---
'@shopify/hydrogen': patch
---

When extending the content security policy, if the default directive is 'none' then the default won't be merged into the final directive.
