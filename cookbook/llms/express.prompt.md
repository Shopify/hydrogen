# Overview

This prompt describes how to implement "Express Server for Hydrogen" in a Hydrogen storefront. Below is a "recipe" that contains the steps to apply to a basic Hydrogen skeleton template to achieve the desired outcome.
The same logic can be applied to any other Hydrogen storefront project, adapting the implementation details to the specific needs/structure/conventions of the project, but it's up to the developer to do so.
If there are any prerequisites, the recipe below will explain them; if the user is trying to implement the feature described in this recipe, make sure to prominently mention the prerequisites and any other preliminary instructions, as well as followups.
If the user is asking on how to implement the feature from scratch, please first describe the feature in a general way before jumping into the implementation details.
Please note that the recipe steps below are not necessarily ordered in the way they should be executed, as it depends on the user's needs and the specific details of the project. The recipe steps descriptions should allow you to understand what is required to be done in a certain order and what is not. Remember that file names in the recipe are related to the Hydrogen skeleton template, not the user's project, so make sure to adapt the file names to the user's project.

# AI model verification steps

- Never edit generated files (ending with .d.ts) directly; instead, run the `npm run codegen` command to update them (if the command is available).

# Summary

Deploy Hydrogen on Node.js with Express instead of Shopify Oxygen

# User Intent Recognition

<user_queries>
- How do I deploy Hydrogen to Node.js instead of Oxygen?
- How can I use Express with Hydrogen?
- How do I deploy Hydrogen to Heroku/AWS/Vercel?
- How to run Hydrogen without Shopify Oxygen?
- Can I use Hydrogen with my own server?
</user_queries>

# Troubleshooting

<troubleshooting>
- **Issue**: Error: [h2:error:createStorefrontClient] `storeDomain` is required
  **Solution**: Create a .env file with your Shopify store credentials. See the nextSteps section for required environment variables.
- **Issue**: Cannot read file: fs/path/stream errors during build
  **Solution**: This is expected. The vite.config.ts properly externalizes Node.js built-in modules for the Express server.
- **Issue**: GraphQL codegen fails with 'Unable to find any GraphQL type definitions'
  **Solution**: The recipe preserves GraphQL functionality. Make sure .graphqlrc.ts exists and your GraphQL queries use the gql template literal.
- **Issue**: Port already in use when running npm run dev
  **Solution**: The Express server defaults to port 3000. Either stop the process using that port or set PORT environment variable to a different port.
- **Issue**: TypeScript errors about missing @react-router/node types
  **Solution**: Run 'npm install' to ensure all dependencies including @types packages are installed.
</troubleshooting>

# Recipe Implementation

Here's the express recipe for the base Hydrogen skeleton template:

<recipe_implementation>

## Description

This recipe transforms a Hydrogen skeleton template to run on a standard Node.js Express server,
making it deployable to any Node.js hosting platform instead of Shopify Oxygen. It maintains core
Hydrogen functionality including GraphQL codegen and Storefront API integration while replacing
Oxygen-specific features with Express equivalents.

Key changes:
- Replaces Oxygen server with Express server
- Uses Vite for development with hot module replacement
- Implements session management through Express middleware
- Provides production-ready server configuration
- Keeps GraphQL codegen functionality intact

## Notes

> [!NOTE]
> Requires Node.js 20+ for production deployment (less than 22.0.0)

> [!NOTE]
> Uses nodemon for development server with automatic restarts

> [!NOTE]
> Environment variables are loaded from .env file using dotenv

> [!NOTE]
> Session management is handled through Express middleware with SESSION_SECRET

> [!NOTE]
> GraphQL codegen still works with Storefront API types

> [!NOTE]
> Compatible with React Router 7.8.x

> [!NOTE]
> The .graphqlrc.ts file is preserved with customer account section commented out

## Requirements

- Node.js 18 or higher
- npm or yarn package manager
- Shopify Storefront API credentials

## New files added to the template by this recipe

- app/env.ts
- public/favicon.svg
- scripts/dev.mjs
- server.mjs

## Steps

### Step 1: .graphqlrc.ts



#### File: /.graphqlrc.ts

```diff
@@ -17,10 +17,11 @@ export default {
       ],
     },
 
-    customer: {
-      schema: getSchema('customer-account'),
-      documents: ['./app/graphql/customer-account/*.{ts,tsx,js,jsx}'],
-    },
+    // Customer account API - commented out for Express recipe
+    // customer: {
+    //   schema: getSchema('customer-account'),
+    //   documents: ['./app/graphql/customer-account/*.{ts,tsx,js,jsx}'],
+    // },
 
     // Add your own GraphQL projects here for CMS, Shopify Admin API, etc.
   },
```

### Step 1: README.md



#### File: /README.md

```diff
@@ -1,45 +1,89 @@
-# Hydrogen template: Skeleton
+# Hydrogen Express Skeleton
 
-Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.
+This is a Hydrogen skeleton template configured to run with NodeJS [Express](https://expressjs.com/) instead of Shopify Oxygen. 
+
+Hydrogen is Shopify's stack for headless commerce, designed to dovetail with [React Router](https://reactrouter.com/), the full stack web framework. This template contains a **minimal Express setup** with basic components and routes to get started with Hydrogen on Node.js.
 
 [Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
-[Get familiar with Remix](https://remix.run/docs/en/v1)
+[Get familiar with React Router](https://reactrouter.com/en/main)
 
 ## What's included
 
-- Remix
+- React Router 7
 - Hydrogen
-- Oxygen
+- Express server
 - Vite
-- Shopify CLI
+- TypeScript
 - ESLint
-- Prettier
-- GraphQL generator
-- TypeScript and JavaScript flavors
 - Minimal setup of components and routes
 
+## Important Notes
+
+This Express setup differs from the standard Hydrogen template:
+
+1. **Cache Implementation**: Uses an in-memory cache. In production, you should implement redis, memcached, or another cache that implements the [Cache interface](https://developer.mozilla.org/en-US/docs/Web/API/Cache).
+2. **Storefront Redirect**: Does not utilize [`storefrontRedirect`](https://shopify.dev/docs/api/hydrogen/utilities/storefrontredirect) functionality.
+3. **Minimal Routes**: Only includes index and product routes. Add more routes as needed.
+
 ## Getting started
 
 **Requirements:**
 
-- Node.js version 18.0.0 or higher
+- Node.js version 18.0.0 or higher (but less than 22.0.0)
+
+### Environment Setup
+
+Create a `.env` file with your Shopify store credentials:
+
+```env
+PUBLIC_STOREFRONT_API_TOKEN="your-token"
+PUBLIC_STORE_DOMAIN="your-store.myshopify.com"
+PUBLIC_STOREFRONT_ID="your-storefront-id"
+SESSION_SECRET="your-session-secret-at-least-32-chars"
+```
+
+## Local development
+
+Start the Express development server:
 
 ```bash
