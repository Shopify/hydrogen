# Overview

This prompt describes how to implement "Partytown + Google Tag Manager" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.
If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.
If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.
Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# AI model verification steps

- Never edit generated files (ending with .d.ts) directly; instead, run the `npm run codegen` command to update them (if the command is available).

# Summary

Add Partytown web worker integration for Google Tag Manager to improve performance

# User Intent Recognition

<user_queries>

</user_queries>

# Troubleshooting

<troubleshooting>

</troubleshooting>

# Recipe Implementation

Here's the partytown recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description

This recipe integrates Partytown with your Hydrogen storefront to run Google Tag Manager 
and other third-party scripts in a web worker, keeping the main thread free for critical 
rendering tasks.

Key features:
- Moves GTM and analytics scripts off the main thread
- Improves Core Web Vitals scores
- Maintains full GTM functionality
- Includes CORS reverse proxy for third-party scripts
- CSP headers configured for GTM domains

## Notes

> [!NOTE]
> Remember to set your GTM_CONTAINER_ID or GTM_ID environment variable

> [!NOTE]
> Run 'npm run partytown' to copy library files for production

> [!NOTE]
> TypeScript users need to manually add GTM types to env.d.ts

## Requirements

- Google Tag Manager container ID
- Basic understanding of web workers and CSP
- Node.js 18.0.0 or higher

## New files added to the template by this recipe

- app/components/PartytownGoogleTagManager.tsx
- app/routes/reverse-proxy.ts
- app/utils/partytown/maybeProxyRequest.ts
- app/utils/partytown/partytownAtomicHeaders.ts

## Steps

### Step 1: .gitignore

Add public/~partytown to ignore Partytown library files

#### File: /.gitignore

```diff
@@ -4,6 +4,7 @@ node_modules
 /build
 /dist
 /public/build
+/public/~partytown
 /.mf
 .env
 .shopify
```

### Step 1: app/components/PartytownGoogleTagManager.tsx

Add GTM component that loads scripts in web worker

#### File: [PartytownGoogleTagManager.tsx](https://github.com/Shopify/hydrogen/blob/6681f92e84d42b5a6aca153fb49e31dcd8af84f6/cookbook/recipes/partytown/ingredients/templates/skeleton/app/components/PartytownGoogleTagManager.tsx)

```tsx
import {useEffect, useRef} from 'react';

/**
 * Component to add Google Tag Manager via Partytown
 * @see https://partytown.builder.io/google-tag-manager
 */
export function PartytownGoogleTagManager(props: {
  gtmContainerId: string | undefined;
  dataLayerKey?: string;
}) {
  const init = useRef(false);
  const {gtmContainerId, dataLayerKey = 'dataLayer'} = props;

  useEffect(() => {
    if (init.current || !gtmContainerId) {
      return;
    }

    const gtmScript = document.createElement('script');
    const nonceScript = document.querySelector('[nonce]') as
      | HTMLScriptElement
      | undefined;
    if (nonceScript?.nonce) {
      gtmScript.setAttribute('nonce', nonceScript.nonce);
    }

    gtmScript.innerHTML = `
        (function(w, d, s, l, i) {
          w[l] = w[l] || [];
          w[l].push({
              'gtm.start': new Date().getTime(),
              event: 'gtm.js'
          });
          var f = d.getElementsByTagName(s)[0],
              j = d.createElement(s),
              dl = l != 'dataLayer' ? '&l=' + l : '';
          j.type = "text/partytown"
          j.src =
              'https://www.googletagmanager.com/gtm.js?id=' + i + dl + '&version=' + Date.now();
          f.parentNode.insertBefore(j, f);
        })(window, document, 'script', '${dataLayerKey}', '${gtmContainerId}');
    `;

    // Add the partytown GTM script to the body
    document.body.appendChild(gtmScript);

    init.current = true;
    return () => {
      document.body.removeChild(gtmScript);
    };
  }, [dataLayerKey, gtmContainerId]);

  if (!gtmContainerId) {
    return null;
  }

  return (
    <noscript>
      {/* GOOGLE TAG MANAGER NO-JS FALLBACK */}
      <iframe
        title="Google Tag Manager"
        src={`https://www.googletagmanager.com/ns.html?id=${gtmContainerId}`}
        height="0"
        width="0"
        style={{display: 'none', visibility: 'hidden'}}
      />
    </noscript>
  );
}
```

### Step 2: README.md

Document Partytown setup and configuration instructions

#### File: /README.md

```diff
@@ -1,6 +1,6 @@
-# Hydrogen template: Skeleton
+# Hydrogen template: Skeleton + Partytown + Google Tag Manager
 
-Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.
+Hydrogen is Shopify's stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify's full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen, enhanced with [Partytown](https://partytown.builder.io/) for performance-oriented lazy-loading of [Google Tag Manager](https://support.google.com/tagmanager).
 
 [Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
 [Get familiar with Remix](https://remix.run/docs/en/v1)
@@ -17,12 +17,15 @@ Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dov
 - GraphQL generator
 - TypeScript and JavaScript flavors
 - Minimal setup of components and routes
+- **Partytown** - Relocates resource intensive scripts off the main thread into a web worker
+- **Google Tag Manager** - Integration with CSP support
 
 ## Getting started
 
 **Requirements:**
 
 - Node.js version 18.0.0 or higher
+- [Google Tag Manager ID](https://support.google.com/tagmanager/answer/6103696?hl=en) (optional)
 
 ```bash
 npm create @shopify/hydrogen@latest
@@ -40,6 +43,62 @@ npm run build
 npm run dev
 ```
 
+## Partytown + Google Tag Manager Setup
+
+### Key files
+
+| File | Description |
+| --- | --- |
+| [`app/components/PartytownGoogleTagManager.tsx`](app/components/PartytownGoogleTagManager.tsx) | Component that loads GTM in a web worker via Partytown |
+| [`app/utils/partytown/maybeProxyRequest.ts`](app/utils/partytown/maybeProxyRequest.ts) | URL resolver for controlling which scripts should be reverse-proxied |
+| [`app/utils/partytown/partytownAtomicHeaders.ts`](app/utils/partytown/partytownAtomicHeaders.ts) | Headers utility for enabling Atomics mode |
+| [`app/routes/reverse-proxy.ts`](app/routes/reverse-proxy.ts) | Reverse proxy route for scripts requiring CORS headers |
+| [`app/root.tsx`](app/root.tsx) | Root layout with Partytown and GTM implementation |
+| [`app/entry.server.tsx`](app/entry.server.tsx) | Enhanced CSP configuration for GTM domains |
+
+### Configuration
+
+1. **Copy Partytown library files** (required for production):
+   ```bash
+   npm run partytown
+   ```
+
+2. **Set environment variables** in your `.env` file:
+   ```bash
+   GTM_CONTAINER_ID=GTM-XXXXXXX  # Your Google Tag Manager container ID
+   # OR
+   GTM_ID=GTM-XXXXXXX
+   ```
+
+3. **TypeScript users**: Add the environment variable to your type definitions in `app/env.d.ts`:
+   ```typescript
+   interface Env extends HydrogenEnv {
+     GTM_CONTAINER_ID?: `GTM-${string}`;
+     GTM_ID?: `GTM-${string}`;
+   }
+   ```
+
+### How it works
+
+1. **Partytown** runs third-party scripts in a web worker, keeping the main thread free
+2. **GTM scripts** are loaded with `type="text/partytown"` to run in the worker
+3. **Reverse proxy** handles scripts that need CORS headers
+4. **CSP headers** are configured to allow GTM and Google Analytics domains
+
+### Performance benefits
+
+- Main thread remains responsive
+- Third-party scripts don't block critical rendering
+- Better Core Web Vitals scores
+- Improved user experience
+
 ## Setup for using Customer Account API (`/account` section)
 
 Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
+
+## Resources
+
+- [Hydrogen documentation](https://shopify.dev/custom-storefronts/hydrogen)
+- [Partytown documentation](https://partytown.builder.io/)
+- [Google Tag Manager setup](https://support.google.com/tagmanager/answer/6103696)
+- [Introducing Partytown](https://dev.to/adamdbradley/introducing-partytown-run-third-party-scripts-from-a-web-worker-2cnp)
\ No newline at end of file
```

### Step 2: app/routes/reverse-proxy.ts

Reverse proxy route for third-party scripts requiring CORS headers

#### File: [reverse-proxy.ts](https://github.com/Shopify/hydrogen/blob/6681f92e84d42b5a6aca153fb49e31dcd8af84f6/cookbook/recipes/partytown/ingredients/templates/skeleton/app/routes/reverse-proxy.ts)

```ts
// Reverse proxies partytown libs that require CORS. Used by Partytown resolveUrl
//@see: https://developers.cloudflare.com/workers/examples/cors-header-proxy/

import type {Route} from './+types/reverse-proxy';

type HandleRequestResponHeaders = {
  'Access-Control-Allow-Origin': string;
  Vary: string;
  'cache-control'?: string;
  'content-type'?: string;
};

type CorsHeaders = {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Max-Age': string;
  'Access-Control-Allow-Headers'?: string;
};

const ALLOWED_PROXY_DOMAINS = new Set([
  'https://cdn.jsdelivr.net',
  'https://unpkg.com',
  'https://google-analytics.com',
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  // other domains you may want to allow to proxy to
]);

// Handle CORS preflight for POST requests
export async function action({request}: Route.ActionArgs) {
  const url = new URL(request.url);
  const isProxyReq = url.pathname.startsWith('/reverse-proxy');

  if (!isProxyReq) {
    return handleErrorResponse({
      status: 405,
      statusText: 'Only proxy requests allowed',
    });
  }

  if (request.method === 'OPTIONS') {
    return handleCorsOptions(request);
  } else if (request.method === 'HEAD' || request.method === 'POST') {
    return handleRequest(request);
  } else {
    return handleErrorResponse({
      status: 405,
      statusText: 'Method Not Allowed',
    });
  }
}

// Handle CORS preflight for GET requests
export function loader({request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const isProxyReq = url.pathname.startsWith('/reverse-proxy');

  if (!isProxyReq) {
    return handleErrorResponse({
      status: 405,
      statusText: 'Only proxy requests allowed',
    });
  }

  if (request.method === 'OPTIONS') {
    return handleCorsOptions(request);
  } else if (request.method === 'HEAD' || request.method === 'GET') {
    return handleRequest(request);
  } else {
    return handleErrorResponse({
      status: 405,
      statusText: 'Method Not Allowed',
    });
  }
}

/**
 * Handle error responses
 * @param status - the status code
 * @param statusText - the status text
 * @returns Response
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response
 */
function handleErrorResponse({
  status,
  statusText,
}: {
  status: number;
  statusText: string;
}) {
  return new Response(null, {
    status,
    statusText,
  });
}

/*
 * Handle CORS preflight requests
 * @param request - the request object
 * @returns Response
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Headers
 */
function handleCorsOptions(request: Route.LoaderArgs['request']) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  const headers = request.headers;

  const requiredHeaders =
    headers.get('Origin') !== null &&
    headers.get('Access-Control-Request-Method') !== null &&
    headers.get('Access-Control-Request-Headers') !== null;

  if (!requiredHeaders) {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS',
      },
    });
  }

  const corsHeaders: CorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  const haveAcessControlHeaders =
    request.headers.get('Access-Control-Request-Headers') != null;

  const accessControl = request.headers.get(
    'Access-Control-Request-Headers',
  ) as string;

  // Allow all future content Request headers to go back to the browser
  // such as Authorization (Bearer) or X-Client-Name-Version
  if (haveAcessControlHeaders) {
    corsHeaders['Access-Control-Allow-Headers'] = accessControl;
  }

  return new Response(null, {
    headers: corsHeaders,
  });
}

/**
 * Handle non CORS preflight requests
 * @param request - the request object
 * @returns Response
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response
 */
async function handleRequest(request: Route.LoaderArgs['request']) {
  const url = new URL(request.url);
  let apiUrl = url.searchParams.get('apiUrl');

  if (apiUrl == null) {
    apiUrl = request.url;
  }

  const apiUrlObj = new URL(apiUrl);

  if (!ALLOWED_PROXY_DOMAINS.has(apiUrlObj.origin)) {
    return handleErrorResponse({
      status: 403,
      statusText: 'Forbidden',
    });
  }

  try {
    // fetch the requested resource
    const response = await fetch(apiUrl);

    const respHeaders: HandleRequestResponHeaders = {
      'Access-Control-Allow-Origin': url.origin,
      Vary: 'Origin', // Append to/Add Vary header so browser will cache response correctly
    };

    if (response.headers.has('content-type')) {
      respHeaders['content-type'] = response.headers.get(
        'content-type',
      ) as string;
    }

    if (response.headers.has('cache-control')) {
      respHeaders['cache-control'] = response.headers.get(
        'cache-control',
      ) as string;
    }

    return new Response(response.body, {
      headers: respHeaders,
      status: 200,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      return handleErrorResponse({
        status: 404,
        statusText: error.message,
      });
    }
  }
}
```

### Step 3: app/entry.server.tsx

Configure CSP headers for GTM and Google Analytics domains

#### File: /app/entry.server.tsx

```diff
@@ -19,6 +19,19 @@ export default async function handleRequest(
       checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
       storeDomain: context.env.PUBLIC_STORE_DOMAIN,
     },
+    // @description Add CSP headers for Google Tag Manager and Analytics via Partytown
+    scriptSrc: [
+      "'self'",
+      'cdn.shopify.com',
+      'www.googletagmanager.com',
+      'www.google-analytics.com',
+      'localhost:*',
+    ],
+    connectSrc: [
+      "'self'",
+      'www.googletagmanager.com',
+      'www.google-analytics.com',
+    ],
   });
 
   const body = await renderToReadableStream(
```

### Step 3: app/utils/partytown/maybeProxyRequest.ts

URL resolver to control which scripts should be reverse-proxied

#### File: [maybeProxyRequest.ts](https://github.com/Shopify/hydrogen/blob/6681f92e84d42b5a6aca153fb49e31dcd8af84f6/cookbook/recipes/partytown/ingredients/templates/skeleton/app/utils/partytown/maybeProxyRequest.ts)

```ts
/**
 * Partytown will call this function to resolve any URLs
 * Many third-party scripts already provide the correct CORS headers, but not all do. For services that do not add the correct headers, then a reverse proxy to another domain must be used in order to provide the CORS headers.
 * @param url - the URL to resolve
 * @param location - the current location
 * @param type - the type of request (script, image, etc)
 * @returns URL or proxy URL
 * @see https://partytown.builder.io/proxying-requests
 */
export function maybeProxyRequest(url: URL, location: Location, type: string) {
  // Domains that already provide correct CORS headers
  const nonProxyDomains: string[] = [];

  // Don't proxy requests to certain domains
  const bypassProxy = nonProxyDomains.some((domain) =>
    url.host.includes(domain),
  );

  // Don't proxy requests that aren't scripts
  if (type !== 'script' || bypassProxy) {
    return url;
  }

  // If the url is already reverse proxied, don't proxy it again
  if (url.href.includes('/reverse-proxy')) {
    return url;
  }

  // Otherwise, proxy the url
  const proxyUrl = new URL(`${location.origin}/reverse-proxy`);
  proxyUrl.searchParams.append('apiUrl', url.href);

  return proxyUrl;
}
```

### Step 4: app/root.tsx

Initialize Partytown and GTM in the root layout

#### File: /app/root.tsx

```diff
@@ -1,4 +1,4 @@
-import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
+import {Analytics, getShopAnalytics, useNonce, Script} from '@shopify/hydrogen';
 import {
   Outlet,
   useRouteError,
@@ -16,6 +16,10 @@ import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
 import resetStyles from '~/styles/reset.css?url';
 import appStyles from '~/styles/app.css?url';
 import {PageLayout} from './components/PageLayout';
+// @description Import Partytown components for Google Tag Manager integration
+import {PartytownGoogleTagManager} from '~/components/PartytownGoogleTagManager';
+import {Partytown} from '@qwik.dev/partytown/react';
+import {maybeProxyRequest} from '~/utils/partytown/maybeProxyRequest';
 
 export type RootLoader = typeof loader;
 
@@ -90,6 +94,9 @@ export async function loader(args: Route.LoaderArgs) {
       country: args.context.storefront.i18n.country,
       language: args.context.storefront.i18n.language,
     },
+    // @description Pass GTM container ID from environment variables
+    gtmContainerId:
+      args.context.env.GTM_ID || args.context.env.GTM_CONTAINER_ID,
   };
 }
 
@@ -162,7 +169,10 @@ export function Layout({children}: {children?: React.ReactNode}) {
             shop={data.shop}
             consent={data.consent}
           >
-            <PageLayout {...data}>{children}</PageLayout>
+            <PageLayout {...data}>
+              <PartyTownScripts gtmContainerId={data.gtmContainerId} />
+              {children}
+            </PageLayout>
           </Analytics.Provider>
         ) : (
           children
@@ -174,6 +184,38 @@ export function Layout({children}: {children?: React.ReactNode}) {
   );
 }
 
+function PartyTownScripts({gtmContainerId}: {gtmContainerId: string}) {
+  const nonce = useNonce();
+  return (
+    <>
+      {/* @description Initialize Google Tag Manager data layer and Partytown web worker */}
+      <Script
+        type="text/partytown"
+        dangerouslySetInnerHTML={{
+          __html: `
+              dataLayer = window.dataLayer || [];
+
+              window.gtag = function () {
+                dataLayer.push(arguments);
+              };
+
+              window.gtag('js', new Date());
+              window.gtag('config', "${gtmContainerId}");
+            `,
+        }}
+      />
+
+      <PartytownGoogleTagManager gtmContainerId={gtmContainerId} />
+
+      <Partytown
+        forward={['dataLayer.push', 'gtag']}
+        resolveUrl={maybeProxyRequest}
+        nonce={nonce}
+      />
+    </>
+  );
+}
+
 export default function App() {
   return <Outlet />;
 }
```

### Step 4: app/utils/partytown/partytownAtomicHeaders.ts

Helper utility to enable Partytown atomic mode for better performance

#### File: [partytownAtomicHeaders.ts](https://github.com/Shopify/hydrogen/blob/6681f92e84d42b5a6aca153fb49e31dcd8af84f6/cookbook/recipes/partytown/ingredients/templates/skeleton/app/utils/partytown/partytownAtomicHeaders.ts)

```ts
/*
 * Helper utility to enable PartyTown atomic mode
 * @see: https://partytown.builder.io/atomics
 */
export function partytownAtomicHeaders() {
  return {
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}
```

### Step 5: package.json

Add Partytown dependency and npm script for copying library files

#### File: /package.json

```diff
@@ -8,12 +8,14 @@
     "build": "shopify hydrogen build --codegen",
     "dev": "shopify hydrogen dev --codegen",
     "preview": "shopify hydrogen preview --build",
-    "lint": "eslint --no-error-on-unmatched-pattern .",
+    "lint": "eslint --no-error-on-unmatched-pattern --ignore-pattern 'public/~partytown/**' .",
     "typecheck": "react-router typegen && tsc --noEmit",
-    "codegen": "shopify hydrogen codegen && react-router typegen"
+    "codegen": "shopify hydrogen codegen && react-router typegen",
+    "partytown": "partytown copylib public/~partytown"
   },
   "prettier": "@shopify/prettier-config",
   "dependencies": {
+    "@qwik.dev/partytown": "^0.11.2",
     "@shopify/hydrogen": "2025.5.0",
     "graphql": "^16.10.0",
     "graphql-tag": "^2.12.6",
```

### Step 6: vite.config.ts



#### File: /vite.config.ts

```diff
@@ -26,7 +26,12 @@ export default defineConfig({
        * Include 'example-dep' in the array below.
        * @see https://vitejs.dev/config/dep-optimization-options
        */
-      include: ['set-cookie-parser', 'cookie', 'react-router'],
+      include: [
+        'set-cookie-parser',
+        'cookie',
+        'react-router',
+        '@qwik.dev/partytown/react',
+      ],
     },
   },
 });
```

</recipe_implementation>