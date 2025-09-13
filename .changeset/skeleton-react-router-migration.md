---
'@shopify/hydrogen': major
'@shopify/cli-hydrogen': major
---

Migrate skeleton template to React Router 7.8.x

This major release migrates the Hydrogen skeleton template to React Router 7.8.x, introducing automatic type generation, enhanced type safety, and modernized APIs that leverage React Router's latest features.

## Breaking Changes

### Dependency Changes

The `@shopify/remix-oxygen` package is no longer needed and has been removed:

**Before (package.json):**

```json
"dependencies": {
  "@shopify/hydrogen": "2025.5.0",
  "@shopify/remix-oxygen": "^3.0.0",
  // ...
}
```

**After (package.json):**

```json
"dependencies": {
  "@shopify/hydrogen": "2025.5.0",
  // @shopify/remix-oxygen removed - functionality now in @shopify/hydrogen/oxygen
  // ...
}
```

### Import Path Changes

All route files must update their imports from Remix to React Router:

**Before:**

```typescript
import {redirect, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from '@remix-run/react';
```

**After:**

```typescript
import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/route-name';
```

### Context Creation Pattern

The context creation has been renamed and restructured:

**Before:**

```typescript
// app/lib/context.ts
export async function createAppLoadContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  const hydrogenContext = createHydrogenContext({
    env,
    request,
    cache,
    waitUntil,
    session,
    i18n: {language: 'EN', country: 'US'},
    cart: {
      queryFragment: CART_QUERY_FRAGMENT,
    },
  });

  return {
    ...hydrogenContext,
    // declare additional Remix loader context
  };
}
```

**After:**

```typescript
// app/lib/context.ts
import {createHydrogenContext} from '@shopify/hydrogen';

// Define the additional context object
const additionalContext = {
  // Additional context for custom properties, CMS clients, 3P SDKs, etc.
  // These will be available as both context.propertyName and context.get(propertyContext)
} as const;

// Automatically augment HydrogenAdditionalContext with the additional context type
type AdditionalContextType = typeof additionalContext;

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}
}

export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
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
    additionalContext,
  );

  return hydrogenContext;
}
```

### Server Entry Changes

The server.ts now uses `createRequestHandler` from `@shopify/hydrogen/oxygen` and React Router's virtual build import:

**Before:**

```typescript
// server.ts
import {createRequestHandler} from '@shopify/remix-oxygen';
import {createAppLoadContext} from '~/lib/context';

export default {
  async fetch(request, env, executionContext) {
    const appLoadContext = await createAppLoadContext(
      request,
      env,
      executionContext,
    );

    const handleRequest = createRequestHandler({
      build: await import(/* @vite-ignore */ './build/server/index.js'),
      mode: process.env.NODE_ENV,
      getLoadContext: () => appLoadContext,
    });

    return handleRequest(request);
  },
};
```

**After:**

```typescript
// server.ts
import {createRequestHandler} from '@shopify/hydrogen/oxygen'; // New import source!
import {createHydrogenRouterContext} from '~/lib/context';

export default {
  async fetch(request, env, executionContext) {
    const hydrogenContext = await createHydrogenRouterContext(
      request,
      env,
      executionContext,
    );

    const handleRequest = createRequestHandler({
      // React Router 7.8.x uses virtual imports for the server build
      build: await import('virtual:react-router/server-build'),
      mode: process.env.NODE_ENV,
      getLoadContext: () => hydrogenContext,
    });

    return handleRequest(request);
  },
};
```

### Route Type Pattern Changes

All routes now use React Router's automatic type generation:

**Before:**

```typescript
export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: data?.product?.title}];
};

export async function loader({params, context}: LoaderFunctionArgs) {
  const handle = params.handle; // string | undefined
  // ...
}
```

**After:**

```typescript
import type {Route} from './+types/products.$handle';

export const meta: Route.MetaFunction = ({data}) => {
  return [{title: data?.product?.title}];
};

export async function loader({params, context}: Route.LoaderArgs) {
  const handle = params.handle; // string - automatically typed as required!
  // ...
}
```

## New Features

### Automatic Type Generation

React Router 7.8.x automatically generates TypeScript types for every route, providing:

- Type-safe params (knows which params are required vs optional)
- Fully typed loader/action data in components
- Automatic IntelliSense for all route exports
- No more manual type assertions needed

### Zero-Config Setup with Hydrogen Preset

```typescript
// react-router.config.ts
import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';
import type {Config} from '@react-router/dev/config';

export default {
  presets: [hydrogenPreset()],
} satisfies Config;
```

## Migration Guide

1. **Update package.json scripts** - Already configured in skeleton
2. **Update imports in all route files** - Replace Remix imports with React Router
3. **Use Route type imports** - Import `type {Route}` from generated types
4. **Update context creation** - Rename to `createHydrogenRouterContext`
5. **Update server.ts** - Use `virtual:react-router/server-build` import
6. **Add react-router.config.ts** - Use the hydrogenPreset for zero-config setup
