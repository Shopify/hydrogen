# React Router 7.8.x Full Context Provider Implementation

Based on our conversation logs and examination of React Router 7.8.x documentation, here's what we discovered and need to implement for complete React Router context integration:

## Research Findings from React Router 7.8.x Documentation

### unstable_RouterContextProvider API Surface
From https://reactrouter.com/api/utils/RouterContextProvider:

**Core Methods:**
- `set(context, value)`: Writes a value to a specific context
- `get(context)`: Retrieves a value from a specific context

**Characteristics:**
- Experimental API subject to breaking changes
- Provides methods for writing/reading values in application context
- Primarily used with middleware
- Type-safe context management
- Available only in Framework and Data modes
- Not available in Declarative mode

**Example Usage Pattern:**
```typescript
const userContext = unstable_createContext<User | null>(null);
const contextProvider = new unstable_RouterContextProvider();
contextProvider.set(userContext, getUser());
const user = contextProvider.get(userContext);
```

## Current Implementation Status

### ✅ What We Already Implemented

1. **Basic Module Augmentation** - `/packages/hydrogen/react-router.d.ts`:
```typescript
import type { HydrogenRouterContextProvider, HydrogenSessionData } from './production/index';
import type { HydrogenEnv } from './production/index';

declare module 'react-router' {
  interface unstable_RouterContextProvider extends HydrogenRouterContextProvider {}
  interface SessionData extends HydrogenSessionData {}
}

declare global {
  interface Env extends HydrogenEnv {}
}
```

2. **HydrogenContext Interface** - `/packages/hydrogen/src/createHydrogenContext.ts`:
```typescript
export interface HydrogenContext<
  TSession extends HydrogenSession = HydrogenSession,
  TCustomMethods extends CustomMethodsBase | undefined = {},
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
> {
  storefront: StorefrontClient<TI18n>['storefront'];
  customerAccount: CustomerAccount;
  cart: TCustomMethods extends CustomMethodsBase
    ? HydrogenCartCustom<TCustomMethods>
    : HydrogenCart;
  env: TEnv;
  waitUntil?: WaitUntil;
  session: TSession;
}
```

### ❌ What's Missing: HydrogenRouterContextProvider Interface

The `HydrogenRouterContextProvider` interface referenced in our module augmentation doesn't exist yet. We need to create it to properly extend React Router's `unstable_RouterContextProvider` with Hydrogen-specific properties.

## Required Implementation

### 1. Create HydrogenRouterContextProvider Interface

We need to create an interface that:
- Extends React Router's `unstable_RouterContextProvider` 
- Includes all Hydrogen context properties
- Supports React Router 7.8.x future and stable flags
- Maintains backward compatibility

**Location**: `/packages/hydrogen/src/types.d.ts` or new dedicated file

```typescript
import type { unstable_RouterContextProvider } from 'react-router';

export interface HydrogenRouterContextProvider<
  TSession extends HydrogenSession = HydrogenSession,
  TCustomMethods extends CustomMethodsBase | undefined = {},
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
> extends unstable_RouterContextProvider {
  /** A GraphQL client for querying the Storefront API */
  storefront: StorefrontClient<TI18n>['storefront'];
  /** A GraphQL client for querying the Customer Account API */
  customerAccount: CustomerAccount;
  /** A collection of utilities used to interact with the cart */
  cart: TCustomMethods extends CustomMethodsBase
    ? HydrogenCartCustom<TCustomMethods>
    : HydrogenCart;
  /** Environment variables from the fetch function */
  env: TEnv;
  /** The waitUntil function for keeping requests alive */
  waitUntil?: WaitUntil;
  /** Session implementation */
  session: TSession;
}
```

### 2. Export the Type from Index

**Update**: `/packages/hydrogen/src/index.ts`
```typescript
export type { HydrogenRouterContextProvider } from './types';
// or from wherever we define it
```

### 3. Create Context Provider Factory Function

We might need a factory function that creates a proper React Router context provider:

```typescript
export function createHydrogenRouterContextProvider<
  TSession extends HydrogenSession = HydrogenSession,
  TCustomMethods extends CustomMethodsBase | undefined = {},
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
>(
  hydrogenContext: HydrogenContext<TSession, TCustomMethods, TI18n, TEnv>
): HydrogenRouterContextProvider<TSession, TCustomMethods, TI18n, TEnv> {
  // Implementation that creates a provider compatible with React Router's unstable_RouterContextProvider
  // This would need to implement the set/get methods while providing direct property access
}
```

### 4. Future React Router 7.8.x Compatibility

To support future and stable flags in React Router 7.8.x, we should extend our interface to support:

```typescript
export interface HydrogenRouterContextProvider<...> extends unstable_RouterContextProvider {
  // Current Hydrogen properties...
  
  // React Router 7.8.x future flags support
  future?: {
    // Add any future flags that React Router 7.8.x might introduce
    unstable_optimisticRouting?: boolean;
    unstable_asyncDataFetching?: boolean;
    // etc.
  };
  
  // React Router 7.8.x stable features
  // (These would be added as React Router stabilizes features)
}
```

## Integration Points

### Where React Router Uses Context Provider

Based on our conversation, React Router 7 with middleware uses:
- `Readonly<unstable_RouterContextProvider>` as the context type in loaders/actions
- This is why our module augmentation works by extending `unstable_RouterContextProvider`

### Middleware Integration

The context provider would need to work with React Router middleware patterns:

```typescript
// In entry.server.tsx or similar
import { createHydrogenRouterContextProvider } from '@shopify/hydrogen';

export default function (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  context: HydrogenRouterContextProvider, // Now properly typed
) {
  // Server rendering with typed context
}
```

## Development Strategy

1. **Phase 1**: Create the basic `HydrogenRouterContextProvider` interface
2. **Phase 2**: Implement the context provider factory function  
3. **Phase 3**: Add React Router 7.8.x future flags support
4. **Phase 4**: Test integration with all React Router context methods (`set`/`get`)
5. **Phase 5**: Validate backwards compatibility with existing patterns

## Key Insights from Our Work

1. **React Router 7 uses `unstable_RouterContextProvider`** - not `AppLoadContext`
2. **Module augmentation is the right approach** - extends React Router's type system
3. **Direct property access works** - `context.storefront.query()` pattern is maintained  
4. **Workspace resolution needs `preserveSymlinks: true`** - for monorepo environments
5. **Build system needs to copy augmentation files** - for proper dist distribution

## Documentation References

- React Router Context Provider: https://reactrouter.com/api/utils/RouterContextProvider
- Our implementation: `/packages/hydrogen/react-router.d.ts`
- Build configuration: `/packages/hydrogen/tsup.config.ts`
- Package exports: `/packages/hydrogen/package.json`

---

**Status**: Interface definition needed to complete React Router 7.8.x integration
**Priority**: High - required for proper TypeScript support
**Complexity**: Medium - needs to bridge React Router's context API with Hydrogen's direct access patterns