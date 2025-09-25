# Google Tag Manager Integration

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

## Ingredients

_New files added to the template by this recipe._

| File | Description |
| --- | --- |
| [app/components/GoogleTagManager.tsx](https://github.com/Shopify/hydrogen/blob/1f9640d5acfd505435862b8b2317343bbce96d72/cookbook/recipes/gtm/ingredients/templates/skeleton/app/components/GoogleTagManager.tsx) |  |

## Steps

### Step 1: app/entry.server.tsx



#### File: [app/entry.server.tsx](https://github.com/Shopify/hydrogen/blob/1f9640d5acfd505435862b8b2317343bbce96d72/templates/skeleton/app/entry.server.tsx)

```diff
index 6f5c4abfc..b8eb74f4b 100644
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
```

### Step 1: app/components/GoogleTagManager.tsx



#### File: [GoogleTagManager.tsx](https://github.com/Shopify/hydrogen/blob/1f9640d5acfd505435862b8b2317343bbce96d72/cookbook/recipes/gtm/ingredients/templates/skeleton/app/components/GoogleTagManager.tsx)

<details>

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

</details>

### Step 2: app/root.tsx



#### File: [app/root.tsx](https://github.com/Shopify/hydrogen/blob/1f9640d5acfd505435862b8b2317343bbce96d72/templates/skeleton/app/root.tsx)

<details>

```diff
index 6fdeb1b26..090d951eb 100644
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

</details>

## Next steps

After applying this recipe:

1. Replace GTM-<YOUR_GTM_ID> with your actual container ID in app/root.tsx (2 locations)

2. Configure GTM in your Google Tag Manager dashboard:
   - Set up tags for Google Analytics 4 or other tracking services
   - Create triggers for the 'viewed-product' custom event
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

5. Enable customer privacy settings in Shopify admin for GDPR compliance