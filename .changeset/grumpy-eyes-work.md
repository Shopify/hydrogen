---
'skeleton': patch
'@shopify/cli-hydrogen': patch
---

Fix redirection to the product's default variant when there are unknown query params in the URL.

When preparing the redirection URL to the default variant, do not keep the previous URL params for the redirect:

```diff
return redirect(
  getVariantUrl({
    // ...
-   searchParams: new URLSearchParams(url.search),
+   searchParams: new URLSearchParams(),
  }),
  {status: 302},
);
```
