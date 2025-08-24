# Hydrogen React Router 7.8.x - Complete Development Plan

## Overview

This development plan integrates all findings from our analysis and documentation to create a comprehensive React Router 7.8.x integration for Hydrogen. The plan balances backward compatibility, React Router native patterns, and future extensibility.

## Reference Documents

- **[REACT_ROUTER_CONTEXT.md](./REACT_ROUTER_CONTEXT.md)** - Current module augmentation implementation
- **[REACT_ROUTER_PROPS.md](./REACT_ROUTER_PROPS.md)** - React Router 7.8.x context provider analysis
- **[HYDROGEN_REACT_ROUTER_CONTEXT.md](./HYDROGEN_REACT_ROUTER_CONTEXT.md)** - Original context keys implementation
- **[HYBRID_CONTEXT_IMPLEMENTATION.md](./HYBRID_CONTEXT_IMPLEMENTATION.md)** - Hybrid approach specification
- **[REACT_ROUTER_UNSTABLE_FLAGS.md](./REACT_ROUTER_UNSTABLE_FLAGS.md)** - Complete React Router 7 unstable flags implementation guide

## Current State Assessment

### ✅ Completed Work
- React Router module augmentation working (`/packages/hydrogen/react-router.d.ts`)
- Direct property access: `context.storefront.query()` functional
- AppLoadContext elimination complete
- Build system configured for module augmentation
- Template workspace resolution (`preserveSymlinks: true`)

### ❌ Missing Critical Components
- `HydrogenRouterContextProvider` interface definition
- React Router context keys (`storefrontContext`, `cartContext`, etc.)
- Hybrid implementation in `createHydrogenContext`
- Context keys exports and type definitions

### 🔄 Incomplete Work
- Template import cleanup (from `@shopify/remix-oxygen` to `react-router`)
- GraphQL codegen LanguageCode/CurrencyCode compatibility issues

---

# Phase 1: Foundation - Complete Current Implementation

**Goal**: Complete the missing pieces of our current module augmentation approach to make it fully functional.

**Reference**: [REACT_ROUTER_CONTEXT.md](./REACT_ROUTER_CONTEXT.md) - "What's Missing: HydrogenRouterContextProvider Interface"

## 1.1 Define HydrogenRouterContextProvider Interface

**File**: `/packages/hydrogen/src/types.d.ts`

```typescript
import type { unstable_RouterContextProvider } from 'react-router';
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
} from './createHydrogenContext';

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

## 1.2 Export HydrogenRouterContextProvider

**File**: `/packages/hydrogen/src/index.ts`

```typescript
// Add this export
export type { HydrogenRouterContextProvider } from './types';
```

## 1.3 Validate Current Module Augmentation

**Test**: Ensure `/packages/hydrogen/react-router.d.ts` properly references the new interface:

```typescript
import type { HydrogenRouterContextProvider, HydrogenSessionData } from './production/index';
//            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 
//            This should now resolve correctly
```

## 1.4 Template Import Cleanup

**Reference**: [REACT_ROUTER_CONTEXT.md](./REACT_ROUTER_CONTEXT.md) - "Files Still Need Type Import Updates"

**Files to update** (systematic find-and-replace):
- `templates/skeleton/app/routes/_index.tsx:1`
- `templates/skeleton/app/routes/account.profile.tsx:6-8`
- All other route files importing from `@shopify/remix-oxygen`

**Pattern**:
```typescript
// BEFORE
import type {LoaderFunctionArgs} from '@shopify/remix-oxygen';

// AFTER  
import type {LoaderFunctionArgs} from 'react-router';
```

**IMPORTANT**: Keep `createRequestHandler` import from `@shopify/remix-oxygen` - do NOT replace this import:
```typescript
// KEEP AS-IS (do not change)
import {createRequestHandler} from '@shopify/remix-oxygen';
```

## Phase 1 Success Criteria
- [ ] `HydrogenRouterContextProvider` interface compiles without errors
- [ ] Module augmentation resolves type references
- [ ] All template files import from `react-router`
- [ ] Full skeleton typecheck passes with only non-React Router errors

---

# Phase 2: Hybrid Implementation - React Router Native Integration

**Goal**: Add React Router native context keys while preserving direct property access.

**Reference**: [HYBRID_CONTEXT_IMPLEMENTATION.md](./HYBRID_CONTEXT_IMPLEMENTATION.md) - Complete implementation guide

## 2.1 Create React Router Context Keys

**New File**: `/packages/hydrogen/src/context-keys.ts`

```typescript
import { unstable_createContext } from 'react-router';
import type { 
  StorefrontClient, 
  CustomerAccount, 
  HydrogenCart, 
  HydrogenCartCustom,
  HydrogenEnv,
  HydrogenSession,
  WaitUntil
} from './types';