-npm create @shopify/hydrogen@latest
+npm run dev
 ```
 
+This starts your app in development mode with hot module replacement.
+
 ## Building for production
 
 ```bash
 npm run build
 ```
 
-## Local development
+## Production deployment
+
+Run the app in production mode:
 
 ```bash
-npm run dev
+npm start
 ```
 
-## Setup for using Customer Account API (`/account` section)
+### Deployment
 
-Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
+When deploying your Express application, ensure you deploy:
+
+- `build/` directory
+- `server.mjs` file
+- `package.json` and dependencies
+- Your `.env` configuration
+
+The Express server runs on the port specified by the `PORT` environment variable (defaults to 3000).
+
+## Project Structure
+
+- `server.mjs` - Express server configuration
+- `scripts/dev.mjs` - Development server orchestration
+- `app/` - React Router application code
+  - `entry.client.tsx` - Client-side entry point
+  - `entry.server.tsx` - Server-side rendering entry point
+  - `root.tsx` - Root layout component
+  - `routes/` - Application routes
+- `build/` - Production build output (generated)
\ No newline at end of file
```

### Step 1: app/env.ts



#### File: [env.ts](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/express/ingredients/templates/skeleton/app/env.ts)

```ts
// This file extends the Hydrogen types for this project
// The types are automatically available via @shopify/hydrogen/react-router-types

// Extend the session data for your app
declare module 'react-router' {
  interface SessionData {
    customerAccessToken?: string;
    cartId?: string;
  }
}

// Extend the environment variables for your app
declare global {
  interface Env {
    // Your custom environment variables
    SOME_API_KEY?: string;
  }
}

// Add additional context properties if needed
declare global {
  interface HydrogenAdditionalContext {
    // Add any custom context properties your app needs
    // For example:
    // cms?: CMSClient;
  }
}

// Required to make this file a module and enable the augmentation
export {};
```

### Step 2: app/entry.client.tsx



#### File: /app/entry.client.tsx

```diff
@@ -1,21 +1,13 @@
 import {HydratedRouter} from 'react-router/dom';
 import {startTransition, StrictMode} from 'react';
 import {hydrateRoot} from 'react-dom/client';
-import {NonceProvider} from '@shopify/hydrogen';
 
 if (!window.location.origin.includes('webcache.googleusercontent.com')) {
   startTransition(() => {
-    // Extract nonce from existing script tags
-    const existingNonce = document
-      .querySelector<HTMLScriptElement>('script[nonce]')
-      ?.nonce;
-
     hydrateRoot(
       document,
       <StrictMode>
-        <NonceProvider value={existingNonce}>
-          <HydratedRouter />
-        </NonceProvider>
+        <HydratedRouter />
       </StrictMode>,
     );
   });
```

### Step 2: public/favicon.svg



#### File: [favicon.svg](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/express/ingredients/templates/skeleton/public/favicon.svg)

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none">
  <style>
    .stroke {
      stroke: #000;
    }
    .fill {
      fill: #000;
    }
    @media (prefers-color-scheme: dark) {
      .stroke {
        stroke: #fff;
      }
      .fill {
        fill: #fff;
      }
    }
  </style>
  <path
    class="stroke"
    fill-rule="evenodd"
    d="M16.1 16.04 1 8.02 6.16 5.3l5.82 3.09 4.88-2.57-5.82-3.1L16.21 0l15.1 8.02-5.17 2.72-5.5-2.91-4.88 2.57 5.5 2.92-5.16 2.72Z"
  />
  <path
    class="fill"
    fill-rule="evenodd"
    d="M16.1 32 1 23.98l5.16-2.72 5.82 3.08 4.88-2.57-5.82-3.08 5.17-2.73 15.1 8.02-5.17 2.72-5.5-2.92-4.88 2.58 5.5 2.92L16.1 32Z"
  />
</svg>

```

### Step 3: app/entry.server.tsx



#### File: /app/entry.server.tsx

```diff
@@ -1,73 +1,97 @@
+import {PassThrough} from 'node:stream';
+import type {EntryContext} from 'react-router';
+import {createReadableStreamFromReadable} from '@react-router/node';
 import {ServerRouter} from 'react-router';
 import {isbot} from 'isbot';
-import {renderToReadableStream} from 'react-dom/server';
+import type {RenderToPipeableStreamOptions} from 'react-dom/server';
+import {renderToPipeableStream} from 'react-dom/server';
 import {
   createContentSecurityPolicy,
   type HydrogenRouterContextProvider,
   createAnalyticsServerTimingHeader,
   createAnalyticsCookieHeaders,
 } from '@shopify/hydrogen';
-import type {EntryContext} from 'react-router';
 
