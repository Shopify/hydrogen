# Hydrogen React Router 7 Context Integration

## Overview

This document outlines the analysis and implementation approach for integrating Hydrogen's `createHydrogenContext` with React Router 7's native context system using `unstable_RouterContextProvider` and `unstable_createContext`.

## Background

### Current State (Working Implementation)

We successfully implemented React Router 7 middleware support with Hydrogen by:

1. **Server Setup**: Modified `server.ts` to use `unstable_RouterContextProvider`
2. **Context Wrapping**: Preserved entire Hydrogen context as `routerContextProvider.set('hydrogen', appLoadContext)`
3. **Access Pattern**: Used backward-compatible pattern `context.get ? context.get('hydrogen') : context`
4. **Template Updates**: Updated all loaders to use the conditional access pattern

**Key Success**: All Hydrogen functionality works with React Router 7 middleware, including:
- ✅ Storefront GraphQL queries
- ✅ Cart operations  
- ✅ Customer authentication
- ✅ Environment variables
- ✅ Session management
- ✅ All dev/preview/build commands

## The Problems with Current Implementation

The current implementation has multiple issues that need to be addressed:

### 1. Ugly Conditional Pattern

The current implementation requires this ugly conditional pattern everywhere:

```typescript
// Terrible pattern we want to eliminate
const hydrogenContext = context.get ? context.get('hydrogen') : context;
const {storefront, cart, customerAccount} = hydrogenContext;
```

This pattern is:
- ❌ **Verbose and repetitive**
- ❌ **Framework fighting** - working against React Router patterns
- ❌ **Type unsafe** - conditional logic breaks IntelliSense
- ❌ **Maintenance burden** - needs to be everywhere

### 2. Magic String Anti-Pattern

**Current Implementation Uses Plain Strings as Keys:**

```typescript
// In server.ts - setting with magic string
const routerContextProvider = new unstable_RouterContextProvider();
routerContextProvider.set('hydrogen', appLoadContext); // ← STRING KEY!

// In loaders - getting with magic string
const hydrogenContext = context.get('hydrogen'); // ← STRING LOOKUP!
```

**What Actually Happens Under the Hood:**
```typescript
// RouterContextProvider internally works like a Map
class RouterContextProvider {
  private map = new Map();
  
  set(key: any, value: any) {
    this.map.set(key, value); // key = 'hydrogen', value = appLoadContext
  }
  
  get(key: any) {
    return this.map.get(key); // key = 'hydrogen' → returns appLoadContext
  }
}
```

**Problems with Magic Strings:**
- ❌ **No Type Safety**: `'hydrogen'` is just a string - no IntelliSense, no compile-time checks
- ❌ **Easy Typos**: `'hydorgen'`, `'Hydrogen'`, `'hyrogen'` all fail silently
- ❌ **No Collision Protection**: Nothing prevents key conflicts or overwrites
- ❌ **Runtime Errors Only**: Mistakes only discovered when code executes
- ❌ **Not React Router's Intended Pattern**: We're using strings instead of proper context keys

**React Router's Intended Pattern (Type-Safe):**
```typescript
// Create typed context key (not a string!)
const hydrogenContextKey = unstable_createContext<AppLoadContext>();

// Set with the context key
provider.set(hydrogenContextKey, appLoadContext);

// Get with the context key - fully type-safe!
const appLoadContext = context.get(hydrogenContextKey); // Returns AppLoadContext, not any
```

### 3. Why Our Current Approach "Works" (But Shouldn't)

Our string-based approach works because:
- `RouterContextProvider.set()` accepts any key (including strings)  
- `context.get()` accepts any key and returns the stored value
- We're consistent about using the same string `'hydrogen'`

**But we're essentially treating RouterContextProvider like `Map<string, any>` instead of using React Router's type-safe context system!**

## React Router 7 Context System Analysis

### React Router's Context vs React's Context

