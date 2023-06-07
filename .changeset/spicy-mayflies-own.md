---
'@shopify/hydrogen': patch
---

Add a `/admin` route that redirects to the Shopify admin. This redirect can be disabled by passing `noAdminRedirect: true` to `storefrontRedirect`:

```ts
storefrontRedirect({
  redirect,
  response,
  storefront,
  noAdminRedirect: true,
});
```
