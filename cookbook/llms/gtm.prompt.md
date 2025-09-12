# Overview

This prompt describes how to implement "Google Tag Manager Integration" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.
If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.
If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.
Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# AI model verification steps

- Never edit generated files (ending with .d.ts) directly; instead, run the `npm run codegen` command to update them (if the command is available).

# Summary

Add Google Tag Manager to your Hydrogen storefront for advanced analytics and marketing tracking

# User Intent Recognition

<user_queries>

</user_queries>

# Troubleshooting

<troubleshooting>

</troubleshooting>

# Recipe Implementation

Here's the gtm recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description

This recipe integrates Google Tag Manager (GTM) into your Hydrogen storefront, enabling you to track user interactions, ecommerce events, and implement marketing tags without modifying code.

Key features:
- GTM script integration with proper CSP nonce support
- Analytics integration for product views
- Extensible dataLayer implementation
- Support for GTM's preview mode

## Notes

> [!NOTE]
> Replace GTM-<YOUR_GTM_ID> with your actual Google Tag Manager container ID

> [!NOTE]
> The nonce attribute ensures compatibility with Content Security Policy

> [!NOTE]
> Additional analytics events can be added to the GoogleTagManager component

## Requirements

- A Google Tag Manager account and container ID
- Basic understanding of GTM and dataLayer events
- Knowledge of Shopify's analytics events

## New files added to the template by this recipe

- app/components/GoogleTagManager.tsx

## Steps

### Step 1: app/entry.server.tsx



#### File: /app/entry.server.tsx

```diff
@@ -15,6 +15,24 @@ export default async function handleRequest(
   context: HydrogenRouterContextProvider,
 ) {
   const {nonce, header, NonceProvider} = createContentSecurityPolicy({
+    /* @description Add Google Tag Manager domains to Content Security Policy */
+    scriptSrc: [
+      "'self'",
+      'https://cdn.shopify.com',
+      'https://*.googletagmanager.com',
+    ],
+    imgSrc: [
+      "'self'",
+      'https://cdn.shopify.com',
+      'https://*.google-analytics.com',
+      'https://*.googletagmanager.com',
+    ],
+    connectSrc: [
+      "'self'",
+      'https://*.google-analytics.com',
+      'https://*.analytics.google.com',
+      'https://*.googletagmanager.com',
+    ],
     shop: {
       checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
       storeDomain: context.env.PUBLIC_STORE_DOMAIN,
```

### Step 1: app/components/GoogleTagManager.tsx



#### File: [GoogleTagManager.tsx](https://github.com/Shopify/hydrogen/blob/1f9640d5acfd505435862b8b2317343bbce96d72/cookbook/recipes/gtm/ingredients/templates/skeleton/app/components/GoogleTagManager.tsx)

```tsx
import {useAnalytics} from '@shopify/hydrogen';
import {useEffect} from 'react';

declare global {
  interface Window {
    dataLayer: any[];
  }
}

export function GoogleTagManager() {
  const {subscribe, register} = useAnalytics();
  const {ready} = register('Google Tag Manager');

  useEffect(() => {
    subscribe('product_viewed', () => {
      // Triggering a custom event in GTM when a product is viewed
      window.dataLayer.push({'event': 'viewed-product'});
    });

    ready();
  }, [ready, subscribe]);

  return null;
}
```

### Step 2: app/root.tsx



#### File: /app/root.tsx

```diff
@@ -1,4 +1,4 @@
-import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
+import {Analytics, getShopAnalytics, useNonce, Script} from '@shopify/hydrogen';
 import {
   Outlet,
   useRouteError,
@@ -16,6 +16,7 @@ import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
 import resetStyles from '~/styles/reset.css?url';
 import appStyles from '~/styles/app.css?url';
 import {PageLayout} from './components/PageLayout';
+import {GoogleTagManager} from '~/components/GoogleTagManager';
 
 export type RootLoader = typeof loader;
 
@@ -154,8 +155,32 @@ export function Layout({children}: {children?: React.ReactNode}) {
         <link rel="stylesheet" href={appStyles}></link>
         <Meta />
         <Links />
+        {/* @description Add Google Tag Manager script to head */}
+        <Script
+          nonce={nonce}
+          dangerouslySetInnerHTML={{
+            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
+            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
+            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
+            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
+            })(window,document,'script','dataLayer','GTM-<YOUR_GTM_ID>');`,
+          }}
+        ></Script>
       </head>
       <body>
+        {/* @description Add Google Tag Manager noscript iframe for users without JavaScript */}
+        <noscript>
+          <iframe
+            title="Google Tag Manager"
+            src="https://www.googletagmanager.com/ns.html?id=GTM-<YOUR_GTM_ID>"
+            height="0"
+            width="0"
+            style={{
+              display: 'none',
+              visibility: 'hidden',
+            }}
+          ></iframe>
+        </noscript>
         {data ? (
           <Analytics.Provider
             cart={data.cart}
@@ -163,6 +188,8 @@ export function Layout({children}: {children?: React.ReactNode}) {
             consent={data.consent}
           >
             <PageLayout {...data}>{children}</PageLayout>
+            {/* @description Initialize Google Tag Manager analytics integration */}
+            <GoogleTagManager />
           </Analytics.Provider>
         ) : (
           children
```

</recipe_implementation>