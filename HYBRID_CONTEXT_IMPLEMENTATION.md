# Hybrid React Router Context Implementation Plan

Based on our analysis of `HYDROGEN_REACT_ROUTER_CONTEXT.md` and what we currently have implemented, here's the plan to achieve the optimal hybrid approach.

## Current State ✅

**What we already implemented (via module augmentation):**
```typescript
// Direct property access works
export async function loader({context}: LoaderFunctionArgs) {
  const {storefront, cart, customerAccount, env, session} = context;
  const products = await storefront.query(PRODUCTS_QUERY);
  return {products};
}
```

**Files we already have:**
- ✅ `/packages/hydrogen/react-router.d.ts` - Module augmentation
- ✅ `/packages/hydrogen/tsup.config.ts` - Build configuration 
- ✅ `/packages/hydrogen/package.json` - Export configuration
- ✅ `/templates/skeleton/env.d.ts` - Type references
- ✅ `/templates/skeleton/tsconfig.json` - preserveSymlinks config

## Missing Implementation ❌

**What we need to add (React Router context keys):**

### 1. Create React Router Context Keys

**New file**: `/packages/hydrogen/src/context-keys.ts`
```typescript
import { unstable_createContext } from 'react-router';
import type { 
  StorefrontClient, 
  CustomerAccount, 
  HydrogenCart, 
  HydrogenCartCustom,
  HydrogenEnv,
  HydrogenSession,
  WaitUntil,
  CustomMethodsBase,
  I18nBase
} from './types';

// React Router native context keys - strongly typed
export const storefrontContext = unstable_createContext<StorefrontClient>();
export const cartContext = unstable_createContext<HydrogenCart | HydrogenCartCustom<any>>();
export const customerAccountContext = unstable_createContext<CustomerAccount>();
export const envContext = unstable_createContext<HydrogenEnv>();
export const sessionContext = unstable_createContext<HydrogenSession>();
export const waitUntilContext = unstable_createContext<WaitUntil>();
```

### 2. Create HydrogenRouterContextProvider Interface

**Update**: `/packages/hydrogen/src/types.d.ts`
```typescript
import type { unstable_RouterContextProvider } from 'react-router';
import type { StorefrontClient, CustomerAccount, /* ... other imports */ } from './createHydrogenContext';

export interface HydrogenRouterContextProvider<
  TSession extends HydrogenSession = HydrogenSession,
  TCustomMethods extends CustomMethodsBase | undefined = {},
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
> extends unstable_RouterContextProvider {
  // Direct property access (what we already have working)
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

### 3. Transform createHydrogenContext to Hybrid Pattern

**Update**: `/packages/hydrogen/src/createHydrogenContext.ts`
```typescript
import { unstable_RouterContextProvider } from 'react-router';
import { 
  storefrontContext,
  cartContext, 
  customerAccountContext,
  envContext,
  sessionContext,
  waitUntilContext
} from './context-keys';

export function createHydrogenContext<
  TSession extends HydrogenSession = HydrogenSession,
  TCustomMethods extends CustomMethodsBase | undefined = {},
  TI18n extends I18nBase = I18nBase,
  TEnv extends HydrogenEnv = Env,
>(
  options: HydrogenContextOptions<TSession, TCustomMethods, TI18n, TEnv>,
): HydrogenRouterContextProvider<TSession, TCustomMethods, TI18n, TEnv> {
  // Create Hydrogen services (existing logic unchanged)
  const {storefront} = createStorefrontClient(options);
  const cart = createCartHandler(options);
  const customerAccount = createCustomerAccountClient(options);
  const {env, session, waitUntil} = options;

  // Create RouterContextProvider
  const provider = new unstable_RouterContextProvider() as HydrogenRouterContextProvider<TSession, TCustomMethods, TI18n, TEnv>;

  // HYBRID APPROACH:
  
  // 1. React Router native context keys (for extensibility & 3rd parties)
  provider.set(storefrontContext, storefront);
  provider.set(cartContext, cart);
  provider.set(customerAccountContext, customerAccount);
  provider.set(envContext, env);
  provider.set(sessionContext, session);
  if (waitUntil) provider.set(waitUntilContext, waitUntil);

  // 2. Direct property access (backward compatibility & convenience)
  provider.storefront = storefront;
  provider.cart = cart;
  provider.customerAccount = customerAccount;
  provider.env = env;
  provider.session = session;
  provider.waitUntil = waitUntil;

  return provider;
}
```

### 4. Export Context Keys

**Update**: `/packages/hydrogen/src/index.ts`
```typescript
// Add these exports
export {
  storefrontContext,
  cartContext,
  customerAccountContext,
  envContext,
  sessionContext,
  waitUntilContext,
} from './context-keys';

