---
'@shopify/hydrogen': minor
---

Added `robots` option to SEO config that allows users granular control over the robots meta tag. This can be set on both a global and per-page basis using the handle.seo property.

Example:

```ts
export handle = {
  seo: {
    robots: {
      noIndex: false,
      noFollow: false,
    }
  }
}
```
