# React Router 7 Unstable Flags Implementation for Hydrogen

## Current React Router 7 Unstable Flags (2025)

Based on latest research of React Router 7.8.x, here are all available unstable flags and their implementation in Hydrogen:

### 1. `unstable_middleware` - Experimental Middleware System

**Purpose**: Enables React Router's experimental middleware feature
**Status**: Most important for Hydrogen context integration
**Recommendation**: ✅ **ENABLE** - Required for Hydrogen hybrid context approach

```typescript
// react-router.config.ts
export default {
  future: {
    unstable_middleware: true, // Required for context.get() and context.set()
  }
} satisfies Config;
```

**Usage in Hydrogen**:
```typescript
// Middleware runs in nested chain from parent to child routes
export async function loader({ context }: LoaderFunctionArgs) {
  // Works because unstable_middleware is enabled
  const storefront = context.get(storefrontContext);
  const directAccess = context.storefront; // Also works via hybrid approach
}
```

### 2. `unstable_optimizeDeps` - Vite Dependency Optimization

**Purpose**: Enables optimized Vite dependency pre-bundling
**Status**: Performance enhancement for development and build
**Recommendation**: ✅ **ENABLE** - Improves Hydrogen dev experience

```typescript
export default {
  future: {
    unstable_optimizeDeps: true, // Faster development builds
  }
} satisfies Config;
```

**Benefits for Hydrogen**:
- Faster `shopify hydrogen dev` startup
- Optimized bundling of Shopify/React dependencies
- Better development performance for large Hydrogen projects

### 3. `unstable_splitRouteModules` - Route Module Splitting

**Purpose**: Code splitting strategy for route modules
**Status**: Performance optimization for large applications
**Recommendation**: ✅ **ENABLE ("enforce")** - Optimal for ecommerce sites

```typescript
export default {
  future: {
    unstable_splitRouteModules: "enforce", // Aggressive code splitting
  }
} satisfies Config;
```

**Impact on Hydrogen**:
- Smaller initial bundles for product/collection/cart pages
- Lazy loading of route-specific code
- Better Core Web Vitals for ecommerce performance

### 4. `unstable_subResourceIntegrity` - Script Integrity Checking

**Purpose**: Generates integrity hashes for script resources
**Status**: Security enhancement for production
**Recommendation**: ⚠️ **EVALUATE** - Enable based on security requirements

```typescript
export default {
  future: {
    unstable_subResourceIntegrity: false, // Default off for compatibility
  }
} satisfies Config;
```

**Considerations for Hydrogen**:
- ✅ Enhanced security against script tampering
- ❌ May impact CDN caching strategies
- ❌ Requires evaluation with Shopify's infrastructure
- ❌ Additional complexity for deployment pipelines

### 5. `unstable_viteEnvironmentApi` - New Vite Environment API

**Purpose**: Enables experimental Vite environment API
**Status**: Experimental Vite integration
**Recommendation**: ❌ **DISABLE** - Too experimental for production

```typescript
export default {
  future: {
    unstable_viteEnvironmentApi: false, // Keep disabled for stability
  }
} satisfies Config;
```

**Risk Assessment**:
- High chance of breaking changes
- Limited documentation/community support
- May conflict with Hydrogen's Vite configuration
- Wait for stabilization before adoption

## Hydrogen's Recommended Configuration

Based on our analysis, here's the optimal React Router configuration for Hydrogen projects:

```typescript
// templates/skeleton/react-router.config.ts
import type { Config } from '@react-router/dev/config';

export default {
  future: {
    // REQUIRED - Enables Hydrogen's hybrid context system
    unstable_middleware: true,
    
    // PERFORMANCE - Recommended for Hydrogen apps
    unstable_optimizeDeps: true,
    unstable_splitRouteModules: "enforce",
    
    // SECURITY - Evaluate based on project needs
    unstable_subResourceIntegrity: false,
    
    // EXPERIMENTAL - Disable for stability
    unstable_viteEnvironmentApi: false,
  },
} satisfies Config;
```

## CLI Integration

The Hydrogen CLI should provide commands to manage these flags:

```bash
# List all available unstable flags
shopify hydrogen flags --list

# Generate react-router.config.ts with recommended settings  
shopify hydrogen flags --generate

# Enable specific flags
shopify hydrogen flags --enable unstable_middleware,unstable_optimizeDeps

# Disable specific flags
shopify hydrogen flags --disable unstable_subResourceIntegrity
```

## TypeScript Support

Hydrogen's TypeScript definitions should support all unstable flags:

```typescript
// packages/hydrogen/src/types.d.ts
export interface HydrogenRouterContextProvider extends unstable_RouterContextProvider {
  // Hydrogen properties...
  
  future?: {
    unstable_middleware?: boolean;
    unstable_optimizeDeps?: boolean; 
    unstable_splitRouteModules?: "enforce" | boolean;
    unstable_subResourceIntegrity?: boolean;
    unstable_viteEnvironmentApi?: boolean;
    
    // Future extensibility
    [key: `unstable_${string}`]: unknown;
  };
}
```

## Migration Strategy

### Phase 1: Enable Core Flags
1. `unstable_middleware: true` - Required for context system
2. Test all existing functionality works

### Phase 2: Add Performance Flags  
1. `unstable_optimizeDeps: true` - Improve dev experience
2. `unstable_splitRouteModules: "enforce"` - Optimize bundles
3. Performance test large Hydrogen stores

### Phase 3: Evaluate Security Flags
1. `unstable_subResourceIntegrity` - Test with Shopify infrastructure
2. Document security implications
3. Provide guidance for different deployment scenarios

### Phase 4: Monitor Experimental Flags
1. Track `unstable_viteEnvironmentApi` stabilization
2. Test new unstable flags as React Router releases them
3. Update recommendations based on community feedback

## Monitoring and Updates

### Regular Flag Assessment
- **Monthly**: Check React Router releases for new unstable flags
- **Quarterly**: Evaluate flag stability and graduation to stable
- **Annually**: Review and update Hydrogen's recommended configuration

### Community Feedback Integration
- Monitor Hydrogen community for flag-related issues
- Track performance impact of different flag combinations  
- Adjust recommendations based on real-world usage data

### React Router Collaboration
- Stay aligned with React Router team on flag roadmap
- Contribute feedback on Hydrogen-specific use cases
- Advocate for ecommerce-relevant features and optimizations

---

## Summary

React Router 7's unstable flags provide powerful capabilities for Hydrogen:

- **`unstable_middleware`**: ✅ Essential for Hydrogen's hybrid context approach
- **`unstable_optimizeDeps`**: ✅ Improves development experience  
- **`unstable_splitRouteModules`**: ✅ Optimizes ecommerce performance
- **`unstable_subResourceIntegrity`**: ⚠️ Evaluate security vs complexity trade-offs
- **`unstable_viteEnvironmentApi`**: ❌ Too experimental, wait for stabilization

This configuration balances functionality, performance, and stability for production Hydrogen stores while maintaining compatibility with React Router's evolution.