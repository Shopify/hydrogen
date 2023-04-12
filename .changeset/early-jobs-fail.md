---
'demo-store': patch
---

Adopt `v2_routeConvention` future flag

## `v2_routeConventions` migration steps

Remix v2 route conventions are just file renames. We just need to ensure when changing file name and file location, the import paths of other files are also updated.

Go to Remix docs for more details on the [V2 route convention](https://remix.run/docs/en/main/file-conventions/route-files-v2).

Rename and move the following files in the `routes` folder to adopt to V2 route convention.

<table>
<tr>
<th>Before</th>
<th>After (V2 route convention)</th>
</tr>
<tr>
<td>

```txt
app/routes/
  ├─ [sitemap.xml].tsx
  ├─ [robots.txt].tsx
  └─ ($lang)/
      ├─ $shopid/orders/$token/
      │   └─ authenticate.tsx
      ├─ account/
      │   ├─ __private/
      │   │   ├─ address/
      │   │   │   └─ $id.tsx
      │   │   ├─ orders.$id.tsx
      │   │   ├─ edit.tsx
      │   │   └─ logout.ts
      │   └─ __public/
      │       ├─ recover.tsx
      │       ├─ login.tsx
      │       ├─ register.tsx
      │       ├─ activate.$id.$activationToken.tsx
      │       └─ reset.$id.$resetToken.tsx
      ├─ api/
      │   ├─ countries.tsx
      │   └─ products.tsx
      ├─ collections/
      │   ├─ index.tsx
      │   ├─ $collectionHandle.tsx
      │   └─ all.tsx
      ├─ journal/
      │   ├─ index.tsx
      │   └─ $journalHandle.tsx
      ├─ pages
      │   └─ $pageHandle.tsx
      ├─ policies/
      │   ├─ index.tsx
      │   └─ $policyHandle.tsx
      ├─ products/
      │   ├─ index.tsx
      │   └─ $productHandle.tsx
      ├─ $.tsx
      ├─ account.tsx
      ├─ cart.tsx
      ├─ cart.$lines.tsx
      ├─ discount.$code.tsx
      ├─ featured-products.tsx
      ├─ index.tsx
      └─ search.tsx
```

</td>
<td valign="top">

```txt
app/routes/
  ├─ [sitemap.xml].tsx
  ├─ [robots.txt].tsx
  ├─ ($lang).$shopid.orders.$token.authenticate.tsx
  ├─ ($lang).account.address.$id.tsx
  ├─ ($lang).account.orders.$id.tsx
  ├─ ($lang).account.edit.tsx
  ├─ ($lang).account.logout.ts
  ├─ ($lang).account.recover.tsx
  ├─ ($lang).account.login.tsx
  ├─ ($lang).account.register.tsx
  ├─ ($lang).account.activate.$id.$activationToken.tsx
  ├─ ($lang).account.reset.$id.$resetToken.tsx
  ├─ ($lang).api.countries.tsx
  ├─ ($lang).api.products.tsx
  ├─ ($lang).collections._index.tsx
  ├─ ($lang).collections.$collectionHandle.tsx
  ├─ ($lang).collections.all.tsx
  ├─ ($lang).journal._index.tsx
  ├─ ($lang).journal.$journalHandle.tsx
  ├─ ($lang).pages.$pageHandle.tsx
  ├─ ($lang).policies._index.tsx
  ├─ ($lang).policies.$policyHandle.tsx
  ├─ ($lang).products._index.tsx
  ├─ ($lang).products.$productHandle.tsx
  ├─ $.tsx
  ├─ ($lang)._index.tsx
  ├─ ($lang).account.tsx
  ├─ ($lang).cart.tsx
  ├─ ($lang).cart.$lines.tsx
  ├─ ($lang).discount.$code.tsx
  ├─ ($lang).featured-products.tsx
  └─ ($lang).search.tsx
```

</td>
</tr>
</table>

### Optional

If you want to continue using nested folder routes but have the `v2_routeConvention` flag turned on, you may consider using the npm package [`@remix-run/v1-route-convention`](https://www.npmjs.com/package/@remix-run/v1-route-convention).

If you like the flat route convention but still wants a hybrid style of nested route folder, you may consider using the npm package [`remix-flat-routes`](https://www.npmjs.com/package/remix-flat-routes)
