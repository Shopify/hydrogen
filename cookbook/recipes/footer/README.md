# footer

This recipe lets you add a footer menu to your Hydrogen store

In this recipe you'll make the following changes:

1. Set up a footer menu in the admin
2. Modify the root layout to query for the footer menu
3. Add a <Footer /> component display the footer links
4. Display the footer inside the <PageLayout />

## Requirements

To implement a footer menu in your own store, you need to create a menu in the Shopify admin with the handle of `skeleton-footer-menu` at https://admin.shopify.com/store/YOUR_STORE_DOMAIN/content/menus

## Ingredients

_New files added to the template by this recipe._

| File | Description |
| --- | --- |
| [app/components/Footer.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/footer/ingredients/templates/skeleton/app/components/Footer.tsx) |  |

## Steps

### Step 1: Render the <Footer /> component in the <PageLayout />



#### File: [app/components/PageLayout.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/templates/skeleton/app/components/PageLayout.tsx)

```diff
index 2f602b60..c96c980e 100644
--- a/templates/skeleton/app/components/PageLayout.tsx
+++ b/templates/skeleton/app/components/PageLayout.tsx
@@ -1,7 +1,28 @@
+import {Footer} from './Footer';
+import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';
+
 interface PageLayoutProps {
+  footer: Promise<FooterQuery | null>;
+  header: HeaderQuery;
+  isLoggedIn: Promise<boolean>;
+  publicStoreDomain: string;
   children?: React.ReactNode;
 }
 
-export function PageLayout({children = null}: PageLayoutProps) {
-  return <main>{children}</main>;
+export function PageLayout({
+  children = null,
+  footer,
+  header,
+  publicStoreDomain,
+}: PageLayoutProps) {
+  return (
+    <main>
+      {children}
+      <Footer
+        footer={footer}
+        header={header}
+        publicStoreDomain={publicStoreDomain}
+      />
+    </main>
+  );
 }
```

### Step 1: Create the <Footer /> component



#### File: [Footer.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/footer/ingredients/templates/skeleton/app/components/Footer.tsx)

<details>

```tsx
import {Suspense} from 'react';
import {Await, NavLink} from 'react-router';
import type {FooterQuery, HeaderQuery} from 'storefrontapi.generated';

interface FooterProps {
  footer: Promise<FooterQuery | null>;
  publicStoreDomain: string;
}

export function Footer({
  footer: footerPromise,
  publicStoreDomain,
}: FooterProps) {
  return (
    <Suspense>
      <Await resolve={footerPromise}>
        {(footer) => (
          <footer className="footer">
            {footer?.menu && footer.shop.primaryDomain?.url && (
              <FooterMenu
                menu={footer.menu}
                primaryDomainUrl={footer.shop.primaryDomain.url}
                publicStoreDomain={publicStoreDomain}
              />
            )}
          </footer>
        )}
      </Await>
    </Suspense>
  );
}

function FooterMenu({
  menu,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  menu: FooterQuery['menu'];
  primaryDomainUrl: FooterProps['shop']['primaryDomain']['url'];
  publicStoreDomain: string;
}) {
  return (
    <nav className="footer-menu" role="navigation">
      {(menu || FALLBACK_FOOTER_MENU).items.map((item) => {
        if (!item.url) return null;
        // if the url is internal, we strip the domain
        const url =
          item.url.includes('myshopify.com') ||
          item.url.includes(publicStoreDomain) ||
          item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url;
        const isExternal = !url.startsWith('/');
        return isExternal ? (
          <a href={url} key={item.id} rel="noopener noreferrer" target="_blank">
            {item.title}
          </a>
        ) : (
          <NavLink
            end
            key={item.id}
            prefetch="intent"
            style={activeLinkStyle}
            to={url}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
  );
}

const FALLBACK_FOOTER_MENU = {
  id: 'gid://shopify/Menu/199655620664',
  items: [
    {
      id: 'gid://shopify/MenuItem/461633060920',
      resourceId: 'gid://shopify/ShopPolicy/23358046264',
      tags: [],
      title: 'Privacy Policy',
      type: 'SHOP_POLICY',
      url: '/policies/privacy-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633093688',
      resourceId: 'gid://shopify/ShopPolicy/23358013496',
      tags: [],
      title: 'Refund Policy',
      type: 'SHOP_POLICY',
      url: '/policies/refund-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633126456',
      resourceId: 'gid://shopify/ShopPolicy/23358111800',
      tags: [],
      title: 'Shipping Policy',
      type: 'SHOP_POLICY',
      url: '/policies/shipping-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633159224',
      resourceId: 'gid://shopify/ShopPolicy/23358079032',
      tags: [],
      title: 'Terms of Service',
      type: 'SHOP_POLICY',
      url: '/policies/terms-of-service',
      items: [],
    },
  ],
};

function activeLinkStyle({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) {
  return {
    fontWeight: isActive ? 'bold' : undefined,
    color: isPending ? 'grey' : 'white',
  };
}

```

