# Overview

This prompt describes how to implement "header" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
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

Here's the header recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description



## New files added to the template by this recipe



## Steps

### Step 1: app/components/PageLayout.tsx



#### File: /app/components/PageLayout.tsx

```diff
@@ -1,7 +1,56 @@
+import type {CartApiQueryFragment, HeaderQuery} from 'storefrontapi.generated';
+import {Header, HeaderMenu} from '~/components/Header';
+import {Aside} from '~/components/Aside';
+
 interface PageLayoutProps {
+  cart: Promise<CartApiQueryFragment | null>;
+  header: HeaderQuery;
+  isLoggedIn: Promise<boolean>;
+  publicStoreDomain: string;
   children?: React.ReactNode;
 }
 
-export function PageLayout({children = null}: PageLayoutProps) {
-  return <main>{children}</main>;
+export function PageLayout({
+  cart,
+  children = null,
+  header,
+  isLoggedIn,
+  publicStoreDomain,
+}: PageLayoutProps) {
+  return (
+    <Aside.Provider>
+      <MobileMenuAside header={header} publicStoreDomain={publicStoreDomain} />
+      {header && (
+        <Header
+          header={header}
+          cart={cart}
+          isLoggedIn={isLoggedIn}
+          publicStoreDomain={publicStoreDomain}
+        />
+      )}
+      <main>{children}</main>
+    </Aside.Provider>
+  );
+}
+
+function MobileMenuAside({
+  header,
+  publicStoreDomain,
+}: {
+  header: PageLayoutProps['header'];
+  publicStoreDomain: PageLayoutProps['publicStoreDomain'];
+}) {
+  return (
+    header?.menu &&
+    header?.shop?.primaryDomain?.url && (
+      <Aside type="mobile" heading="MENU">
+        <HeaderMenu
+          menu={header.menu}
+          viewport="mobile"
+          primaryDomainUrl={header.shop.primaryDomain.url}
+          publicStoreDomain={publicStoreDomain}
+        />
+      </Aside>
+    )
+  );
 }
```

### Step 2: app/lib/fragments.ts



#### File: /app/lib/fragments.ts

```diff
@@ -0,0 +1,56 @@
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
+export const HEADER_QUERY = `#graphql
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
+  query Header(
+    $country: CountryCode
+    $headerMenuHandle: String!
+    $language: LanguageCode
+  ) @inContext(language: $language, country: $country) {
+    shop {
+      ...Shop
+    }
+    menu(handle: $headerMenuHandle) {
+      ...Menu
+    }
+  }
+  ${MENU_FRAGMENT}
+` as const;
```

### Step 3: app/root.tsx



#### File: /app/root.tsx

```diff
@@ -1,4 +1,4 @@
-import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
+import {getShopAnalytics, useNonce} from '@shopify/hydrogen';
 import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import {
   Outlet,
@@ -15,6 +15,7 @@ import favicon from '~/assets/favicon.svg';
 import resetStyles from '~/styles/reset.css?url';
 import appStyles from '~/styles/app.css?url';
 import {PageLayout} from '~/components/PageLayout';
+import {HEADER_QUERY} from '~/lib/fragments';
 
 export type RootLoader = typeof loader;
 
@@ -74,6 +75,7 @@ export async function loader(args: LoaderFunctionArgs) {
   const {storefront, env} = args.context;
 
   return {
+    ...criticalData,
     ...deferredData,
     publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
     shop: getShopAnalytics({
@@ -96,7 +98,19 @@ export async function loader(args: LoaderFunctionArgs) {
  * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
  */
 async function loadCriticalData({context}: LoaderFunctionArgs) {
-  return {};
+  const {storefront} = context;
+
+  const [header] = await Promise.all([
+    storefront.query(HEADER_QUERY, {
+      cache: storefront.CacheLong(),
+      variables: {
+        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
+      },
+    }),
+    // Add other queries here, so that they are loaded in parallel
+  ]);
+
+  return {header};
 }
 
 /**
```

</recipe_implementation>