// React Router native context keys - strongly typed
export const storefrontContext = unstable_createContext<StorefrontClient>();
export const cartContext = unstable_createContext<HydrogenCart | HydrogenCartCustom<any>>();
export const customerAccountContext = unstable_createContext<CustomerAccount>();
export const envContext = unstable_createContext<HydrogenEnv>();
export const sessionContext = unstable_createContext<HydrogenSession>();
export const waitUntilContext = unstable_createContext<WaitUntil>();
```

## 2.2 Transform createHydrogenContext to Hybrid Pattern

**File**: `/packages/hydrogen/src/createHydrogenContext.ts`

**Key Changes**:
1. Import context keys
2. Return `HydrogenRouterContextProvider` instead of plain object
3. Set both React Router context keys AND direct properties

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

export function createHydrogenContext<...>(...): HydrogenRouterContextProvider<...> {
  // Existing service creation logic (unchanged)
  const {storefront} = createStorefrontClient(options);
  const cart = createCartHandler(options);
  // ... etc

  // NEW: Create RouterContextProvider
  const provider = new unstable_RouterContextProvider() as HydrogenRouterContextProvider<...>;

  // NEW: Set React Router context keys (native access)
  provider.set(storefrontContext, storefront);
  provider.set(cartContext, cart);
  provider.set(customerAccountContext, customerAccount);
  // ... etc

  // NEW: Set direct properties (backward compatibility)
  provider.storefront = storefront;
  provider.cart = cart;
  provider.customerAccount = customerAccount;
  // ... etc

  return provider;
}
```

## 2.3 Export Context Keys

**File**: `/packages/hydrogen/src/index.ts`

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
```

## 2.4 Update Build System

**File**: `/packages/hydrogen/tsup.config.ts`

Ensure `context-keys.ts` is properly built and exported.

## Phase 2 Success Criteria
- [ ] Both access patterns work: `context.storefront` and `context.get(storefrontContext)`
- [ ] No breaking changes - all existing code continues working
- [ ] Context keys are properly typed and exported
- [ ] Third-party extensions can use `context.set(myContext, myService)`

---

# Phase 3: React Router 7.8.x Future Compatibility

**Goal**: Add support for React Router 7.8.x unstable flags and experimental features.

**Reference**: [REACT_ROUTER_UNSTABLE_FLAGS.md](./REACT_ROUTER_UNSTABLE_FLAGS.md) - Complete unstable flags implementation guide

## 3.1 Current React Router 7 Unstable Flags (2025)

Based on latest React Router 7 research, these are the available unstable flags:

```typescript
// react-router.config.ts configuration options
export interface ReactRouterConfig {
  future?: {
    unstable_middleware?: boolean;           // Experimental middleware system
    unstable_optimizeDeps?: boolean;         // Vite dependency optimization  
    unstable_splitRouteModules?: string;     // Route module splitting ("enforce")
    unstable_subResourceIntegrity?: boolean; // Script integrity checking
    unstable_viteEnvironmentApi?: boolean;   // New Vite environment API
  };
}
```

**Key Insights from Research:**
- ✅ **No Future Flags in React Router 7** - All v6 future flags are now stable in v7
- 🧪 **5 Current Unstable Flags** - Experimental features for performance and security
- ⚠️  **Production Warning** - Unstable flags not recommended for production use

## 3.2 Extend HydrogenRouterContextProvider for Unstable Flags

**File**: `/packages/hydrogen/src/types.d.ts`

```typescript
export interface HydrogenRouterContextProvider<...> extends unstable_RouterContextProvider {
  // Current Hydrogen properties...
  
