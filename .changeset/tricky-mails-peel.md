---
'@shopify/hydrogen': patch
---

Add params to override the login and authorize paths:

```ts
const hydrogenContext = createHydrogenContext({
  // ...
  customerAccount: {
    loginPath = '/account/login',
    authorizePath = '/account/authorize',
    defaultRedirectPath = '/account',
  },
});
```
