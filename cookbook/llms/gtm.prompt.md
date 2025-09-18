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

Hydrogen includes built-in support for the Customer Privacy API, a browser-based JavaScript API that you can use to display cookie-consent banners and verify data processing permissions.

Key features:
- GTM script integration with proper CSP nonce support
- Content Security Policy configuration for GTM domains
- Analytics integration for product views via dataLayer
- Extensible dataLayer implementation for custom events
- Support for GTM's preview mode
- Customer Privacy API integration

The recipe includes:
1. Content Security Policy updates in entry.server.tsx for GTM domains
2. GTM script tags in the head and body sections
3. GoogleTagManager component that subscribes to analytics events
4. Proper nonce attributes for security compliance

## Notes

> [!NOTE]
> Replace GTM-<YOUR_GTM_ID> with your actual Google Tag Manager container ID in both script locations

> [!NOTE]
> The nonce attribute ensures compatibility with Content Security Policy

> [!NOTE]
> Additional analytics events can be added to the GoogleTagManager component by subscribing to different event types

> [!NOTE]
> Configure customer privacy settings in your Shopify admin to enable cookie consent banners

> [!NOTE]
> The CSP configuration allows GTM, Google Analytics, and related tracking domains

## Requirements

Prerequisites:
- A Google Tag Manager account and container ID
- Customer privacy settings configured in Shopify admin (for cookie consent)
- Basic understanding of GTM and dataLayer events
- Knowledge of Shopify's analytics events

To enable cookie consent:
1. Go to Shopify admin → Settings → Customer Privacy → Cookie Banner
2. Configure region visibility for the banner
3. Customize appearance and position as needed

## New files added to the template by this recipe

- app/components/GoogleTagManager.tsx

## Steps

### Step 1: README.md

Updates README with GTM-specific documentation and setup instructions

#### File: /README.md

```diff
@@ -1,6 +1,6 @@
-# Hydrogen template: Skeleton
+# Hydrogen template: Google Tag Manager (GTM)
 
-Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.
+This Hydrogen template demonstrates how to implement Google Tag Manager with analytics integration. Hydrogen supports both Shopify analytics and third-party services with built-in support for the [Customer Privacy API](https://shopify.dev/docs/api/customer-privacy).
 
 [Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
 [Get familiar with Remix](https://remix.run/docs/en/v1)
@@ -16,18 +16,67 @@ Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dov
 - Prettier
 - GraphQL generator
 - TypeScript and JavaScript flavors
-- Minimal setup of components and routes
+- **Google Tag Manager integration**
+- **Analytics.Provider setup**
+- **Customer Privacy API support**
 
 ## Getting started
 
 **Requirements:**
 
 - Node.js version 18.0.0 or higher
+- Google Tag Manager account with container ID
 
 ```bash
 npm create @shopify/hydrogen@latest
 ```
 
+## Google Tag Manager Setup
+
+### 1. Enable Customer Privacy / Cookie Consent Banner
+
+In the Shopify admin, navigate to Settings → Customer Privacy → Cookie Banner:
+
+- Configure region visibility for the banner
+- Customize banner appearance and position (optional)
+- Set up cookie preferences
+
+### 2. Configuration Requirements
+
+- [Configure customer privacy settings](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings) - Manage privacy settings to comply with data protection laws
+- [Add a cookie banner](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings#add-a-cookie-banner) - Display consent notifications for data collection
+
+### 3. Update GTM Container ID
+
+Replace `GTM-<YOUR_GTM_ID>` with your actual Google Tag Manager container ID in:
+- `app/root.tsx` - Script tags in head and body sections
+
+### 4. Content Security Policy
+
+The template includes pre-configured CSP headers for GTM domains:
+- `*.googletagmanager.com`
+- `*.google-analytics.com`
+- `*.analytics.google.com`
+
+## Key Files
+
+| File | Description |
+|------|-------------|
+| `app/components/GoogleTagManager.tsx` | Subscribes to analytics events and pushes to GTM dataLayer |
+| `app/root.tsx` | Contains GTM script tags and Analytics.Provider setup |
+| `app/entry.server.tsx` | Configured CSP headers for GTM domains |
+
+## Analytics Events
+
+The GTM component listens to Hydrogen analytics events and pushes them to the dataLayer:
+
+```tsx
+// Example: Product viewed event
+subscribe('product_viewed', () => {
+  window.dataLayer.push({event: 'viewed-product'});
+});
+```
+
 ## Building for production
 
 ```bash
@@ -42,4 +91,4 @@ npm run dev
 
 ## Setup for using Customer Account API (`/account` section)
 
-Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
+Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
\ No newline at end of file
```

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



#### File: [GoogleTagManager.tsx](https://github.com/Shopify/hydrogen/blob/147c5bdb47b2fa51d4da79cd94f5dd6c1cce2cc7/cookbook/recipes/gtm/ingredients/templates/skeleton/app/components/GoogleTagManager.tsx)

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
 
@@ -153,8 +154,32 @@ export function Layout({children}: {children?: React.ReactNode}) {
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
         {children}
         <ScrollRestoration nonce={nonce} />
         <Scripts nonce={nonce} />
@@ -177,8 +202,10 @@ export default function App() {
       consent={data.consent}
     >
       <PageLayout {...data}>
-        <Outlet />;
+        <Outlet />
       </PageLayout>
+      {/* @description Initialize Google Tag Manager analytics integration */}
+      <GoogleTagManager />
     </Analytics.Provider>
   );
 }
```

</recipe_implementation>