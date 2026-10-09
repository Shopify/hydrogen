# Google Tag Manager integration in Hydrogen

This recipe integrates Google Tag Manager (GTM) into your Hydrogen storefront, enabling you to track user interactions, ecommerce events, and implement marketing tags without modifying code.

Hydrogen includes built-in support for the Customer Privacy API, a browser-based JavaScript API that you can use to display cookie-consent banners and verify data processing permissions.

Key features:
- GTM script integration with proper CSP nonce support
- Content Security Policy configuration for GTM domains
- Analytics integration for product views via dataLayer
- Extensible dataLayer implementation for custom events
- Support for GTM's preview mode
- Customer Privacy API integration
- Support for various analytics events by subscribing to event types using the GoogleTagManager component

The recipe includes:
1. Content Security Policy updates in entry.server.tsx for GTM domains
2. GTM script tags in the head and body sections
3. GoogleTagManager component that subscribes to analytics events
4. Proper nonce attributes for security compliance and compatibility with the Content Security Policy

> [!NOTE]
> Replace `GTM-<YOUR_GTM_ID>` with your actual Google Tag Manager container ID in both script locations

## Requirements

Prerequisites:
- A Google Tag Manager account and container ID
- Customer privacy settings configured in your Shopify admin (for cookie consent)
- Basic understanding of GTM and dataLayer events
- Knowledge of Shopify's analytics events

To enable cookie consent:
1. In your Shopify admin, go to **Settings** → **Customer Privacy** → **Cookie Banner**.
2. Configure region visibility for the cookie banner.
3. Customize the banner's appearance and position as needed.

## Ingredients

_New files added to the template by this recipe._

