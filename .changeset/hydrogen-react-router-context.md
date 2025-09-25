---
'@shopify/hydrogen': major
---

Add React Router 7.9.2 support infrastructure with full compatibility for both context access patterns.

## New `createRequestHandler` Export from `/oxygen`

Hydrogen now provides its own `createRequestHandler` that wraps React Router's implementation:

```diff
// server.ts
- import {createRequestHandler} from '@shopify/remix-oxygen';
+ import {createRequestHandler} from '@shopify/hydrogen/oxygen';
```

This new handler:
- Uses React Router's `createRequestHandler` internally
- Adds Hydrogen-specific request validation
- Includes powered-by headers
- Handles double-slash URL normalization

## New `react-router-preset` Export

Configure React Router with Hydrogen's optimized settings:

```ts
// react-router.config.ts
import type {Config} from '@react-router/dev/config';
import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';

export default {
  presets: [hydrogenPreset()],
} satisfies Config;
```

The preset provides:
- Optimized build settings for Oxygen deployment
- Proper server/client module resolution
- Performance-tuned bundling configuration

## Enhanced TypeScript Support with `HydrogenRouterContextProvider`

Improved type safety for entry.server.tsx with the new `HydrogenRouterContextProvider` type:

```diff
// app/entry.server.tsx
- import type {AppLoadContext} from '@shopify/remix-oxygen';
import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
+ type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
- context: AppLoadContext,
+ context: HydrogenRouterContextProvider,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
  });

  // Rest of the implementation remains the same
  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
    },
  );
}
```

The `HydrogenRouterContextProvider` type provides better type safety and IntelliSense for all Hydrogen services in your React Router context. Additionally, `NonceProvider` is now exported directly from `@shopify/hydrogen` for advanced use cases.

## New Context Access Patterns

### Pattern 1: Direct Context Access (Existing)
Continue using direct destructuring from context - no changes needed:

```ts
// app/routes/_index.tsx
export async function loader({context}: Route.LoaderArgs) {
  // Direct access - works as before
  const {storefront, cart, env} = context;
  
  const data = await storefront.query(QUERY);
  const cartData = await cart.get();
  
  return {data, cart: cartData};
}
```

### Pattern 2: Context Registry Pattern (New)
Use the new `hydrogenContext` registry with React Router 7.9's `context.get()`:

```diff
// app/routes/products.$handle.tsx
+ import {hydrogenContext} from '@shopify/hydrogen';

export async function loader({context}: Route.LoaderArgs) {
- // Direct destructuring
- const {storefront, cart, session, env} = context;
+ // Registry-based access - new pattern
+ const storefront = context.get(hydrogenContext.storefront);
+ const cart = context.get(hydrogenContext.cart);
+ const session = context.get(hydrogenContext.session);
+ const env = context.get(hydrogenContext.env);
  
  const product = await storefront.query(PRODUCT_QUERY);
  return {product};
}

export async function action({context}: Route.ActionArgs) {
- const {cart} = context;
+ const cart = context.get(hydrogenContext.cart);
  return await cart.addLines([...]);
}
```

Available context keys in `hydrogenContext`:
- `hydrogenContext.storefront` - Storefront API client
- `hydrogenContext.customerAccount` - Customer Account API client  
- `hydrogenContext.cart` - Cart handler instance
- `hydrogenContext.env` - Environment variables
- `hydrogenContext.waitUntil` - Oxygen waitUntil for background tasks
- `hydrogenContext.session` - Session storage handler

## New `createHydrogenContext` Helper Function

Simplified context creation with automatic hybrid access pattern support:

```ts
// app/lib/context.ts
import {createHydrogenContext} from '@shopify/hydrogen';
import {AppSession} from '~/lib/session';
import {CART_QUERY_FRAGMENT} from '~/lib/fragments';

// Optional: Define additional context for third-party services
const additionalContext = {
  // CMS clients, review systems, analytics, etc.
  // cms: await createCMSClient(env),
  // reviews: await createReviewsClient(env),
} as const;

// Auto-augment types for TypeScript IntelliSense
declare global {
  interface HydrogenAdditionalContext extends typeof additionalContext {}
}

export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  const waitUntil = executionContext.waitUntil.bind(executionContext);
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
  ]);

  // Create unified context with all Hydrogen services
  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache,
      waitUntil,
      session,
      i18n: {language: 'EN', country: 'US'},
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
    },
    additionalContext, // Optional additional services
  );

  return hydrogenContext; // Supports both direct access and context.get()
}
```

Then use in server.ts:

```diff
// server.ts
import {storefrontRedirect} from '@shopify/hydrogen';
- import {createRequestHandler} from '@shopify/remix-oxygen';
+ import {createRequestHandler} from '@shopify/hydrogen/oxygen';
+ import {createHydrogenRouterContext} from '~/lib/context';

export default {
  async fetch(request, env, executionContext) {
-   // Manual context creation with individual services
-   const context = {
-     storefront: createStorefrontClient(...),
-     cart: createCartHandler(...),
-     // ... etc
-   };
+   // Automatic context creation with hybrid access support
+   const hydrogenContext = await createHydrogenRouterContext(
+     request,
+     env,
+     executionContext,
+   );

    const handleRequest = createRequestHandler({
-     build: remixBuild,
+     // React Router 7.9.x server build
+     build: await import('virtual:react-router/server-build'),
      mode: process.env.NODE_ENV,
-     getLoadContext: () => context,
+     getLoadContext: () => hydrogenContext,
    });

    return handleRequest(request);
  },
};
```

The new `createRequestHandler` from `@shopify/hydrogen/oxygen` wraps React Router's handler with additional Hydrogen-specific functionality like powered-by headers and request validation.

