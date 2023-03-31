---
'@shopify/hydrogen': patch
---

Adopt `v2_routeConvention` future flag

### `v2_routeConventions` migration steps

Remix v2 route conventions are just file renames. We just need to ensure when changing file name and file location, the import paths of other files are also updated.

Here is an example list of file renames for the demo store:

```txt
Original                                  New
============================================================================================================
routes/                                   routes/
  [robots.txt].tsx                          [robots.txt].tsx
  [sitemap.xml].tsx                         [sitemap.xml].tsx

  ($lang)/
    index.tsx                               _index.tsx
    featured-products.tsx                   ($lang).featured-products.tsx
    api/products.tsx                        ($lang).api.products.tsx
    api/countries.tsx                       api.countries.tsx
    $.tsx                                   $.tsx
    $shopid/orders/$token/authenticate.tsx  ($lang).$shopid.orders.$token.authenticate.tsx
    discount.$code.tsx                      ($lang).discount.$code.tsx
    search.tsx                              ($lang).search.tsx
    policies/index.tsx                      ($lang).policies._index.tsx
    policies/$policyHandle.tsx              ($lang).policies.$policyHandle.tsx
    products/index.tsx                      ($lang).products._index.tsx
    products/$productHandle.tsx             ($lang).products.$productHandle.tsx
    collections/index.tsx                   ($lang).collections._index.tsx
    collections/all.tsx                     ($lang).collections.all.tsx
    collections/$collectionHandle.tsx       ($lang).collections.$collectionHandle.tsx
    pages/$pageHandle.tsx                   ($lang).pages.$pageHandle.tsx
    journal/index.tsx                       ($lang).journal._index.tsx
    journal/$journalHandle.tsx              ($lang).journal.$journalHandle.tsx

    account                                               ($lang).account.tsx
    account/__public/login.tsx                            ($lang).account.login.tsx
    account/__public/register.tsx                         ($lang).account.register.tsx
    account/__public/recover.tsx                          ($lang).account.recover.tsx
    account/__public/reset.$id.$resetToken.tsx            ($lang).account.reset.$id.$resetToken.tsx
    account/__public/activate.$id.$activationToken.tsx    ($lang).account.activate.$id.$activationToken.tsx
    account/__private/edit.tsx                            ($lang).account.edit.tsx
    account/__private/logout.tsx                          ($lang).account.logout.ts
    account/__private/orders.$id.tsx                      ($lang).account.orders.$id.tsx
    account/__private/address/$id.tsx                     ($lang).account.address.$id.tsx
```