**React Router's `unstable_createContext` (Server-side context for loaders/actions):**
```typescript
import { unstable_createContext, unstable_RouterContextProvider } from 'react-router';

// Designed for RouterContextProvider
const userContext = unstable_createContext<User>();

// Usage in server context
const provider = new unstable_RouterContextProvider();
provider.set(userContext, currentUser);

// Access in loaders/actions
const user = context.get(userContext);
```

**React's `createContext` (Component-level context):**
```typescript
import { createContext, useContext } from 'react';

// Designed for React components
const UserContext = createContext<User | null>(null);

// Usage in components
<UserContext.Provider value={user}>
  <Outlet />
</UserContext.Provider>

const user = useContext(UserContext);
```

**Key Distinction**: React Router's context system is specifically designed for server-side loader/action context, while React's context is for component trees.

## Proposed Solution: Native React Router Integration

### Architecture Decision

**Make `createHydrogenContext` natively integrate with React Router 7's context system** by:

1. Always returning `unstable_RouterContextProvider`
2. Using React Router's `unstable_createContext` for individual services
3. Providing both native React Router access AND backward compatibility

### Implementation Approach

#### Step 1: Create React Router Context Keys

```typescript
// In @shopify/hydrogen - export these context keys
import { unstable_createContext } from 'react-router';

export const storefrontContext = unstable_createContext<StorefrontClient>();
export const cartContext = unstable_createContext<CartHandler>();
export const customerAccountContext = unstable_createContext<CustomerAccount>();
export const envContext = unstable_createContext<HydrogenEnv>();
export const sessionContext = unstable_createContext<HydrogenSession>();
export const waitUntilContext = unstable_createContext<(promise: Promise<unknown>) => void>();
```

#### Step 2: Transform `createHydrogenContext`

```typescript
export async function createHydrogenContext(options: HydrogenContextOptions) {
  // Always return RouterContextProvider
  const provider = new unstable_RouterContextProvider();
  
  // Create Hydrogen services (unchanged logic)
  const {storefront} = createStorefrontClient(options);
  const cart = createCartHandler(options);
  const customerAccount = createCustomerAccount(options);
  const session = options.session;
  const env = options.env;
  const waitUntil = options.waitUntil;
  
  // Set in React Router's native context system
  provider.set(storefrontContext, storefront);
  provider.set(cartContext, cart);
  provider.set(customerAccountContext, customerAccount);
  provider.set(envContext, env);
  provider.set(sessionContext, session);
  provider.set(waitUntilContext, waitUntil);
  
  // HYBRID: Also expose as direct properties for backward compatibility
  provider.storefront = storefront;
  provider.cart = cart;
  provider.customerAccount = customerAccount;
  provider.env = env;
  provider.session = session;
  provider.waitUntil = waitUntil;
  
  return provider;
}
```

#### Step 3: Clean Loader Usage

```typescript
// Option A: React Router 7 native pattern (recommended for new code)
export async function loader({context}: LoaderFunctionArgs) {
  const storefront = context.get(storefrontContext);
  const cart = context.get(cartContext);
  const env = context.get(envContext);
  
  const products = await storefront.query(PRODUCTS_QUERY);
  return {products};
}

// Option B: Direct property access (backward compatible)
export async function loader({context}: LoaderFunctionArgs) {
  const {storefront, cart, env} = context;
  
  const products = await storefront.query(PRODUCTS_QUERY);
  return {products};
}

// Option C: Mixed pattern
export async function loader({context}: LoaderFunctionArgs) {
  const storefront = context.storefront; // Direct access
  const myCustomService = context.get(myCustomContext); // 3rd party extension
  
  const products = await storefront.query(PRODUCTS_QUERY);
  return {products};
}
```

## Benefits of Native Integration

### For Hydrogen Users
- ✅ **No breaking changes** - `context.storefront` continues working
- ✅ **Clean patterns** - no more ugly conditionals
- ✅ **Type safety** - full IntelliSense support
- ✅ **Future proof** - built on React Router 7 foundations

