---
'skeleton': major
---

The Storefront API 2023-10 made changes in menu links. The skeleton template requires changes:

1. Update the `HeaderMenu` component to accept a `primaryDomainUrl` and include
   it in the internal url check

```diff
// app/components/Header.tsx

+ import type {HeaderQuery} from 'storefrontapi.generated';

export function HeaderMenu({
  menu,
+  primaryDomainUrl,
  viewport,
}: {
  menu: HeaderProps['header']['menu'];
+  primaryDomainUrl: HeaderQuery['shop']['primaryDomain']['url'];
  viewport: Viewport;
}) {

  // ...code

  // if the url is internal, we strip the domain
  const url =
    item.url.includes('myshopify.com') ||
    item.url.includes(publicStoreDomain) ||
+   item.url.includes(primaryDomainUrl)
      ? new URL(item.url).pathname
      : item.url;

   // ...code

}
```

2. Update the `FooterMenu` component to accept a `primaryDomainUrl` prop and include
   it in the internal url check

```diff
// app/components/Footer.tsx

- import type {FooterQuery} from 'storefrontapi.generated';
+ import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';

function FooterMenu({
  menu,
+  primaryDomainUrl,
}: {
  menu: FooterQuery['menu'];
+  primaryDomainUrl: HeaderQuery['shop']['primaryDomain']['url'];
}) {
  // code...

  // if the url is internal, we strip the domain
  const url =
    item.url.includes('myshopify.com') ||
    item.url.includes(publicStoreDomain) ||
+   item.url.includes(primaryDomainUrl)
      ? new URL(item.url).pathname
      : item.url;

   // ...code

  );
}
```

3. Update the `Footer` component to accept a `shop` prop

```diff
export function Footer({
  menu,
+ shop,
}: FooterQuery & {shop: HeaderQuery['shop']}) {
  return (
    <footer className="footer">
-      <FooterMenu menu={menu} />
+      <FooterMenu menu={menu} primaryDomainUrl={shop.primaryDomain.url} />
    </footer>
  );
}
```

4. Update `Layout.tsx` to pass the `shop` prop

```diff
export function Layout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
}: LayoutProps) {
  return (
    <>
      <CartAside cart={cart} />
      <SearchAside />
      <MobileMenuAside menu={header.menu} shop={header.shop} />
      <Header header={header} cart={cart} isLoggedIn={isLoggedIn} />
      <main>{children}</main>
      <Suspense>
        <Await resolve={footer}>
-          {(footer) => <Footer menu={footer.menu}  />}
+          {(footer) => <Footer menu={footer.menu} shop={header.shop} />}
        </Await>
      </Suspense>
    </>
  );
}
```
