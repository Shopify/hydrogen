---
'@shopify/hydrogen': patch
---

B2B methods and props are now stable. Warnings are in place for unstable usages and will be removed completely in the next major version.

1. Search for anywhere using `UNSTABLE_getBuyer` and `UNSTABLE_setBuyer` is update accordingly.

    ```diff
    - customerAccount.UNSTABLE_getBuyer();
    + customerAccount.getBuyer()

    - customerAccount.UNSTABLE_setBuyer({
    + customerAccount.setBuyer({
        companyLocationId,
      });
    ```

2. Update `createHydrogenContext` to remove the `unstableB2b` option

    ```diff
      const hydrogenContext = createHydrogenContext({
        env,
        request,
        cache,
        waitUntil,
        session,
        i18n: {language: 'EN', country: 'US'},
    -    customerAccount: {
    -      unstableB2b: true,
    -    },
        cart: {
          queryFragment: CART_QUERY_FRAGMENT,
        },
      });
    ```