-export default async function handleRequest(
+const ABORT_DELAY = 5_000;
+
+export default function handleRequest(
   request: Request,
   responseStatusCode: number,
   responseHeaders: Headers,
   reactRouterContext: EntryContext,
   context: HydrogenRouterContextProvider,
 ) {
-  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
-    shop: {
-      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
-      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
-    },
-  });
-
-  const body = await renderToReadableStream(
-    <NonceProvider>
-      <ServerRouter
-        context={reactRouterContext}
-        url={request.url}
-        nonce={nonce}
-      />
-    </NonceProvider>,
-    {
-      nonce,
-      signal: request.signal,
-      onError(error) {
-        console.error(error);
-        responseStatusCode = 500;
+  return new Promise((resolve, reject) => {
+    const {nonce, header, NonceProvider} = createContentSecurityPolicy({
+      shop: {
+        checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
+        storeDomain: context.env.PUBLIC_STORE_DOMAIN,
       },
-    },
-  );
+    });
 
-  if (isbot(request.headers.get('user-agent'))) {
-    await body.allReady;
-  }
+    let shellRendered = false;
+    const userAgent = request.headers.get('user-agent');
 
-  responseHeaders.set('Content-Type', 'text/html');
-  responseHeaders.set('Content-Security-Policy', header);
+    const readyOption: keyof RenderToPipeableStreamOptions =
+      userAgent && isbot(userAgent) ? 'onAllReady' : 'onShellReady';
 
-  if (context.analyticsTokens) {
-    const serverTimingValue = createAnalyticsServerTimingHeader(context.analyticsTokens);
-    if (serverTimingValue) {
-      responseHeaders.set('Server-Timing', serverTimingValue);
-    }
-    
-    const cookieHeaders = createAnalyticsCookieHeaders(
-      context.analyticsTokens,
+    const {pipe, abort} = renderToPipeableStream(
+      <NonceProvider>
+        <ServerRouter
+          context={reactRouterContext}
+          url={request.url}
+          nonce={nonce}
+        />
+      </NonceProvider>,
       {
-        requestUrl: request.url,
+        nonce,
+        [readyOption]() {
+          shellRendered = true;
+          const body = new PassThrough();
+          const stream = createReadableStreamFromReadable(body);
+
+          responseHeaders.set('Content-Type', 'text/html');
+          responseHeaders.set('Content-Security-Policy', header);
+
+          if (context.analyticsTokens) {
+            const serverTimingValue = createAnalyticsServerTimingHeader(context.analyticsTokens);
+            if (serverTimingValue) {
+              responseHeaders.set('Server-Timing', serverTimingValue);
+            }
+            
+            const cookieHeaders = createAnalyticsCookieHeaders(
+              context.analyticsTokens,
+              {
+                requestUrl: request.url,
+              },
+            );
+            
+            cookieHeaders.forEach(cookieHeader => {
+              responseHeaders.append('Set-Cookie', cookieHeader);
+            });
+          }
+
+          resolve(
+            new Response(stream, {
+              headers: responseHeaders,
+              status: responseStatusCode,
+            }),
+          );
+
+          pipe(body);
+        },
+        onShellError(error: unknown) {
+          reject(error);
+        },
+        onError(error: unknown) {
+          responseStatusCode = 500;
+          if (shellRendered) {
+            console.error(error);
+          }
+        },
       },
     );
-    
-    cookieHeaders.forEach(cookieHeader => {
-      responseHeaders.append('Set-Cookie', cookieHeader);
-    });
-  }
 
-  return new Response(body, {
-    headers: responseHeaders,
-    status: responseStatusCode,
+    setTimeout(abort, ABORT_DELAY);
   });
-}
+}
\ No newline at end of file
```

### Step 3: scripts/dev.mjs



#### File: [dev.mjs](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/express/ingredients/templates/skeleton/scripts/dev.mjs)

```mjs
#!/usr/bin/env node

import {spawn} from 'child_process';
import {watch} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Start the Express server
const server = spawn('npm', ['run', 'dev:server'], {
  stdio: 'inherit',
  shell: true,
  cwd: rootDir,
});

// Run initial type generation with --watch flag to avoid WebSocket conflicts
console.log('🔄 Generating React Router types...');
const initialTypegen = spawn('npx', ['react-router', 'typegen'], {
  stdio: ['inherit', 'inherit', 'pipe'], // Pipe stderr to suppress WebSocket warnings
  shell: true,
  cwd: rootDir,
});

// Filter out WebSocket errors from stderr
initialTypegen.stderr?.on('data', (data) => {
  const message = data.toString();
  if (!message.includes('WebSocket server error')) {
    process.stderr.write(data);
  }
});

initialTypegen.on('close', () => {
  console.log('✅ Initial types generated');
  
  // Show dev server URL
  const port = process.env.PORT || 3000;
  console.log('\n🚀 Express server ready!\n');
  console.log(`  ➜  Local:   http://localhost:${port}`);
  console.log(`  ➜  Network: use --host to expose\n`);
});

// Watch for route changes
const routesDir = join(rootDir, 'app', 'routes');
const routesFile = join(rootDir, 'app', 'routes.ts');

console.log('👀 Watching for route changes...');

let typegenTimeout;
const runTypegen = () => {
  clearTimeout(typegenTimeout);
  typegenTimeout = setTimeout(() => {
    console.log('🔄 Route change detected, regenerating types...');
    const typegen = spawn('npx', ['react-router', 'typegen'], {
      stdio: ['inherit', 'inherit', 'pipe'],
      shell: true,
      cwd: rootDir,
    });
    
    // Filter out WebSocket errors
    typegen.stderr?.on('data', (data) => {
      const message = data.toString();
      if (!message.includes('WebSocket server error')) {
        process.stderr.write(data);
      }
    });
    
    typegen.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Types regenerated');
      } else {
        console.error('❌ Type generation failed');
      }
    });
  }, 500); // Debounce for 500ms
};

// Watch routes directory
watch(routesDir, {recursive: true}, (eventType, filename) => {
  if (filename && (filename.endsWith('.tsx') || filename.endsWith('.ts'))) {
    runTypegen();
  }
});

// Watch routes.ts file
watch(routesFile, () => {
  runTypegen();
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill();
  process.exit(0);
});
```

### Step 4: app/root.tsx



#### File: /app/root.tsx

```diff
@@ -11,46 +11,20 @@ import {
   useRouteLoaderData,
 } from 'react-router';
 import type {Route} from './+types/root';
-import favicon from '~/assets/favicon.svg';
-import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
-import resetStyles from '~/styles/reset.css?url';
-import appStyles from '~/styles/app.css?url';
-import {PageLayout} from './components/PageLayout';
+import styles from './styles/app.css?url';
 
 export type RootLoader = typeof loader;
 