  // React Router 7 unstable flags support (2025)
  future?: {
    // Middleware system (most important for Hydrogen)
    unstable_middleware?: boolean;
    
    // Performance optimizations
    unstable_optimizeDeps?: boolean;
    unstable_splitRouteModules?: "enforce" | boolean;
    
    // Security enhancements  
    unstable_subResourceIntegrity?: boolean;
    
    // Vite integrations
    unstable_viteEnvironmentApi?: boolean;
    
    // Future extensibility - will add new flags as React Router introduces them
    [key: `unstable_${string}`]: unknown;
  };
}
```

## 3.3 Hydrogen CLI Configuration Support

**Goal**: Enable Hydrogen CLI to automatically configure React Router unstable flags.

**File**: `/packages/cli/src/lib/vite/react-router-config.ts` (New)

```typescript
import type { ReactRouterConfig } from './types';

// Hydrogen's recommended React Router configuration
export const hydrogenReactRouterConfig: ReactRouterConfig = {
  future: {
    // Enable middleware for Hydrogen context integration
    unstable_middleware: true,
    
    // Performance optimizations for Hydrogen apps
    unstable_optimizeDeps: true,
    unstable_splitRouteModules: "enforce",
    
    // Security enhancements (default off for compatibility)
    unstable_subResourceIntegrity: false,
    
    // Vite integration (evaluate based on Hydrogen needs)
    unstable_viteEnvironmentApi: false,
  },
};

// CLI command to generate react-router.config.ts
export function generateReactRouterConfig(customConfig?: Partial<ReactRouterConfig>) {
  return {
    ...hydrogenReactRouterConfig,
    ...customConfig,
    future: {
      ...hydrogenReactRouterConfig.future,
      ...customConfig?.future,
    },
  };
}
```

## 3.4 Skeleton Template Configuration

**File**: `/templates/skeleton/react-router.config.ts` (New)

```typescript
import type { Config } from '@react-router/dev/config';

export default {
  // Hydrogen-optimized React Router configuration
  future: {
    // Required for Hydrogen context system
    unstable_middleware: true,
    
    // Performance optimizations
    unstable_optimizeDeps: true,
    unstable_splitRouteModules: "enforce",
    
    // Security (optional - enable based on needs)
    unstable_subResourceIntegrity: false,
    
    // Vite API (beta - disable for stability)
    unstable_viteEnvironmentApi: false,
  },
} satisfies Config;
```

## 3.5 Context Provider Factory Function

**Reference**: [REACT_ROUTER_PROPS.md](./REACT_ROUTER_PROPS.md) - "Create Context Provider Factory Function"

**New File**: `/packages/hydrogen/src/create-hydrogen-router-context-provider.ts`

```typescript
export function createHydrogenRouterContextProvider<...>(
  hydrogenContext: HydrogenContext<...>,
  options?: {
    // Allow configuration of unstable flags at runtime
    future?: HydrogenRouterContextProvider['future'];
  }
): HydrogenRouterContextProvider<...> {
  const provider = new unstable_RouterContextProvider() as HydrogenRouterContextProvider<...>;
  
  // Set unstable flag configuration
  if (options?.future) {
    provider.future = options.future;
  }
  
  // Implementation that bridges React Router's context API 
  // with Hydrogen's direct access patterns
  // Includes support for set/get methods and direct property access
  return provider;
}
```

## 3.6 React Router Native Method Support

Ensure our implementation properly supports all React Router context methods:
- `provider.set(context, value)` ✅
- `provider.get(context)` ✅
- `provider.future` configuration ✅ (NEW)
- Future methods as React Router adds them ✅

## 3.7 CLI Integration for Unstable Flag Management

**Goal**: Add CLI commands to manage React Router unstable flags for Hydrogen projects.

**File**: `/packages/cli/src/commands/hydrogen/flags.ts` (New)

```typescript
import {Command, Flags} from '@oclif/core';
import {generateReactRouterConfig} from '../../lib/vite/react-router-config.js';

export default class HydrogenFlags extends Command {
  static description = 'Manage React Router unstable flags for Hydrogen projects';
  
