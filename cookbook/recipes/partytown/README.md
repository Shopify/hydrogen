# 🧑‍🍳 Partytown

This folder contains a peformance-oriented example lazy-loading [Google Tag Manager](https://support.google.com/tagmanager) using [Partytown](https://partytown.builder.io/).

Party town helps relocate resource intensive scripts off the main thread into a web worker.

## 🍣 Ingredients

| File | Description |
| --- | --- |
| [`app/components/PartytownGoogleTagManager.tsx`](ingredients/templates/skeleton/app/components/PartytownGoogleTagManager.tsx) | A component that loads Google Tag Manager in a web worker via Partytown with built-in CSP support. |
| [`app/routes/reverse-proxy.ts`](ingredients/templates/skeleton/app/routes/reverse-proxy.ts) | A route that acts as a [reverse proxy](https://partytown.builder.io/proxying-requests#reverse-proxy) for 3P scripts that require CORS headers. |
| [`app/utils.ts`](ingredients/templates/skeleton/app/utils.ts) |  |
| [`app/utils/partytown/maybeProxyRequest.ts`](ingredients/templates/skeleton/app/utils/partytown/maybeProxyRequest.ts) | A Partytown url resolver to control which 3P scripts should be reverse-proxied. Used in Partytown's resolveUrl property |
| [`app/utils/partytown/partytownAtomicHeaders.ts`](ingredients/templates/skeleton/app/utils/partytown/partytownAtomicHeaders.ts) | Utility that returns the required headers to enable [Atomics mode](https://partytown.builder.io/atomics) for added performance |

## 🍱 Steps

### 1. Requirements

- [Google Tag Manager ID] - Log in to your Google Tag Manager account and open a container. In the top right corner (next to the Submit and Preview buttons) you'll see some short text that starts with GTM- and then contains some letters/numbers. That's your Google Tag Manager ID
- [Basic Partytown knowledge](https://dev.to/adamdbradley/introducing-partytown-run-third-party-scripts-from-a-web-worker-2cnp) - Introducing Partytown: Run Third-Party Scripts From a Web Worker

### 2. Copy ingredients

Copy the ingredients from the template directory to the current directory

- `app/components/PartytownGoogleTagManager.tsx`
- `app/routes/reverse-proxy.ts`
- `app/utils.ts`
- `app/utils/partytown/maybeProxyRequest.ts`
- `app/utils/partytown/partytownAtomicHeaders.ts`
- `public/~partytown/partytown-atomics.js`
- `public/~partytown/partytown-media.js`
- `public/~partytown/partytown-sw.js`
- `public/~partytown/partytown.js`
- `public/~partytown/debug/partytown-atomics.js`
- `public/~partytown/debug/partytown-media.js`
- `public/~partytown/debug/partytown-sandbox-sw.js`
- `public/~partytown/debug/partytown-sw.js`
- `public/~partytown/debug/partytown-ww-atomics.js`
- `public/~partytown/debug/partytown-ww-sw.js`
- `public/~partytown/debug/partytown.js`

### 3. (Optional) - Update Content Security Policy

Add wwww.googletagmanager.com domain to the scriptSrc directive

#### File: [`app/entry.server.tsx`](/templates/skeleton/app/entry.server.tsx)

```diff
index 1480601b..92eb63bf 100644
--- a/templates/skeleton/app/entry.server.tsx
+++ b/templates/skeleton/app/entry.server.tsx
@@ -16,11 +16,12 @@ export default async function handleRequest(
       checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
       storeDomain: context.env.PUBLIC_STORE_DOMAIN,
     },
+    scriptSrc: ["'self'", 'cdn.shopify.com', 'www.googletagmanager.com'],
   });
 
   const body = await renderToReadableStream(
     <NonceProvider>
-      <RemixServer context={remixContext} url={request.url} nonce={nonce}/>
+      <RemixServer context={remixContext} url={request.url} nonce={nonce} />
     </NonceProvider>,
     {
       nonce,

```

### 4. app/root.tsx



#### File: [`app/root.tsx`](/templates/skeleton/app/root.tsx)

<details>

```diff
index 608402fb..d28668c6 100644
--- a/templates/skeleton/app/root.tsx
+++ b/templates/skeleton/app/root.tsx
@@ -1,4 +1,4 @@
-import {useNonce, getShopAnalytics, Analytics} from '@shopify/hydrogen';
+import {Script, useNonce, getShopAnalytics, Analytics} from '@shopify/hydrogen';
 import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
 import {
   Links,
@@ -16,6 +16,10 @@ import resetStyles from '~/styles/reset.css?url';
 import appStyles from '~/styles/app.css?url';
 import {PageLayout} from '~/components/PageLayout';
 import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
+import {PartytownGoogleTagManager} from '~/components/PartytownGoogleTagManager';
+import {Partytown} from '@builder.io/partytown/react';
+import {maybeProxyRequest} from '~/utils/partytown/maybeProxyRequest';
+import {partytownAtomicHeaders} from '~/utils/partytown/partytownAtomicHeaders';
 
 export type RootLoader = typeof loader;
 
@@ -33,9 +37,9 @@ export const shouldRevalidate: ShouldRevalidateFunction = ({
   // revalidate when manually revalidating via useRevalidator
   if (currentUrl.toString() === nextUrl.toString()) return true;
 
-  // Defaulting to no revalidation for root loader data to improve performance. 
-  // When using this feature, you risk your UI getting out of sync with your server. 
-  // Use with caution. If you are uncomfortable with this optimization, update the 
+  // Defaulting to no revalidation for root loader data to improve performance.
+  // When using this feature, you risk your UI getting out of sync with your server.
+  // Use with caution. If you are uncomfortable with this optimization, update the
   // line below to `return defaultShouldRevalidate` instead.
   // For more details see: https://remix.run/docs/en/main/route/should-revalidate
   return false;
@@ -85,11 +89,12 @@ export async function loader(args: LoaderFunctionArgs) {
     consent: {
       checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
       storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
-      withPrivacyBanner: false,
+      withPrivacyBanner: true,
       // localize the privacy banner
       country: args.context.storefront.i18n.country,
       language: args.context.storefront.i18n.language,
     },
+    gtmContainerId: args.context.env.GTM_CONTAINER_ID,
   };
 }
 
@@ -162,7 +167,32 @@ export function Layout({children}: {children?: React.ReactNode}) {
             shop={data.shop}
             consent={data.consent}
           >
-            <PageLayout {...data}>{children}</PageLayout>
+            <PageLayout {...data}>
+              <Script
+                type="text/partytown"
+                dangerouslySetInnerHTML={{
+                  __html: `
+              dataLayer = window.dataLayer || [];
+
+              window.gtag = function () {
+                dataLayer.push(arguments);
+              };
+
+              window.gtag('js', new Date());
+              window.gtag('config', "${data.gtmContainerId}");
+            `,
+                }}
+              />
+
+              <PartytownGoogleTagManager gtmContainerId={data.gtmContainerId} />
+
+              <Partytown
+                nonce={nonce}
+                forward={['dataLayer.push', 'gtag']}
+                resolveUrl={maybeProxyRequest}
+              />
+              {children}
+            </PageLayout>
           </Analytics.Provider>
         ) : (
           children

```

</details>

### 5. Update the index route



#### File: [`app/routes/_index.tsx`](/templates/skeleton/app/routes/_index.tsx)

<details>

```diff
index 9fa33642..2b7a0dcd 100644
--- a/templates/skeleton/app/routes/_index.tsx
+++ b/templates/skeleton/app/routes/_index.tsx
@@ -1,182 +1,21 @@
-import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
-import {Await, useLoaderData, Link, type MetaFunction} from '@remix-run/react';
-import {Suspense} from 'react';
-import {Image, Money} from '@shopify/hydrogen';
-import type {
-  FeaturedCollectionFragment,
-  RecommendedProductsQuery,
-} from 'storefrontapi.generated';
+import {useEffect} from 'react';
+import {useLocation} from '@remix-run/react';
 
-export const meta: MetaFunction = () => {
-  return [{title: 'Hydrogen | Home'}];
-};
-
-export async function loader(args: LoaderFunctionArgs) {
-  // Start fetching non-critical data without blocking time to first byte
-  const deferredData = loadDeferredData(args);
-
-  // Await the critical data required to render initial state of the page
-  const criticalData = await loadCriticalData(args);
-
-  return {...deferredData, ...criticalData};
-}
-
-/**
- * Load data necessary for rendering content above the fold. This is the critical data
- * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
- */
-async function loadCriticalData({context}: LoaderFunctionArgs) {
-  const [{collections}] = await Promise.all([
-    context.storefront.query(FEATURED_COLLECTION_QUERY),
-    // Add other queries here, so that they are loaded in parallel
-  ]);
-
-  return {
-    featuredCollection: collections.nodes[0],
-  };
-}
-
-/**
- * Load data for rendering content below the fold. This data is deferred and will be
- * fetched after the initial page load. If it's unavailable, the page should still 200.
- * Make sure to not throw any errors here, as it will cause the page to 500.
- */
-function loadDeferredData({context}: LoaderFunctionArgs) {
-  const recommendedProducts = context.storefront
-    .query(RECOMMENDED_PRODUCTS_QUERY)
-    .catch((error) => {
-      // Log query errors, but don't throw them so the page can still render
-      console.error(error);
-      return null;
-    });
-
-  return {
-    recommendedProducts,
-  };
-}
-
-export default function Homepage() {
-  const data = useLoaderData<typeof loader>();
+export default function Index() {
   return (
-    <div className="home">
-      <FeaturedCollection collection={data.featuredCollection} />
-      <RecommendedProducts products={data.recommendedProducts} />
-    </div>
+    <>
+      <h1>Partytown + Google GTM example</h1>
+      <TrackPageView />
+    </>
   );
 }
 
-function FeaturedCollection({
-  collection,
-}: {
-  collection: FeaturedCollectionFragment;
-}) {
-  if (!collection) return null;
-  const image = collection?.image;
-  return (
-    <Link
-      className="featured-collection"
-      to={`/collections/${collection.handle}`}
-    >
-      {image && (
-        <div className="featured-collection-image">
-          <Image data={image} sizes="100vw" />
-        </div>
-      )}
-      <h1>{collection.title}</h1>
-    </Link>
-  );
-}
+function TrackPageView() {
+  const location = useLocation();
 
-function RecommendedProducts({
-  products,
-}: {
-  products: Promise<RecommendedProductsQuery | null>;
-}) {
-  return (
-    <div className="recommended-products">
-      <h2>Recommended Products</h2>
-      <Suspense fallback={<div>Loading...</div>}>
-        <Await resolve={products}>
-          {(response) => (
-            <div className="recommended-products-grid">
-              {response
-                ? response.products.nodes.map((product) => (
-                    <Link
-                      key={product.id}
-                      className="recommended-product"
-                      to={`/products/${product.handle}`}
-                    >
-                      <Image
-                        data={product.images.nodes[0]}
-                        aspectRatio="1/1"
-                        sizes="(min-width: 45em) 20vw, 50vw"
-                      />
-                      <h4>{product.title}</h4>
-                      <small>
-                        <Money data={product.priceRange.minVariantPrice} />
-                      </small>
-                    </Link>
-                  ))
-                : null}
-            </div>
-          )}
-        </Await>
-      </Suspense>
-      <br />
-    </div>
-  );
-}
+  useEffect(() => {
+    window.gtag('event', 'page_view', {path: location.pathname, title: document.title});
+  }, []);
 
-const FEATURED_COLLECTION_QUERY = `#graphql
-  fragment FeaturedCollection on Collection {
-    id
-    title
-    image {
-      id
-      url
-      altText
-      width
-      height
-    }
-    handle
-  }
-  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
-    @inContext(country: $country, language: $language) {
-    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
-      nodes {
-        ...FeaturedCollection
-      }
-    }
-  }
-` as const;
-
-const RECOMMENDED_PRODUCTS_QUERY = `#graphql
-  fragment RecommendedProduct on Product {
-    id
-    title
-    handle
-    priceRange {
-      minVariantPrice {
-        amount
-        currencyCode
-      }
-    }
-    images(first: 1) {
-      nodes {
-        id
-        url
-        altText
-        width
-        height
-      }
-    }
-  }
-  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
-    @inContext(country: $country, language: $language) {
-    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
-      nodes {
-        ...RecommendedProduct
-      }
-    }
-  }
-` as const;
+  return <pre>pageView event tracked</pre>;
+}

```

</details>

### 6. (TypeScript only) - Add the new environment variable to the ENV type definition



#### File: [`env.d.ts`](/templates/skeleton/env.d.ts)

```diff
index c9538bf4..69ce3030 100644
--- a/templates/skeleton/env.d.ts
+++ b/templates/skeleton/env.d.ts
@@ -19,7 +19,8 @@ declare global {
   const process: {env: {NODE_ENV: 'production' | 'development'}};
 
   interface Env extends HydrogenEnv {
-    // declare additional Env parameter use in the fetch handler and Remix loader context here
+    // declare additional Env parameter in the fetch handler and in Remix loader context here
+    GTM_CONTAINER_ID: `GTM-${string}`;
   }
 }
 

```

### 7. Modify npm scripts



#### File: [`package.json`](/templates/skeleton/package.json)

```diff
index d3638ae4..89d1db0f 100644
--- a/templates/skeleton/package.json
+++ b/templates/skeleton/package.json
@@ -5,15 +5,17 @@
   "version": "2025.1.2",
   "type": "module",
   "scripts": {
-    "build": "shopify hydrogen build --codegen",
+    "build": "npm run partytown && shopify hydrogen build --codegen",
     "dev": "shopify hydrogen dev --codegen",
     "preview": "shopify hydrogen preview --build",
     "lint": "eslint --no-error-on-unmatched-pattern .",
     "typecheck": "tsc --noEmit",
-    "codegen": "shopify hydrogen codegen"
+    "codegen": "shopify hydrogen codegen",
+    "partytown": "partytown copylib public/~partytown"
   },
   "prettier": "@shopify/prettier-config",
   "dependencies": {
+    "@builder.io/partytown": "^0.8.1",
     "@remix-run/react": "^2.15.3",
     "@remix-run/server-runtime": "^2.15.3",
     "@shopify/hydrogen": "2025.1.2",
@@ -37,6 +39,7 @@
     "@shopify/prettier-config": "^1.1.2",
     "@total-typescript/ts-reset": "^0.4.2",
     "@types/eslint": "^9.6.1",
+    "@types/gtag.js": "^0.0.18",
     "@types/react": "^18.2.22",
     "@types/react-dom": "^18.2.7",
     "@typescript-eslint/eslint-plugin": "^8.21.0",

```

### 8. Modify tsconfig.json



#### File: [`tsconfig.json`](/templates/skeleton/tsconfig.json)

```diff
index bf02c20a..fdea6c28 100644
--- a/templates/skeleton/tsconfig.json
+++ b/templates/skeleton/tsconfig.json
@@ -1,7 +1,15 @@
 {
-  "include": ["./**/*.d.ts", "./**/*.ts", "./**/*.tsx"],
+  "include": [
+    "./**/*.d.ts",
+    "./**/*.ts",
+    "./**/*.tsx"
+  ],
   "compilerOptions": {
-    "lib": ["DOM", "DOM.Iterable", "ES2022"],
+    "lib": [
+      "DOM",
+      "DOM.Iterable",
+      "ES2022"
+    ],
     "isolatedModules": true,
     "esModuleInterop": true,
     "jsx": "react-jsx",
@@ -17,10 +25,13 @@
     "types": [
       "@shopify/oxygen-workers-types",
       "@remix-run/node",
-      "vite/client"
+      "vite/client",
+      "@types/gtag.js"
     ],
     "paths": {
-      "~/*": ["app/*"]
+      "~/*": [
+        "app/*"
+      ]
     },
     "noEmit": true
   }

```

### 9. Codegen

