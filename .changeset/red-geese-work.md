---
'@shopify/hydrogen': patch
---

Change `storefrontRedirect` to ignore query parameters when matching redirects. For example, a redirect in the admin from `/snowboards` to `/collections/snowboards` will now match on the URL `/snowboards?utm_campaign=buffer` and redirect the user to `/collections/snowboards?utm_campaign=buffer`. This is a breaking change. If you want to retain the legacy functionality that is query parameter sensitive, pass `matchQueryParams` to `storefrontRedirect()`:

```ts
storefrontRedirect({
  request,
  response,
  storefront,
  matchQueryParams: true,
});
```