  static flags = {
    enable: Flags.string({
      char: 'e',
      description: 'Enable specific unstable flag',
      multiple: true,
    }),
    disable: Flags.string({
      char: 'd', 
      description: 'Disable specific unstable flag',
      multiple: true,
    }),
    list: Flags.boolean({
      char: 'l',
      description: 'List all available unstable flags',
    }),
    generate: Flags.boolean({
      char: 'g',
      description: 'Generate react-router.config.ts with recommended settings',
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(HydrogenFlags);
    
    if (flags.list) {
      this.showAvailableFlags();
    }
    
    if (flags.generate) {
      await this.generateConfig();
    }
    
    // Handle enable/disable flags
    if (flags.enable || flags.disable) {
      await this.updateFlags(flags.enable, flags.disable);
    }
  }
  
  private showAvailableFlags() {
    this.log('Available React Router Unstable Flags for Hydrogen:');
    this.log('📦 unstable_middleware       - Experimental middleware system (RECOMMENDED)');
    this.log('⚡ unstable_optimizeDeps     - Vite dependency optimization');
    this.log('📄 unstable_splitRouteModules - Route module splitting');
    this.log('🔒 unstable_subResourceIntegrity - Script integrity checking');  
    this.log('🏗️  unstable_viteEnvironmentApi - New Vite environment API');
  }
}
```

## 3.8 Documentation Updates

**File**: Update all relevant docs to include unstable flag information:

1. **Getting Started guides** - mention React Router configuration
2. **Performance guides** - explain `unstable_splitRouteModules` and `unstable_optimizeDeps`  
3. **Security guides** - document `unstable_subResourceIntegrity`
4. **Migration guides** - how to enable/disable flags safely

## Phase 3 Success Criteria
- [ ] All 5 current unstable flags supported in types
- [ ] CLI commands for flag management implemented
- [ ] Skeleton template includes optimal React Router config
- [ ] Context provider factory supports runtime flag configuration
- [ ] Documentation covers all unstable flags and their implications
- [ ] Full compatibility with React Router 7.8.x middleware system
- [ ] Extensible architecture for future unstable flags
- [ ] Ready for React Router stable releases

---

# Phase 4: GraphQL Codegen Fixes (Separate Track)

**Goal**: Fix unrelated GraphQL type compatibility issues discovered during React Router work.

**Reference**: [REACT_ROUTER_CONTEXT.md](./REACT_ROUTER_CONTEXT.md) - "Discovered - Unrelated Issues"

## 4.1 LanguageCode Compatibility Fix

**Root Cause**: Storefront API `LanguageCode` vs Customer Account API `LanguageCode` type incompatibility

**Error Example**:
```typescript
// In templates/skeleton/app/routes/account.profile.tsx:53
language: context.storefront.i18n.language, // Storefront API LanguageCode
// Used in Customer Account API mutation expecting Customer Account API LanguageCode
```

**Investigation Files**:
- `/packages/cli/src/lib/codegen.ts`
- `/packages/hydrogen-react/codegen.ts`
- `/packages/hydrogen-react/src/codegen.helpers.ts`

**Solution**: Configure codegen to use unified LanguageCode types or proper type mapping

## 4.2 CurrencyCode Compatibility Fix

Similar issue with `CurrencyCode` types between APIs.

## Phase 4 Success Criteria
- [ ] All LanguageCode type errors resolved
- [ ] All CurrencyCode type errors resolved
- [ ] GraphQL codegen configuration properly unified
- [ ] Full skeleton typecheck passes with zero errors

---

# Phase 5: Documentation and Examples

**Goal**: Complete documentation, examples, and migration guides.

## 5.1 Update Skeleton Templates

**Files to update with examples**:
- Add examples showing both access patterns
- Demonstrate third-party extension capabilities
- Show migration patterns

## 5.2 Create Migration Guides

**Topics**:
- Migrating from AppLoadContext to HydrogenRouterContextProvider
- Using React Router native patterns vs direct access
- Third-party extension development
- React Router 7.8.x best practices

## 5.3 API Documentation

Update all API documentation to reflect:
- Hybrid access patterns
- Context keys usage
- Future compatibility considerations

## Phase 5 Success Criteria
- [ ] Complete API documentation
- [ ] Migration guides for all patterns
- [ ] Examples demonstrating extensibility
- [ ] Third-party developer documentation

---

# Testing Strategy

## Unit Tests
- [ ] Module augmentation type resolution
- [ ] Context keys creation and typing
- [ ] Hybrid access patterns
- [ ] Third-party extension capabilities

## Integration Tests  
- [ ] Full request lifecycle with React Router middleware
- [ ] Both access patterns in real loaders/actions
- [ ] GraphQL operations work with both patterns
- [ ] Session and authentication flows

## Backward Compatibility Tests
- [ ] Existing code works unchanged
- [ ] No performance regressions
- [ ] All current APIs preserved

## Future Compatibility Tests
- [ ] React Router 7.8.x future flags support
- [ ] Extensibility patterns work as intended
- [ ] Migration paths are smooth

---

# Phase 6: React Router Configuration Validation & Future Compatibility

**Goal**: Ensure comprehensive React Router configuration support and validate all current and future flags.

**Reference**: [REACT_ROUTER_UNSTABLE_FLAGS.md](./REACT_ROUTER_UNSTABLE_FLAGS.md) - Complete unstable flags implementation guide

## 6.1 Enhanced Skeleton Configuration

**File**: `/templates/skeleton/react-router.config.ts` (Updated)

**Objectives**:
- Include ALL possible React Router configuration options for validation
- Enable optimal unstable flags for Hydrogen performance
- Document decision rationale for each flag
- Prepare for future React Router configuration additions

**Current Implementation**:
```typescript
export default {
  // Core configuration
  appDirectory: 'app',
  buildDirectory: 'dist',
  ssr: true,
  
  // React Router 7 unstable flags - configured for optimal Hydrogen experience
  future: {
    unstable_middleware: true,        // Required for Hydrogen context
    unstable_optimizeDeps: true,      // Performance enhancement
    unstable_splitRouteModules: "enforce", // Ecommerce optimization
    unstable_subResourceIntegrity: false,   // Security evaluation needed
    unstable_viteEnvironmentApi: false,     // Too experimental
  },
  
  // Additional validation properties
  basename: undefined,
  ignoredRouteFiles: undefined,
  serverBuildFile: undefined,
  publicPath: undefined,
  assetsBuildDirectory: undefined,
  routes: undefined,
} satisfies Config;
```

## 6.2 CLI Configuration Generation

**New File**: `/packages/cli/src/lib/react-router-config.ts`

**Features**:
- Generate optimized react-router.config.ts for new projects
- Validate existing configurations against supported features
- Warning system for unsupported/deprecated flags
- Migration helpers for React Router updates

```typescript
export function validateReactRouterConfig(config: unknown): ValidationResult {
  // Validate all configuration options
  // Check for unsupported flags
  // Provide migration recommendations
  // Return compatibility report
}
```

## 6.3 Future Compatibility Testing

**Test Framework**:
- Automated testing against React Router releases
- Configuration compatibility matrix
- Performance regression detection
- Breaking change identification

**Files**:
- `/packages/hydrogen/src/react-router/__tests__/config-validation.test.ts`
- `/packages/cli/src/commands/check-react-router-compatibility.ts`

## Phase 6 Success Criteria
- [ ] All React Router Config properties explicitly handled
- [ ] Skeleton template includes comprehensive configuration
- [ ] CLI validates and generates optimal configurations
- [ ] Future React Router flags can be added systematically
- [ ] Performance benchmarks for each enabled flag
- [ ] Documentation for configuration decisions

---

# Risk Assessment and Mitigation

## High Risk
- **Breaking changes during hybrid implementation**
  - *Mitigation*: Extensive backward compatibility testing
  - *Fallback*: Feature flags for gradual rollout

## Medium Risk  
- **React Router API changes in 7.8.x**
  - *Mitigation*: Monitor React Router releases closely
  - *Fallback*: Abstract layer for React Router API changes

## Low Risk
- **Performance impact of hybrid pattern**
  - *Mitigation*: Benchmark both access patterns
  - *Fallback*: Optimize hot paths if needed

---

# Success Metrics

## Technical Metrics
- [ ] Zero breaking changes for existing code
- [ ] Full TypeScript support for both patterns
- [ ] <5ms overhead for hybrid implementation
- [ ] 100% test coverage for new functionality

## Developer Experience Metrics
- [ ] Complete IntelliSense support
- [ ] Clear error messages for misuse
- [ ] Smooth migration path documentation
- [ ] Third-party extension examples

## Ecosystem Metrics
- [ ] Third-party packages can extend cleanly
- [ ] React Router community alignment
- [ ] Future-proof architecture foundation

---

**Total Estimated Timeline**: 3-4 development cycles
**Priority**: High - Foundation for all future React Router 7 work
**Dependencies**: React Router 7.8.x stable release
**Impact**: Transforms Hydrogen into React Router 7 native citizen while preserving DX