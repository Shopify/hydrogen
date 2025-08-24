# Environment Variables Requirements for React Router 7 Middleware

## Overview
This documents the environment variable flow and requirements when using React Router 7 middleware with Hydrogen.

## Environment Variable Flow

### 1. CLI Injection (hydrogen dev/preview)
Environment variables are injected by the Hydrogen CLI into MiniOxygen:

```
LOCAL .env FILE → Hydrogen CLI → MiniOxygen → Worker Runtime → server.ts fetch handler
```

**Confirmed working**: ✅ Environment variables are properly injected as shown in CLI output:
```
Environment variables injected into MiniOxygen:
SESSION_SECRET, PUBLIC_STOREFRONT_ID, PUBLIC_STOREFRONT_API_TOKEN, 
PUBLIC_STORE_DOMAIN, PRIVATE_STOREFRONT_API_TOKEN, etc.
```

### 2. Server Context Creation
In `server.ts`, the `env` parameter from the Worker Runtime is passed to `createAppLoadContext`:

```typescript
export default {
    async fetch(request, env, executionContext) {
        const appLoadContext = await createAppLoadContext(request, env, executionContext);
        // env contains all injected environment variables
    }
}
```

### 3. RouterContextProvider Integration
With React Router 7 middleware, environment variables are accessible via:

```typescript
// server.ts
const routerContextProvider = new unstable_RouterContextProvider();
routerContextProvider.set('hydrogen', appLoadContext); // Contains env

// In loaders/actions
const hydrogenContext = context.get ? context.get('hydrogen') : context;
const env = hydrogenContext.env; // All environment variables available here
```

## Required Environment Variables

Per `HydrogenEnv` interface, these are mandatory:

```typescript
interface HydrogenEnv {
  SESSION_SECRET: string;                          // Session encryption
  PUBLIC_STOREFRONT_API_TOKEN: string;            // Storefront API queries  
  PRIVATE_STOREFRONT_API_TOKEN: string;           // Admin-level operations
  PUBLIC_STORE_DOMAIN: string;                    // Store domain
  PUBLIC_STOREFRONT_ID: string;                   // Storefront identifier
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string; // Customer auth
  PUBLIC_CUSTOMER_ACCOUNT_API_URL: string;       // Customer API endpoint
  PUBLIC_CHECKOUT_DOMAIN: string;                // Checkout domain
  SHOP_ID: string;                               // Shop identifier
}
```

## Context Access Patterns

### Before (Direct Context)
```typescript
// Old Remix pattern
export async function loader({context}: LoaderFunctionArgs) {
  const {storefront, env} = context;
  const checkoutDomain = env.PUBLIC_CHECKOUT_DOMAIN;
}
```

### After (RouterContextProvider)
```typescript
// React Router 7 with backward compatibility
export async function loader({context}: LoaderFunctionArgs) {
  const hydrogenContext = context.get ? context.get('hydrogen') : context;
  const {storefront, env} = hydrogenContext;
  const checkoutDomain = env.PUBLIC_CHECKOUT_DOMAIN;
}
```

## Migration Status

### ✅ Working
- Environment variable injection from CLI
- Context creation with all env vars
- RouterContextProvider setup  
- Backward compatible access patterns
- Root loader functionality
- Storefront queries and operations

### 🔄 In Progress  
- Middleware route testing
- Entry server context migration
- TypeScript type definitions

## Critical Notes

1. **Monolithic Context Preservation**: Keep the full Hydrogen context intact to preserve all interdependencies between `storefront`, `cart`, `customerAccount`, `env`, `session`, and `waitUntil`.

2. **Backward Compatibility**: The `context.get ? context.get('hydrogen') : context` pattern ensures applications work with or without middleware enabled.

3. **No Type Casting**: Avoid `as any` or type casting - use proper TypeScript patterns for context access.

4. **Session Handling**: Session commit still works through `appLoadContext.session.isPending` in server.ts response handling.