### For Third-Party Developers
- ✅ **Extensibility** - can add custom contexts via `context.set(myContext, myService)`
- ✅ **Type safety** - React Router's context system is strongly typed
- ✅ **React Router native** - works seamlessly with middleware

### For Framework Evolution
- ✅ **React Router alignment** - uses React Router patterns correctly
- ✅ **Middleware ready** - native support for React Router 7 middleware
- ✅ **Scalable** - clean architecture for future enhancements

## Migration Strategy

### Phase 1: Implement Hybrid Pattern (Non-breaking)
- Transform `createHydrogenContext` to return RouterContextProvider with property access
- Maintain all existing APIs
- Update internal templates to use clean patterns
- Document new patterns

### Phase 2: Encourage New Patterns (Optional)
- Add TypeScript deprecation warnings for old patterns
- Provide codemods for automatic migration
- Update documentation and examples

### Phase 3: Long-term Evolution (Future)
- Eventually deprecate hybrid pattern in favor of pure React Router contexts
- Maintain backward compatibility through adapter patterns

## Technical Deep Dive: Storefront Client Analysis

### Current Storefront Client Implementation

The `context.storefront` provides a comprehensive GraphQL client:

**Core Operations:**
- `storefront.query(query, options)` - GraphQL queries with caching
- `storefront.mutate(mutation, options)` - GraphQL mutations

**Caching Strategies:**
- `storefront.cache` - Manual cache management
- `storefront.CacheNone()`, `CacheLong()`, `CacheShort()`, `CacheCustom()`

**Configuration and Headers:**
- `storefront.i18n` - Internationalization data (country, language)
- `storefront.getPublicTokenHeaders()` - API authentication
- `storefront.getApiUrl()` - Domain utilities

### Request-Specific Considerations

**Critical Aspects:**
1. **Per-request Headers**: `buyerIp`, `cookie`, `requestGroupId` from current request
2. **Cache Isolation**: Each request gets isolated cache to prevent data leaks
3. **Session Integration**: Session cookies flow through to API headers
4. **Request Tracking**: Unique request group ID for debugging

**React Router Context Compatibility:**
- ✅ **Per-request creation** - storefront client created fresh for each request
- ✅ **Stateless design** - no shared mutable state between requests
- ✅ **Type safety** - strongly typed through context keys
- ✅ **Performance** - minimal overhead from context system

### Transformation Impact Analysis

**No Fundamental Changes Needed:**
- Storefront client creation logic remains unchanged
- Request-specific initialization preserved
- All API methods and properties maintained
- Caching and session integration preserved

**Enhanced Patterns Available:**
- Native React Router context access
- Type-safe third-party extensions
- Middleware-friendly architecture
- Clean separation of concerns

## Implementation Status

### ✅ Completed (Current Working State)
- React Router 7 middleware detection and configuration
- Environment variable injection and access patterns
- RouterContextProvider setup in server.ts
- Root and child loader context access patterns
- Full Hydrogen storefront functionality with middleware
- Test middleware route validation

### 🔄 Recommended Next Steps
1. **Create React Router context keys** for Hydrogen services
2. **Transform createHydrogenContext** to use hybrid pattern
3. **Update skeleton templates** to use clean access patterns
4. **Add TypeScript definitions** for enhanced type safety
5. **Create migration guides** and documentation
6. **Validate across all route types** (products, collections, cart, account)

## Conclusion

The proposed native React Router 7 integration represents a significant architectural improvement that:

- **Eliminates ugly conditional patterns** while maintaining backward compatibility
- **Aligns with React Router 7 best practices** and middleware system
- **Preserves all existing Hydrogen functionality** and performance characteristics
- **Enables clean extensibility** for third-party developers
- **Provides a clear evolution path** for the framework

This approach transforms Hydrogen from fighting React Router 7 patterns to being a first-class citizen of the React Router 7 ecosystem, while maintaining the developer experience that makes Hydrogen powerful for ecommerce applications.