-/**
- * This is important to avoid re-fetching root queries on sub-navigations
- */
 export const shouldRevalidate: ShouldRevalidateFunction = ({
   formMethod,
   currentUrl,
   nextUrl,
 }) => {
-  // revalidate when a mutation is performed e.g add to cart, login...
   if (formMethod && formMethod !== 'GET') return true;
-
-  // revalidate when manually revalidating via useRevalidator
   if (currentUrl.toString() === nextUrl.toString()) return true;
-
-  // Defaulting to no revalidation for root loader data to improve performance.
-  // When using this feature, you risk your UI getting out of sync with your server.
-  // Use with caution. If you are uncomfortable with this optimization, update the
-  // line below to `return defaultShouldRevalidate` instead.
-  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
   return false;
 };
 
-/**
- * The main and reset stylesheets are added in the Layout component
- * to prevent a bug in development HMR updates.
- *
- * This avoids the "failed to execute 'insertBefore' on 'Node'" error
- * that occurs after editing and navigating to another page.
- *
- * It's a temporary fix until the issue is resolved.
- * https://github.com/remix-run/remix/issues/9242
- */
 export function links() {
   return [
     {
@@ -61,18 +35,19 @@ export function links() {
       rel: 'preconnect',
       href: 'https://shop.app',
     },
-    {rel: 'icon', type: 'image/svg+xml', href: favicon},
+    {rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg'},
   ];
 }
 
-export async function loader(args: Route.LoaderArgs) {
-  // Start fetching non-critical data without blocking time to first byte
-  const deferredData = loadDeferredData(args);
+export async function loader({context}: Route.LoaderArgs) {
+  const [customerAccessToken, cartId] = await Promise.all([
+    context.session.get('customerAccessToken'),
+  ]);
 
-  // Await the critical data required to render initial state of the page
-  const criticalData = await loadCriticalData(args);
+  const deferredData = loadDeferredData({context});
+  const criticalData = await loadCriticalData({context});
 
-  const {storefront, env} = args.context;
+  const {storefront, env} = context;
 
   return {
     ...deferredData,
@@ -86,59 +61,29 @@ export async function loader(args: Route.LoaderArgs) {
       checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
       storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
       withPrivacyBanner: false,
-      // localize the privacy banner
-      country: args.context.storefront.i18n.country,
-      language: args.context.storefront.i18n.language,
+      country: storefront.i18n.country,
+      language: storefront.i18n.language,
     },
+    isLoggedIn: Boolean(customerAccessToken),
   };
 }
 
-/**
- * Load data necessary for rendering content above the fold. This is the critical data
- * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
- */
-async function loadCriticalData({context}: Route.LoaderArgs) {
+async function loadCriticalData({context}: Pick<Route.LoaderArgs, 'context'>) {
   const {storefront} = context;
 
-  const [header] = await Promise.all([
-    storefront.query(HEADER_QUERY, {
-      cache: storefront.CacheLong(),
-      variables: {
-        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
-      },
-    }),
-    // Add other queries here, so that they are loaded in parallel
-  ]);
+  const layout = await storefront.query(LAYOUT_QUERY, {
+    cache: storefront.CacheLong(),
+  });
 
-  return {header};
+  return {layout};
 }
 
-/**
- * Load data for rendering content below the fold. This data is deferred and will be
- * fetched after the initial page load. If it's unavailable, the page should still 200.
- * Make sure to not throw any errors here, as it will cause the page to 500.
- */
-function loadDeferredData({context}: Route.LoaderArgs) {
-  const {storefront, customerAccount, cart} = context;
+function loadDeferredData({
+  context,
+}: Pick<Route.LoaderArgs, 'context'> & {cartId?: string}) {
+  const {storefront, cart} = context;
 
-  // defer the footer query (below the fold)
-  const footer = storefront
-    .query(FOOTER_QUERY, {
-      cache: storefront.CacheLong(),
-      variables: {
-        footerMenuHandle: 'footer', // Adjust to your footer menu handle
-      },
-    })
-    .catch((error: Error) => {
-      // Log query errors, but don't throw them so the page can still render
-      console.error(error);
-      return null;
-    });
-  return {
-    cart: cart.get(),
-    isLoggedIn: customerAccount.isLoggedIn(),
-    footer,
-  };
+  return {cart: cart.get()};
 }
 
 export function Layout({children}: {children?: React.ReactNode}) {
@@ -149,8 +94,7 @@ export function Layout({children}: {children?: React.ReactNode}) {
       <head>
         <meta charSet="utf-8" />
         <meta name="viewport" content="width=device-width,initial-scale=1" />
-        <link rel="stylesheet" href={resetStyles}></link>
-        <link rel="stylesheet" href={appStyles}></link>
+        <link rel="stylesheet" href={styles}></link>
         <Meta />
         <Links />
       </head>
@@ -176,9 +120,11 @@ export default function App() {
       shop={data.shop}
       consent={data.consent}
     >
-      <PageLayout {...data}>
-        <Outlet />;
-      </PageLayout>
+      <div className="PageLayout">
+        <h1>{data.layout?.shop?.name} (Express example)</h1>
+        <h2>{data.layout?.shop?.description}</h2>
+        <Outlet />
+      </div>
     </Analytics.Provider>
   );
 }
@@ -207,3 +153,19 @@ export function ErrorBoundary() {
     </div>
   );
 }
+
+const CART_QUERY = `#graphql
+  query CartQuery($cartId: ID!, $country: CountryCode, $language: LanguageCode)
+  @inContext(country: $country, language: $language) {
+    cart(id: $cartId) {
+  }
+` as const;
+
+const LAYOUT_QUERY = `#graphql
+  query layout {
+    shop {
+      name
+      description
+    }
+  }
+` as const;
```

### Step 4: server.mjs



#### File: [server.mjs](https://github.com/Shopify/hydrogen/blob/25290311dd1d135ab90bca26fb496d2b92c8631a/cookbook/recipes/express/ingredients/templates/skeleton/server.mjs)

```mjs
import {createRequestHandler} from '@react-router/express';
import {createCookieSessionStorage} from 'react-router';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';
import {createHydrogenContext, InMemoryCache} from '@shopify/hydrogen';

// Don't capture process.env too early - it needs to be accessed after dotenv loads
const getEnv = () => process.env;

let vite;
if (process.env.NODE_ENV !== 'production') {
  const {createServer} = await import('vite');
  vite = await createServer({
    server: {
      middlewareMode: true,
    },
    configFile: 'vite.config.ts',
  });
}

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable('x-powered-by');

// handle asset requests
if (vite) {
  app.use(vite.middlewares);
} else {
  // add morgan here for production only
  // dev uses morgan plugin, otherwise it spams the console with HMR requests
  app.use(morgan('tiny'));
  app.use(
    '/assets',
    express.static('build/client/assets', {immutable: true, maxAge: '1y'}),
  );
}
app.use(express.static('build/client', {maxAge: '1h'}));

// Create the request handler
app.all('*', async (req, res, next) => {
  // Create context with Express req object
  const context = await getContext(req);

  // Create handler with the context
  const handler = createRequestHandler({
    build: vite
      ? () => vite.ssrLoadModule('virtual:react-router/server-build')
      : await import('./build/server/index.js'),
    mode: process.env.NODE_ENV,
    getLoadContext: () => context,
  });

  return handler(req, res, next);
});

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const newPort = parseInt(port) + 1;
    console.log(`Port ${port} is in use, trying ${newPort}...`);
    server.listen(newPort);
  } else {
    throw err;
  }
});

async function getContext(req) {
  const env = getEnv();
  const session = await AppSession.init(req, [env.SESSION_SECRET]);

  // Create a minimal Request object for Node.js
  const request = new Request(`http://localhost${req.url}`, {
    method: req.method,
    headers: req.headers,
  });

  // Create Hydrogen context similar to skeleton, adapted for Node.js
  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache: new InMemoryCache(),
      waitUntil: null, // Not applicable in Node.js
      session,
      i18n: {language: 'EN', country: 'US'},
      cart: {
        // Add a customt cart fragment if needed
        queryFragment: CUSTOM_CART_QUERY,
      },
    },
    // Additional context can be added here
    {},
  );

  return hydrogenContext;
}

