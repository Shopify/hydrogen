---
'skeleton': patch
'@shopify/hydrogen': patch
'@shopify/cli-hydrogen': patch
---

✨ Change how customerAccountClient handle unauthorized customer during query/mutate

When an unauthorized customer is presented during a query or mutate call. The customer will automatically be redirect to the login page and redirect back to current page when auth is complete.

`customerAccount.handleUnauthorized()` is also added to run login check and redirect customer if unauthorized.

---

A few opt out is provided if this default behaviour is not ideal.

1. pass `loginUrl` during `createCustomerAccountClient` to change the default login page from `/account/login` to something else.
1. pass `unauthorizedHandler` during `createCustomerAccountClient` to change auto redirect all together
1. run `isLoggedIn` ahead of `unauthorizedHandler`, `query` or `mutate` to handle one off unauthorized behaviour
