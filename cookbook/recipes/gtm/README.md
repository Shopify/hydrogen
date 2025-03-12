# 🧑‍🍳 Google Tag Manager (GTM) with `<Analytics.Provider>`

This folder contains an end-to-end example of how to implement Google Tag Manager for Hydrogen. Hydrogen supports both Shopify analytics, as well as third-party services.

Hydrogen includes built in support for the [Customer Privacy API](https://shopify.dev/docs/api/customer-privacy), a browser-based JavaScript API that you can use to display cookie-consent banners and verify data processing permissions.

## 🍣 Ingredients

| File | Description |
| --- | --- |
| [`app/components/GoogleTagManager.tsx`](ingredients/templates/skeleton/app/components/GoogleTagManager.tsx) | Google Tag Manager component to listen to analytics events. |

## 🍱 Steps

### 1. Requirements

- [Configure customer privacy settings](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings?shpxid=9f9c768e-AC66-497C-98D0-701334C8173E) - Configure and manage customer privacy settings within your Shopify admin to help comply with privacy and data protection laws.
- [Add a cookie banner](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings#add-a-cookie-banner) - A cookie banner is a notification displayed on a website that informs visitors about the use of cookies and asks for their consent for data collection and tracking activities.

### 2. Enable Customer Privacy / Cookie Consent Banner

In the Shopify admin, head over to / Settings / Customer Privacy / Cookie Banner.

#### 2.1. Configure the region(s) visibility for the banner

![banner-region-visibility](/templates/skeleton/public/banner-region-visibility.jpg)

#### 2.2. (Optional) Customize the appearance of the Cookie banner and Cookie preferences

![banner-appearance](/templates/skeleton/public/banner-appearance.jpg)

#### 2.3. (Optional) Customize the position of the banner

![banner-position](/templates/skeleton/public/banner-position.jpg)

### 3. Copy ingredients

Copy the ingredients from the template directory to the current directory

- `app/components/GoogleTagManager.tsx`

### 4. Update content security policy

Update security policy for Google Tag Manager.

#### File: [`app/entry.server.tsx`](/templates/skeleton/app/entry.server.tsx)

```diff
index 1480601b..6a3512bd 100644
--- a/templates/skeleton/app/entry.server.tsx
+++ b/templates/skeleton/app/entry.server.tsx
@@ -12,6 +12,23 @@ export default async function handleRequest(
   context: AppLoadContext,
 ) {
   const {nonce, header, NonceProvider} = createContentSecurityPolicy({
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
@@ -20,7 +37,7 @@ export default async function handleRequest(
 
   const body = await renderToReadableStream(
     <NonceProvider>
-      <RemixServer context={remixContext} url={request.url} nonce={nonce}/>
+      <RemixServer context={remixContext} url={request.url} nonce={nonce} />
     </NonceProvider>,
     {
       nonce,

```

### 5. Edit the root.tsx layout file

- Enable privacy banner.
- Add Google Tag Manager script.
- Add Google Tag Manager component.

#### File: [`app/root.tsx`](/templates/skeleton/app/root.tsx)

<details>

```diff
index a4f7c673..9c5c5785 100644
--- a/templates/skeleton/app/root.tsx
+++ b/templates/skeleton/app/root.tsx
@@ -1,4 +1,4 @@
-import {useNonce, getShopAnalytics, Analytics} from '@shopify/hydrogen';
+import {useNonce, getShopAnalytics, Analytics, Script} from '@shopify/hydrogen';
 import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import {
   Links,
@@ -16,6 +16,7 @@ import resetStyles from '~/styles/reset.css?url';
 import appStyles from '~/styles/app.css?url';
 import {PageLayout} from '~/components/PageLayout';
 import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
+import {GoogleTagManager} from '~/components/GoogleTagManager';
 
 export type RootLoader = typeof loader;
 
@@ -85,7 +86,8 @@ export async function loader(args: LoaderFunctionArgs) {
     consent: {
       checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
       storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
-      withPrivacyBanner: false,
+
+      withPrivacyBanner: true,
       // localize the privacy banner
       country: args.context.storefront.i18n.country,
       language: args.context.storefront.i18n.language,
@@ -154,8 +156,30 @@ export function Layout({children}: {children?: React.ReactNode}) {
         <link rel="stylesheet" href={appStyles}></link>
         <Meta />
         <Links />
+        {
+        <Script
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
+        <noscript>
+          <iframe
+            src="https://www.googletagmanager.com/ns.html?id=GTM-<YOUR_GTM_ID>"
+            height="0"
+            width="0"
+            style={{
+              display: 'none',
+              visibility: 'hidden',
+            }}
+            title="Google Tag Manager"
+          ></iframe>
+        </noscript>
         {data ? (
           <Analytics.Provider
             cart={data.cart}
@@ -163,6 +187,8 @@ export function Layout({children}: {children?: React.ReactNode}) {
             consent={data.consent}
           >
             <PageLayout {...data}>{children}</PageLayout>
+            {
+            <GoogleTagManager />
           </Analytics.Provider>
         ) : (
           children

```

</details>