const CUSTOM_CART_QUERY = `#graphql
  fragment CartApiQuery on Cart {
    id
    checkoutUrl
    totalQuantity
    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
      email
      phone
    }
    lines(first: $numCartLines) {
      edges {
        node {
          id
          quantity
          attributes {
            key
            value
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
            amountPerQuantity {
              amount
              currencyCode
            }
            compareAtAmountPerQuantity {
              amount
              currencyCode
            }
          }
          merchandise {
            ... on ProductVariant {
              id
              availableForSale
              compareAtPrice {
                amount
                currencyCode
              }
              price {
                amount
                currencyCode
              }
              requiresShipping
              title
              image {
                id
                url
                altText
                width
                height
              }
              product {
                handle
                title
                id
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      totalDutyAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      code
    }
  }

`;

class AppSession {
  constructor(sessionStorage, session) {
    this.sessionStorage = sessionStorage;
    this.session = session;
  }

  static async init(request, secrets) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'session',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets,
      },
    });

    const session = await storage
      .getSession(request.get('Cookie'))
      .catch(() => storage.getSession());

    return new this(storage, session);
  }

  get(key) {
    return this.session.get(key);
  }

  destroy() {
    return this.sessionStorage.destroySession(this.session);
  }

  flash(key, value) {
    this.session.flash(key, value);
  }

  unset(key) {
    this.session.unset(key);
  }

  set(key, value) {
    this.session.set(key, value);
  }

  commit() {
    return this.sessionStorage.commitSession(this.session);
  }
}

```

### Step 6: app/routes/_index.tsx



#### File: /app/routes/_index.tsx

```diff
@@ -1,171 +1,28 @@
-import {
-  Await,
-  useLoaderData,
-  Link,
-} from 'react-router';
-import type {Route} from './+types/_index';
-import {Suspense} from 'react';
-import {Image} from '@shopify/hydrogen';
-import type {
-  FeaturedCollectionFragment,
-  RecommendedProductsQuery,
-} from 'storefrontapi.generated';
-import {ProductItem} from '~/components/ProductItem';
+import {useRouteError, isRouteErrorResponse, Link} from 'react-router';
 