| File | Description |
| --- | --- |
| [app/components/GoogleTagManager.tsx](https://github.com/Shopify/hydrogen/blob/a99adac243e092fb19161c5c8e8143ec5f96bbbf/cookbook/recipes/gtm/ingredients/templates/skeleton/app/components/GoogleTagManager.tsx) | Analytics component that subscribes to Hydrogen events and pushes them to GTM's dataLayer |

## Steps

### Step 1: Document GTM setup in the README

Update the README file with GTM-specific documentation and setup instructions.

#### File: [README.md](https://github.com/Shopify/hydrogen/blob/a99adac243e092fb19161c5c8e8143ec5f96bbbf/templates/skeleton/README.md)

<details>

~~~diff
index d4701706..4c928ece 100644
--- a/templates/skeleton/README.md
+++ b/templates/skeleton/README.md
@@ -1,6 +1,6 @@
-# Hydrogen template: Skeleton
+# Hydrogen template: Google Tag Manager (GTM)
 
-Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [React Router](https://reactrouter.com/), the modern multi-strategy router for React. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.
+This Hydrogen template demonstrates how to implement Google Tag Manager with analytics integration. Hydrogen supports both Shopify analytics and third-party services with built-in support for the [Customer Privacy API](https://shopify.dev/docs/api/customer-privacy).
 
 [Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
 [Get familiar with React Router](https://reactrouter.com/start/framework/routing)
@@ -16,18 +16,66 @@ Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dov
 - Prettier
 - GraphQL generator
 - TypeScript and JavaScript flavors
-- Minimal setup of components and routes
+- **Google Tag Manager integration**
+- **Analytics.Provider setup**
+- **Customer Privacy API support**
 
 ## Getting started
 
 **Requirements:**
 
-- Node.js version 22.x or 24.x
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
~~~

</details>

### Step 2: Add GTM domains to Content Security Policy

Configure CSP headers to allow Google Tag Manager and Analytics scripts.

#### File: [app/entry.server.tsx](https://github.com/Shopify/hydrogen/blob/a99adac243e092fb19161c5c8e8143ec5f96bbbf/templates/skeleton/app/entry.server.tsx)

~~~diff
index 6f5c4abf..b8eb74f4 100644
--- a/templates/skeleton/app/entry.server.tsx
+++ b/templates/skeleton/app/entry.server.tsx
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
~~~

### Step 3: Create the analytics component

Build a component that subscribes to Hydrogen analytics events and pushes them to GTM's dataLayer.

#### File: [GoogleTagManager.tsx](https://github.com/Shopify/hydrogen/blob/a99adac243e092fb19161c5c8e8143ec5f96bbbf/cookbook/recipes/gtm/ingredients/templates/skeleton/app/components/GoogleTagManager.tsx)

<details>

~~~tsx
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
~~~

</details>

### Step 4: Add GTM scripts to the app

Insert Google Tag Manager tracking code in the head and body sections.

#### File: [app/root.tsx](https://github.com/Shopify/hydrogen/blob/a99adac243e092fb19161c5c8e8143ec5f96bbbf/templates/skeleton/app/root.tsx)

<details>

~~~diff
index df87425c..aa25c6d7 100644
--- a/templates/skeleton/app/root.tsx
+++ b/templates/skeleton/app/root.tsx
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
@@ -179,6 +204,8 @@ export default function App() {
       <PageLayout {...data}>
         <Outlet />
       </PageLayout>
+      {/* @description Initialize Google Tag Manager analytics integration */}
+      <GoogleTagManager />
     </Analytics.Provider>
   );
 }
~~~

</details>

### Step 4: package.json



#### File: [package.json](https://github.com/Shopify/hydrogen/blob/a99adac243e092fb19161c5c8e8143ec5f96bbbf/templates/skeleton/package.json)

~~~diff
index 1a438632..dd657f97 100644
--- a/templates/skeleton/package.json
+++ b/templates/skeleton/package.json
@@ -14,12 +14,12 @@
   },
   "prettier": "@shopify/prettier-config",
   "dependencies": {
-    "@shopify/hydrogen": "workspace:*",
+    "@shopify/hydrogen": "2026.4.7",
     "graphql": "^16.10.0",
     "graphql-tag": "^2.12.6",
     "isbot": "^5.1.22",
-    "react": "catalog:",
-    "react-dom": "catalog:",
+    "react": "^18.3.1",
+    "react-dom": "^18.3.1",
     "react-router": "7.16.0",
     "react-router-dom": "7.16.0"
   },
@@ -31,14 +31,14 @@
     "@react-router/dev": "7.16.0",
     "@react-router/fs-routes": "7.16.0",
     "@shopify/cli": "3.93.2",
-    "@shopify/hydrogen-codegen": "workspace:*",
+    "@shopify/hydrogen-codegen": "0.3.3",
     "@shopify/mini-oxygen": "4.2.3",
     "@shopify/oxygen-workers-types": "^4.1.6",
-    "@shopify/prettier-config": "catalog:",
+    "@shopify/prettier-config": "^1.1.2",
     "@total-typescript/ts-reset": "^0.6.1",
     "@types/eslint": "^9.6.1",
-    "@types/react": "catalog:",
-    "@types/react-dom": "catalog:",
+    "@types/react": "^18.3.28",
+    "@types/react-dom": "^18.3.7",
     "@typescript-eslint/eslint-plugin": "^8.21.0",
     "@typescript-eslint/parser": "^8.21.0",
     "eslint": "^9.18.0",
~~~

## Next steps

After applying this recipe:

1. Replace `GTM-<YOUR_GTM_ID>` with your actual container ID in app/root.tsx (2 locations).

2. Configure GTM in your Google Tag Manager dashboard:
   - Set up tags for Google Analytics 4 or other tracking services
   - Create triggers for the `viewed-product` custom event
   - Configure ecommerce data layer variables

3. Extend the GoogleTagManager component to track additional events:
   - cart_updated
   - collection_viewed
   - search_performed
   - checkout_started

4. Test your implementation:
   - Use GTM Preview mode to verify tags are firing
   - Check browser console for dataLayer pushes
   - Verify CSP is not blocking any GTM resources

5. Enable customer privacy settings for GDPR compliance in your Shopify admin.