export type { HydrogenRouterContextProvider } from './types';
```

## Usage Patterns After Implementation

### Pattern 1: Direct Property Access (Current - Backward Compatible)
```typescript
export async function loader({context}: LoaderFunctionArgs) {
  // This continues working exactly as it does now
  const {storefront, cart, customerAccount} = context;
  const products = await storefront.query(PRODUCTS_QUERY);
  return {products};
}
```

### Pattern 2: React Router Native (New - For React Router Purists)
```typescript
import { storefrontContext, cartContext } from '@shopify/hydrogen';

export async function loader({context}: LoaderFunctionArgs) {
  // React Router 7 native pattern
  const storefront = context.get(storefrontContext);
  const cart = context.get(cartContext);
  const products = await storefront.query(PRODUCTS_QUERY);
  return {products};
}
```

### Pattern 3: Third-Party Extensions (New - Ecosystem Enabler)
```typescript
import { unstable_createContext } from 'react-router';
import { storefrontContext } from '@shopify/hydrogen';

// Third-party can create their own context
const myServiceContext = unstable_createContext<MyService>();

// In server setup
provider.set(myServiceContext, new MyService());

// In loader
export async function loader({context}: LoaderFunctionArgs) {
  const storefront = context.storefront; // Hydrogen direct access
  const myService = context.get(myServiceContext); // Third-party native
  
  const products = await storefront.query(PRODUCTS_QUERY);
  const enhanced = await myService.enhance(products);
  return {products: enhanced};
}
```

### Pattern 4: Mixed Usage (Practical)
```typescript
export async function loader({context}: LoaderFunctionArgs) {
  // Use whatever feels most natural
  const storefront = context.storefront; // Direct access
  const cart = context.get(cartContext); // React Router native
  const customService = context.get(myCustomContext); // Third-party
  
  // All approaches work together seamlessly
}
```

## Benefits of This Hybrid Approach

### ✅ Backward Compatibility
- All existing code continues working unchanged
- No breaking changes for current Hydrogen users
- Smooth migration path

### ✅ React Router 7 Native Support
- Supports React Router's intended patterns
- Type-safe context keys
- Works perfectly with React Router middleware

### ✅ Ecosystem Extensibility  
- Third parties can add services via `context.set(myContext, myService)`
- Clean separation between Hydrogen core and extensions
- Strongly typed extension points

### ✅ Developer Choice
- Use direct access for convenience: `context.storefront`
- Use native patterns for purity: `context.get(storefrontContext)`
- Mix approaches as needed

### ✅ Future-Proof Architecture
- Aligns with React Router 7 evolution
- Ready for React Router stable releases
- Extensible foundation for future features

## Implementation Priority

### Phase 1: Core Implementation
1. Create context keys file
2. Define HydrogenRouterContextProvider interface  
3. Transform createHydrogenContext to hybrid pattern
4. Export new types and context keys

### Phase 2: Testing & Validation
5. Test both access patterns work
6. Validate third-party extension capabilities
7. Ensure no breaking changes

### Phase 3: Documentation & Examples
8. Update skeleton templates with examples
9. Create migration guides
10. Document extensibility patterns

---

**Result**: Best of both worlds - maintain the simplicity of direct property access while enabling React Router native patterns and ecosystem extensibility.