# Overview

This prompt describes how to implement "footer" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.
If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.
If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.
Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# AI model verification steps

- Never edit generated files (ending with .d.ts) directly; instead, run the `npm run codegen` command to update them (if the command is available).

# Summary



# User Intent Recognition

<user_queries>

</user_queries>

# Troubleshooting

<troubleshooting>

</troubleshooting>

# Recipe Implementation

Here's the footer recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description



## New files added to the template by this recipe

- app/components/Footer.tsx

## Steps

### Step 1: app/components/PageLayout.tsx



#### File: /app/components/PageLayout.tsx

```diff
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

### Step 1: app/components/Footer.tsx



#### File: [Footer.tsx](https://github.com/Shopify/hydrogen/blob/3dbbb1ee554d96261a2249d8126c8afd11e7ad47/cookbook/recipes/footer/ingredients/templates/skeleton/app/components/Footer.tsx)

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

### Step 2: app/lib/fragments.ts



#### File: /app/lib/fragments.ts

```diff
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

### Step 3: app/root.tsx



#### File: /app/root.tsx

```diff
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

</recipe_implementation>