</details>

### Step 2: Add the footer MENU GraphQL query



#### File: [app/lib/fragments.ts](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/templates/skeleton/app/lib/fragments.ts)

<details>

```diff
index e69de29b..02a8f975 100644
--- a/templates/skeleton/app/lib/fragments.ts
+++ b/templates/skeleton/app/lib/fragments.ts
@@ -0,0 +1,60 @@
+const MENU_FRAGMENT = `#graphql
+  fragment MenuItem on MenuItem {
+    id
+    resourceId
+    tags
+    title
+    type
+    url
+  }
+  fragment ChildMenuItem on MenuItem {
+    ...MenuItem
+  }
+  fragment ParentMenuItem on MenuItem {
+    ...MenuItem
+    items {
+      ...ChildMenuItem
+    }
+  }
+  fragment Menu on Menu {
+    id
+    items {
+      ...ParentMenuItem
+    }
+  }
+` as const;
+
+export const SHOP_FRAGMENT = `#graphql
+  fragment Shop on Shop {
+    id
+    name
+    description
+    primaryDomain {
+      url
+    }
+    brand {
+      logo {
+        image {
+          url
+        }
+      }
+    }
+  }
+`;
+
+export const FOOTER_QUERY = `#graphql
+  query Footer(
+    $country: CountryCode
+    $footerMenuHandle: String!
+    $language: LanguageCode
+  ) @inContext(language: $language, country: $country) {
+    shop {
+      ...Shop
+    }
+    menu(handle: $footerMenuHandle) {
+      ...Menu
+    }
+  }
+  ${MENU_FRAGMENT}
+  ${SHOP_FRAGMENT}
+` as const;
```

</details>

### Step 3: Asynchronously query the Footer menu at the root layout



#### File: [app/root.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/templates/skeleton/app/root.tsx)

```diff
index 543380c7..bbb2b24b 100644
--- a/templates/skeleton/app/root.tsx
+++ b/templates/skeleton/app/root.tsx
@@ -15,6 +15,7 @@ import favicon from '~/assets/favicon.svg';
 import resetStyles from '~/styles/reset.css?url';
 import appStyles from '~/styles/app.css?url';
 import {PageLayout} from '~/components/PageLayout';
+import {FOOTER_QUERY} from '~/lib/fragments';
 
 export type RootLoader = typeof loader;
 
@@ -105,10 +106,25 @@ async function loadCriticalData({context}: LoaderFunctionArgs) {
  * Make sure to not throw any errors here, as it will cause the page to 500.
  */
 function loadDeferredData({context}: LoaderFunctionArgs) {
-  const {customerAccount, cart} = context;
+  const {storefront, customerAccount, cart} = context;
+
+  // defer the footer query (below the fold)
+  const footer = storefront
+    .query(FOOTER_QUERY, {
+      cache: storefront.CacheLong(),
+      variables: {
+        footerMenuHandle: 'footer', // Adjust to your footer menu handle
+      },
+    })
+    .catch((error) => {
+      // Log query errors, but don't throw them so the page can still render
+      console.error(error);
+      return null;
+    });
   return {
     cart: cart.get(),
     isLoggedIn: customerAccount.isLoggedIn(),
+    footer,
   };
 }
```