-export const meta: Route.MetaFunction = () => {
-  return [{title: 'Hydrogen | Home'}];
-};
-
-export async function loader(args: Route.LoaderArgs) {
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
-async function loadCriticalData({context}: Route.LoaderArgs) {
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
-function loadDeferredData({context}: Route.LoaderArgs) {
-  const recommendedProducts = context.storefront
-    .query(RECOMMENDED_PRODUCTS_QUERY)
-    .catch((error: Error) => {
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
+      <h1>Hydrogen Express Example</h1>
+      <p>
+        This example shows how to use Hydrogen with Express.js for Node.js
+        deployments instead of Oxygen/Workers.
+      </p>
+      <p>
+        <Link to="/products/the-carbon">View Example Product</Link>
+      </p>
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
+export function ErrorBoundary() {
+  const error = useRouteError();
 
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
-                    <ProductItem key={product.id} product={product} />
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
-
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
+  if (isRouteErrorResponse(error)) {
+    console.error(error.status, error.statusText, error.data);
+    return <div>Route Error</div>;
+  } else {
+    console.error((error as Error).message);
+    return <div>Thrown Error</div>;
   }
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
-    featuredImage {
-      id
-      url
-      altText
-      width
-      height
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
+}
\ No newline at end of file
```

### Step 7: app/routes/products.$handle.tsx



#### File: /app/routes/products.$handle.tsx

```diff
@@ -1,50 +1,7 @@
-import {
-  redirect,
-  useLoaderData,
-} from 'react-router';
+import {useLoaderData} from 'react-router';
 import type {Route} from './+types/products.$handle';
-import {
-  getSelectedProductOptions,
-  Analytics,
-  useOptimisticVariant,
-  getProductOptions,
-  getAdjacentAndFirstAvailableVariants,
-  useSelectedOptionInUrlParam,
-} from '@shopify/hydrogen';
-import {ProductPrice} from '~/components/ProductPrice';
-import {ProductImage} from '~/components/ProductImage';
-import {ProductForm} from '~/components/ProductForm';
-import {redirectIfHandleIsLocalized} from '~/lib/redirect';
 
-export const meta: Route.MetaFunction = ({data}) => {
-  return [
-    {title: `Hydrogen | ${data?.product.title ?? ''}`},
-    {
-      rel: 'canonical',
-      href: `/products/${data?.product.handle}`,
-    },
-  ];
-};
-
-export async function loader(args: Route.LoaderArgs) {
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
-async function loadCriticalData({
-  context,
-  params,
-  request,
-}: Route.LoaderArgs) {
+export async function loader({params, context}: Route.LoaderArgs) {
   const {handle} = params;
   const {storefront} = context;
 
@@ -52,188 +9,42 @@ async function loadCriticalData({
     throw new Error('Expected product handle to be defined');
   }
 
-  const [{product}] = await Promise.all([
-    storefront.query(PRODUCT_QUERY, {
-      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
-    }),
-    // Add other queries here, so that they are loaded in parallel
-  ]);
+  const {product} = await storefront.query(PRODUCT_QUERY, {
+    variables: {handle},
+  });
 
   if (!product?.id) {
     throw new Response(null, {status: 404});
   }
 
-  // The API handle might be localized, so redirect to the localized handle
-  redirectIfHandleIsLocalized(request, {handle, data: product});
-
-  return {
-    product,
-  };
-}
-
-/**
- * Load data for rendering content below the fold. This data is deferred and will be
- * fetched after the initial page load. If it's unavailable, the page should still 200.
- * Make sure to not throw any errors here, as it will cause the page to 500.
- */
-function loadDeferredData({context, params}: Route.LoaderArgs) {
-  // Put any API calls that is not critical to be available on first page render
-  // For example: product reviews, product recommendations, social feeds.
-
-  return {};
+  return {product};
 }
 
 export default function Product() {
-  const {product} = useLoaderData<typeof loader>();
-
-  // Optimistically selects a variant with given available variant information
-  const selectedVariant = useOptimisticVariant(
-    product.selectedOrFirstAvailableVariant,
-    getAdjacentAndFirstAvailableVariants(product),
-  );
-
-  // Sets the search param to the selected variant without navigation
-  // only when no search params are set in the url
-  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);
-
-  // Get the product options array
-  const productOptions = getProductOptions({
-    ...product,
-    selectedOrFirstAvailableVariant: selectedVariant,
-  });
-
-  const {title, descriptionHtml} = product;
+  const {
+    product: {title, descriptionHtml},
+  } = useLoaderData<typeof loader>();
 
   return (
     <div className="product">
-      <ProductImage image={selectedVariant?.image} />
-      <div className="product-main">
-        <h1>{title}</h1>
-        <ProductPrice
-          price={selectedVariant?.price}
-          compareAtPrice={selectedVariant?.compareAtPrice}
-        />
-        <br />
-        <ProductForm
-          productOptions={productOptions}
-          selectedVariant={selectedVariant}
-        />
-        <br />
-        <br />
-        <p>
-          <strong>Description</strong>
-        </p>
-        <br />
-        <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
-        <br />
-      </div>
-      <Analytics.ProductView
-        data={{
-          products: [
-            {
-              id: product.id,
-              title: product.title,
-              price: selectedVariant?.price.amount || '0',
-              vendor: product.vendor,
-              variantId: selectedVariant?.id || '',
-              variantTitle: selectedVariant?.title || '',
-              quantity: 1,
-            },
-          ],
-        }}
-      />
+      <h1>{title}</h1>
+      <br />
+      <p>
+        <strong>Description</strong>
+      </p>
+      <br />
+      <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
+      <br />
     </div>
   );
 }
 
-const PRODUCT_VARIANT_FRAGMENT = `#graphql
-  fragment ProductVariant on ProductVariant {
-    availableForSale
-    compareAtPrice {
-      amount
-      currencyCode
-    }
-    id
-    image {
-      __typename
-      id
-      url
-      altText
-      width
-      height
-    }
-    price {
-      amount
-      currencyCode
-    }
-    product {
-      title
-      handle
-    }
-    selectedOptions {
-      name
-      value
-    }
-    sku
-    title
-    unitPrice {
-      amount
-      currencyCode
-    }
-  }
-` as const;
-
-const PRODUCT_FRAGMENT = `#graphql
-  fragment Product on Product {
-    id
-    title
-    vendor
-    handle
-    descriptionHtml
-    description
-    encodedVariantExistence
-    encodedVariantAvailability
-    options {
-      name
-      optionValues {
-        name
-        firstSelectableVariant {
-          ...ProductVariant
-        }
-        swatch {
-          color
-          image {
-            previewImage {
-              url
-            }
-          }
-        }
-      }
-    }
-    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
-      ...ProductVariant
-    }
-    adjacentVariants (selectedOptions: $selectedOptions) {
-      ...ProductVariant
-    }
-    seo {
-      description
-      title
-    }
-  }
-  ${PRODUCT_VARIANT_FRAGMENT}
-` as const;
-
 const PRODUCT_QUERY = `#graphql
-  query Product(
-    $country: CountryCode
-    $handle: String!
-    $language: LanguageCode
-    $selectedOptions: [SelectedOptionInput!]!
-  ) @inContext(country: $country, language: $language) {
+  query Product( $handle: String!) {
     product(handle: $handle) {
-      ...Product
+      id
+      title
+      descriptionHtml
     }
   }
-  ${PRODUCT_FRAGMENT}
 ` as const;
```

### Step 10: package.json



#### File: /package.json

```diff
@@ -5,58 +5,51 @@
   "version": "2025.5.2",
   "type": "module",
   "scripts": {
-    "build": "shopify hydrogen build --codegen",
-    "dev": "shopify hydrogen dev --codegen",
-    "preview": "shopify hydrogen preview --build",
-    "lint": "eslint --no-error-on-unmatched-pattern .",
+    "build": "react-router typegen && react-router build",
+    "dev": "node ./scripts/dev.mjs",
+    "dev:server": "cross-env NODE_ENV=development nodemon --require dotenv/config ./server.mjs --watch ./server.mjs",
+    "start": "cross-env NODE_ENV=production node ./server.mjs",
     "typecheck": "react-router typegen && tsc --noEmit",
     "codegen": "shopify hydrogen codegen && react-router typegen"
   },
   "prettier": "@shopify/prettier-config",
   "dependencies": {
+    "@react-router/express": "7.9.1",
+    "@react-router/node": "7.9.1",
+    "@remix-run/eslint-config": "^2.16.1",
     "@shopify/hydrogen": "2025.5.0",
+    "compression": "^1.7.4",
+    "cross-env": "^7.0.3",
+    "express": "^4.19.2",
     "graphql": "^16.10.0",
     "graphql-tag": "^2.12.6",
     "isbot": "^5.1.22",
+    "morgan": "^1.10.0",
     "react": "18.3.1",
     "react-dom": "18.3.1",
     "react-router": "7.9.1",
     "react-router-dom": "7.9.1"
   },
   "devDependencies": {
-    "@eslint/compat": "^1.2.5",
-    "@eslint/eslintrc": "^3.2.0",
     "@eslint/js": "^9.18.0",
     "@graphql-codegen/cli": "5.0.2",
     "@react-router/dev": "7.9.1",
     "@react-router/fs-routes": "7.9.1",
     "@shopify/cli": "3.84.1",
     "@shopify/hydrogen-codegen": "^0.3.3",
-    "@shopify/mini-oxygen": "^3.2.1",
-    "@shopify/oxygen-workers-types": "^4.1.6",
-    "@shopify/prettier-config": "^1.1.2",
-    "@total-typescript/ts-reset": "^0.6.1",
-    "@types/eslint": "^9.6.1",
+    "@types/compression": "^1.7.2",
+    "@types/express": "^4.17.17",
+    "@types/morgan": "^1.9.4",
     "@types/react": "^18.2.22",
     "@types/react-dom": "^18.2.7",
-    "@typescript-eslint/eslint-plugin": "^8.21.0",
-    "@typescript-eslint/parser": "^8.21.0",
-    "eslint": "^9.18.0",
-    "eslint-config-prettier": "^10.0.1",
-    "eslint-import-resolver-typescript": "^3.7.0",
-    "eslint-plugin-eslint-comments": "^3.2.0",
-    "eslint-plugin-import": "^2.31.0",
-    "eslint-plugin-jest": "^28.11.0",
-    "eslint-plugin-jsx-a11y": "^6.10.2",
-    "eslint-plugin-react": "^7.37.4",
-    "eslint-plugin-react-hooks": "^5.1.0",
-    "globals": "^15.14.0",
-    "prettier": "^3.4.2",
+    "dotenv": "^16.0.3",
+    "nodemon": "^2.0.22",
+    "npm-run-all": "^4.1.5",
     "typescript": "^5.9.2",
     "vite": "^6.2.4",
     "vite-tsconfig-paths": "^4.3.1"
   },
   "engines": {
-    "node": ">=18.0.0"
+    "node": ">=20.0.0 <22.0.0"
   }
 }
```

### Step 13: vite.config.ts



#### File: /vite.config.ts

```diff
@@ -1,17 +1,18 @@
 import {defineConfig} from 'vite';
 import {hydrogen} from '@shopify/hydrogen/vite';
-import {oxygen} from '@shopify/mini-oxygen/vite';
 import {reactRouter} from '@react-router/dev/vite';
 import tsconfigPaths from 'vite-tsconfig-paths';
 
 export default defineConfig({
-  plugins: [hydrogen(), oxygen(), reactRouter(), tsconfigPaths()],
+  plugins: [hydrogen(), reactRouter(), tsconfigPaths()],
   build: {
     // Allow a strict Content-Security-Policy
     // withtout inlining assets as base64:
     assetsInlineLimit: 0,
+    target: 'esnext',
   },
   ssr: {
+    external: ['fs', 'path', 'stream', 'crypto', 'util'],
     optimizeDeps: {
       /**
        * Include dependencies here if they throw CJS<>ESM errors.
@@ -23,10 +24,7 @@ export default defineConfig({
        * Include 'example-dep' in the array below.
        * @see https://vitejs.dev/config/dep-optimization-options
        */
-      include: ['set-cookie-parser', 'cookie', 'react-router'],
+      include: ['@react-router/node', '@react-router/express'],
     },
   },
-  server: {
-    allowedHosts: ['.tryhydrogen.dev'],
-  },
 });
```

## Deleted Files

- [`templates/skeleton/app/components/AddToCartButton.tsx`](templates/skeleton/app/components/AddToCartButton.tsx)
- [`templates/skeleton/app/components/Aside.tsx`](templates/skeleton/app/components/Aside.tsx)
- [`templates/skeleton/app/components/CartLineItem.tsx`](templates/skeleton/app/components/CartLineItem.tsx)
- [`templates/skeleton/app/components/CartMain.tsx`](templates/skeleton/app/components/CartMain.tsx)
- [`templates/skeleton/app/components/CartSummary.tsx`](templates/skeleton/app/components/CartSummary.tsx)
- [`templates/skeleton/app/components/CartUserErrors.tsx`](templates/skeleton/app/components/CartUserErrors.tsx)
- [`templates/skeleton/app/components/CartWarnings.tsx`](templates/skeleton/app/components/CartWarnings.tsx)
- [`templates/skeleton/app/components/Footer.tsx`](templates/skeleton/app/components/Footer.tsx)
- [`templates/skeleton/app/components/Header.tsx`](templates/skeleton/app/components/Header.tsx)
- [`templates/skeleton/app/components/PageLayout.tsx`](templates/skeleton/app/components/PageLayout.tsx)
- [`templates/skeleton/app/components/PaginatedResourceSection.tsx`](templates/skeleton/app/components/PaginatedResourceSection.tsx)
- [`templates/skeleton/app/components/ProductForm.tsx`](templates/skeleton/app/components/ProductForm.tsx)
- [`templates/skeleton/app/components/ProductImage.tsx`](templates/skeleton/app/components/ProductImage.tsx)
- [`templates/skeleton/app/components/ProductItem.tsx`](templates/skeleton/app/components/ProductItem.tsx)
- [`templates/skeleton/app/components/ProductPrice.tsx`](templates/skeleton/app/components/ProductPrice.tsx)
- [`templates/skeleton/app/components/SearchForm.tsx`](templates/skeleton/app/components/SearchForm.tsx)
- [`templates/skeleton/app/components/SearchFormPredictive.tsx`](templates/skeleton/app/components/SearchFormPredictive.tsx)
- [`templates/skeleton/app/components/SearchResults.tsx`](templates/skeleton/app/components/SearchResults.tsx)
- [`templates/skeleton/app/components/SearchResultsPredictive.tsx`](templates/skeleton/app/components/SearchResultsPredictive.tsx)
- [`templates/skeleton/app/graphql/customer-account/CustomerAddressMutations.ts`](templates/skeleton/app/graphql/customer-account/CustomerAddressMutations.ts)
- [`templates/skeleton/app/graphql/customer-account/CustomerDetailsQuery.ts`](templates/skeleton/app/graphql/customer-account/CustomerDetailsQuery.ts)
- [`templates/skeleton/app/graphql/customer-account/CustomerOrderQuery.ts`](templates/skeleton/app/graphql/customer-account/CustomerOrderQuery.ts)
- [`templates/skeleton/app/graphql/customer-account/CustomerOrdersQuery.ts`](templates/skeleton/app/graphql/customer-account/CustomerOrdersQuery.ts)
- [`templates/skeleton/app/graphql/customer-account/CustomerUpdateMutation.ts`](templates/skeleton/app/graphql/customer-account/CustomerUpdateMutation.ts)
- [`templates/skeleton/app/lib/context.ts`](templates/skeleton/app/lib/context.ts)
- [`templates/skeleton/app/lib/fragments.ts`](templates/skeleton/app/lib/fragments.ts)
- [`templates/skeleton/app/lib/redirect.ts`](templates/skeleton/app/lib/redirect.ts)
- [`templates/skeleton/app/lib/search.ts`](templates/skeleton/app/lib/search.ts)
- [`templates/skeleton/app/lib/session.ts`](templates/skeleton/app/lib/session.ts)
- [`templates/skeleton/app/lib/variants.ts`](templates/skeleton/app/lib/variants.ts)
- [`templates/skeleton/app/routes/$.tsx`](templates/skeleton/app/routes/$.tsx)
- [`templates/skeleton/app/routes/[robots.txt].tsx`](templates/skeleton/app/routes/[robots.txt].tsx)
- [`templates/skeleton/app/routes/[sitemap.xml].tsx`](templates/skeleton/app/routes/[sitemap.xml].tsx)
- [`templates/skeleton/app/routes/account.$.tsx`](templates/skeleton/app/routes/account.$.tsx)
- [`templates/skeleton/app/routes/account._index.tsx`](templates/skeleton/app/routes/account._index.tsx)
- [`templates/skeleton/app/routes/account.addresses.tsx`](templates/skeleton/app/routes/account.addresses.tsx)
- [`templates/skeleton/app/routes/account.orders.$id.tsx`](templates/skeleton/app/routes/account.orders.$id.tsx)
- [`templates/skeleton/app/routes/account.orders._index.tsx`](templates/skeleton/app/routes/account.orders._index.tsx)
- [`templates/skeleton/app/routes/account.profile.tsx`](templates/skeleton/app/routes/account.profile.tsx)
- [`templates/skeleton/app/routes/account.tsx`](templates/skeleton/app/routes/account.tsx)
- [`templates/skeleton/app/routes/account_.authorize.tsx`](templates/skeleton/app/routes/account_.authorize.tsx)
- [`templates/skeleton/app/routes/account_.login.tsx`](templates/skeleton/app/routes/account_.login.tsx)
- [`templates/skeleton/app/routes/account_.logout.tsx`](templates/skeleton/app/routes/account_.logout.tsx)
- [`templates/skeleton/app/routes/api.$version.[graphql.json].tsx`](templates/skeleton/app/routes/api.$version.[graphql.json].tsx)
- [`templates/skeleton/app/routes/blogs.$blogHandle.$articleHandle.tsx`](templates/skeleton/app/routes/blogs.$blogHandle.$articleHandle.tsx)
- [`templates/skeleton/app/routes/blogs.$blogHandle._index.tsx`](templates/skeleton/app/routes/blogs.$blogHandle._index.tsx)
- [`templates/skeleton/app/routes/blogs._index.tsx`](templates/skeleton/app/routes/blogs._index.tsx)
- [`templates/skeleton/app/routes/cart.$lines.tsx`](templates/skeleton/app/routes/cart.$lines.tsx)
- [`templates/skeleton/app/routes/cart.tsx`](templates/skeleton/app/routes/cart.tsx)
- [`templates/skeleton/app/routes/collections.$handle.tsx`](templates/skeleton/app/routes/collections.$handle.tsx)
- [`templates/skeleton/app/routes/collections._index.tsx`](templates/skeleton/app/routes/collections._index.tsx)
- [`templates/skeleton/app/routes/collections.all.tsx`](templates/skeleton/app/routes/collections.all.tsx)
- [`templates/skeleton/app/routes/discount.$code.tsx`](templates/skeleton/app/routes/discount.$code.tsx)
- [`templates/skeleton/app/routes/pages.$handle.tsx`](templates/skeleton/app/routes/pages.$handle.tsx)
- [`templates/skeleton/app/routes/policies.$handle.tsx`](templates/skeleton/app/routes/policies.$handle.tsx)
- [`templates/skeleton/app/routes/policies._index.tsx`](templates/skeleton/app/routes/policies._index.tsx)
- [`templates/skeleton/app/routes/search.tsx`](templates/skeleton/app/routes/search.tsx)
- [`templates/skeleton/app/routes/sitemap.$type.$page[.xml].tsx`](templates/skeleton/app/routes/sitemap.$type.$page[.xml].tsx)
- [`templates/skeleton/app/styles/reset.css`](templates/skeleton/app/styles/reset.css)
- [`templates/skeleton/customer-accountapi.generated.d.ts`](templates/skeleton/customer-accountapi.generated.d.ts)
- [`templates/skeleton/env.d.ts`](templates/skeleton/env.d.ts)
- [`templates/skeleton/server.ts`](templates/skeleton/server.ts)

</recipe_implementation>