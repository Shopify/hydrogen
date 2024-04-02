# Hydrogen example: Shopify Analytics & Consent

This folder contains an end-to-end example including first (Shopify) and third-party analytics instrumentation events and consent management leveraging the [Customer Privacy API](https://shopify.dev/docs/api/customer-privacy).

The Customer Privacy API is a browser-based, JavaScript API that you can use to verify data processing permissions or build a cookie consent banner.

## Requirements

- [Configuring customer privacy settings](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings?shpxid=9f9c768e-AC66-497C-98D0-701334C8173E) - You can configure and manage customer privacy settings within your Shopify admin to help comply with privacy and data protection laws.
- [Add a cookie Banner](https://help.shopify.com/en/manual/privacy-and-security/privacy/customer-privacy-settings/privacy-settings#add-a-cookie-banner) - A cookie banner is a notification displayed on a website that informs visitors about the use of cookies and asks for their consent for data collection and tracking activities.

## Install

Setup a new project with this example:

```bash
npm create @shopify/hydrogen@latest -- --template analytics
```

## Key files

The following files have been added (🆕) or changed from the default Hydration template:

| File                                                                                              | Description   |
| ------------------------------------------------------------------------------------------------- | -----------------------------------------------------------------------------------|
| 🆕 [`.env.example`](.env.example)                                                                 | Example environment variable file. Adds a new required env variable `PUBLIC_CHECKOUT_DOMAIN`
| 🆕 [`app/components/CustomAnalytics.tsx`](app/components/CustomAnalytics.tsx)                     | A component that subscribes to all default analytics events and can be used to publish events to third-party services.
| [`env.d.ts`](/env.d.ts)                                                                    |  Updated `Env` interface to include `PUBLIC_CHECKOUT_DOMAIN`. Required for TypeScript only.
| [`app/root.tsx`](app/root.tsx)                                                                    | Updated the root layout with the `Analytics` provider and `getShopAnalytics` |
| [`app/entry.server.tsx`](app/entry.server.tsx)                                                  | Updated the `createContentSecurityPolicy` with `checkoutDomain` and `storeDomain` properties

## Instructions

### 1. Enable Customer Privacy / Cookie Consent Banner

In the Shopify admin, head over to / Settings / Customer Privacy / Cookie Banner

#### 1.1 Configure the region(s) visibility for the banner

<img src="/public/banner-region-visibility.jpeg">

#### 1.2 (Optional) Customize the appearance of the Cookie banner and Cookie preferences

<img src="/public/banner-appearance.jpeg">

#### 1.3 (Optional) Customize the position of the banner

<img src="/public/banner-position.jpeg">

### 2. Copy over the new files

- In your Hydrogen app, create the new files from the file list above, copying in the code as you go.
- If you already have a `.env` file, copy over these key-value pairs:
  - `PUBLIC_CHECKOUT_DOMAIN` - e.g `checkout.hydrogen.shop`

### 3. Edit the `root.tsx` layout file

#### 3.1 Import the required hydrogen `Analytics` component and `getShopAnalytics` utility

```diff
import {
  useNonce,
+ Analytics,
+ getShopAnalytics
} from '@shopify/hydrogen';
```

#### 3.2 Import the `CustomAnalytics` component

```diff
+ import {CustomAnalytics} from '~/components/CustomAnalytics'
```

#### 3.3 Update the `loader` function

```diff
export async function loader({context}: LoaderFunctionArgs) {
+ // 1. Extract the `env` from the context
+ const {storefront, customerAccount, cart, env} = context;

  // ...other code

  return defer(
    {
      // ...other code

+     // 2. return the `shop` environment for analytics
+     shop: getShopAnalytics(context),

+     // 3. return the `consent` config for analytics
+     consent: {
+       checkoutRootDomain: env.PUBLIC_CHECKOUT_DOMAIN,
+       shopDomain: env.PUBLIC_STORE_DOMAIN,
+       storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
+       withPrivacyBanner: true,
+     },
    },
    // other code...
  );
}
```

#### 3.4 Update the `App` component

Wrap the application `Layout` with the `Analytics` provider

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
+       <Analytics.Provider
+         cart={data.cart}
+         shop={data.shop}
+         consent={data.consent}
+         customData={{foo: 'bar'}}
+       >
          <Layout {...data}>
            <Outlet />
          </Layout>
+         <CustomAnalytics />
+       </Analytics.Provider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}
```

Add the `CustomAnalytics` component to listen to events

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
          customData={{foo: 'bar'}}
        >
          <Layout {...data}>
            <Outlet />
          </Layout>
+         <CustomAnalytics />
        </Analytics.Provider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}
```

[View the complete component file](app/root.tsx) to see these updates in context.

## 4. Update Content Security Policy

Add `storeDomain` and `checkoutDomain` to the Content-Security-Policy

```diff
//...other code

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
- const {nonce, header, NonceProvider} = createContentSecurityPolicy();
+ const {nonce, header, NonceProvider} = createContentSecurityPolicy({
+   checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
+   storeDomain: context.env.PUBLIC_STORE_DOMAIN,
+ });

  //...other code
}
```

[View the complete component file](app/entry.server.tsx) to see these updates in context.

## 5. (TypeScript only) - Add the new environment variable to the `ENV` type definition

Update the `remix.d.ts` file

```diff
// ...other code

declare global {
  /**
   * A global `process` object is only available during build to access NODE_ENV.
   */
  const process: {env: {NODE_ENV: 'production' | 'development'}};

  /**
   * Declare expected Env parameter in fetch handler.
   */
  interface Env {
    SESSION_SECRET: string;
    PUBLIC_STOREFRONT_API_TOKEN: string;
    PRIVATE_STOREFRONT_API_TOKEN: string;
    PUBLIC_STORE_DOMAIN: string;
    PUBLIC_STOREFRONT_ID: string;
+   PUBLIC_CHECKOUT_DOMAIN: string;
  }
}

// ...other code
```

[View the complete component file](remix.d.ts) to see these updates in context.
