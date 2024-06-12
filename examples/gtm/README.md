# Hydrogen example: Google Tag Manager (GTM) with `<Analytics.Provider>`

This folder contains an end-to-end example of how to implement Google Tag Manager for Hydrogen. Hydrogen supports both Shopify analytics, as well as third-party services.

Hydrogen includes built in support for the [Customer Privacy API](https://shopify.dev/docs/api/customer-privacy), a browser-based JavaScript API that you can use to display cookie-consent banners and verify data processing permissions.

## Requirements

- [Configure customer privacy settings](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings?shpxid=9f9c768e-AC66-497C-98D0-701334C8173E) - Configure and manage customer privacy settings within your Shopify admin to help comply with privacy and data protection laws.
- [Add a cookie banner](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings#add-a-cookie-banner) - A cookie banner is a notification displayed on a website that informs visitors about the use of cookies and asks for their consent for data collection and tracking activities.

## Install

Set up a new project with this example:

```bash
npm create @shopify/hydrogen@latest -- --template gtm
```

## Key files

The following files have been added (🆕) or changed from the default Hydration template:

| File                                                                                              | Description   |
| ------------------------------------------------------------------------------------------------- | -----------------------------------------------------------------------------------|
| 🆕 [`app/components/GoogleTagManager.tsx`](app/components/GoogleTagManager.tsx)                   | A example of how to subscribe analytics events and can be used to push events to Google Tag Manager. |
| [`app/root.tsx`](app/root.tsx)                                                                    | Updated the root layout with Google Tag Manager scripts |
| [`app/entry.server.tsx`](app/entry.server.tsx)                                                    | Updated the `createContentSecurityPolicy` to include content security policies for Google Tag Manager |

## Instructions

### 1. Enable Customer Privacy / Cookie Consent Banner

In the Shopify admin, head over to / Settings / Customer Privacy / Cookie Banner

#### 1.1 Configure the region(s) visibility for the banner

![banner-region-visibility](https://github.com/Shopify/hydrogen/assets/2319002/f2b961f0-1218-4557-95e5-a99045a96211)

#### 1.2 (Optional) Customize the appearance of the Cookie banner and Cookie preferences

![banner-appearance](https://github.com/Shopify/hydrogen/assets/2319002/42646348-4063-4942-9cb1-ce3a91dc048a)

#### 1.3 (Optional) Customize the position of the banner

![banner-position](https://github.com/Shopify/hydrogen/assets/2319002/2aaeab20-ccee-48a0-8a57-054f9a6ef3d7)

## 2. Update Content Security Policy

Add the required content security policies for Google Tag Manager.

```diff
//...other code

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
+  context: AppLoadContext,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    }
+    scriptSrc: [
+      "'self'",
+      'https://cdn.shopify.com',
+      'https://*.googletagmanager.com'
+    ],
+    imgSrc: [
+      "'self'",
+      'https://cdn.shopify.com',
+      'https://*.google-analytics.com',
+      'https://*.googletagmanager.com'
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
    }
  });

  //...other code
}
```

[View the complete component file](app/entry.server.tsx) to see these updates in context.

### 2. Create a GoogleTagManager component to listen to analytics events

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
  }, []);

  return null;
}
```

[View the complete component file](app/components/GoogleTagManager.tsx) to see these updates in context.

### 3. Edit the `root.tsx` layout file

#### 3.1 Import the `GoogleTagManager` component

```diff
+ import {GoogleTagManager} from '~/components/GoogleTagManager'
```


#### 3.2 Add the script snippet of your tag for `<head>` and `<body>`

Make sure that `GTM-<YOUR_GTM_ID>` is updated to your GTM tag id.

```diff
import {
  Analytics,
  useNonce,
  getShopAnalytics,
+  Script,
} from '@shopify/hydrogen';

...

export default function App() {
  const nonce = useNonce();
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
+        <Script dangerouslySetInnerHTML={{
+          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
+            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
+            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
+            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
+            })(window,document,'script','dataLayer','GTM-<YOUR_GTM_ID>');`,
+        }}></Script>
      <body>
+        <noscript>
+          <iframe
+            src="https://www.googletagmanager.com/ns.html?id=GTM-<YOUR_GTM_ID>"
+            height="0"
+            width="0"
+            style={{
+              display: 'none',
+              visibility: 'hidden'
+            }}
+          ></iframe>
+        </noscript>
        <Analytics.Provider
```

#### 3.3 Add the `GoogleTagManager` component to listen to events

```diff
export default function App() {
  const nonce = useNonce();
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Analytics.Provider
          cart={data.cart}
          shop={data.shop}
          consent={data.consent}
        >
          <Layout {...data}>
            <Outlet />
          </Layout>
+         <GoogleTagManager />
        </Analytics.Provider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}
```

[View the complete component file](app/root.tsx) to see these updates in context.
