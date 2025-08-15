# Resolve @shopify/hydrogen Issues

## EXTENDS: resolve-issue.md
This prompt extends the base issue resolution prompt with package-specific knowledge for @shopify/hydrogen.

## PACKAGE CONTEXT

### Package Overview
- **Purpose**: Core Hydrogen framework, React-based framework for building custom storefronts
- **Key Dependencies**: Remix, React, React Router, Storefront API
- **Build Output**: ESM and CJS builds
- **Testing**: Vitest for unit tests, Playwright for E2E

### Common Issue Categories
<!-- To be filled during trials -->
- [ ] Routing issues (Remix/React Router related)
- [ ] Data fetching (Storefront API, loaders)  
- [ ] SSR/Hydration mismatches
- [ ] SEO component issues
- [ ] Analytics tracking
- [ ] Cart functionality
- [ ] Customer account features

### Package-Specific Investigation Points
```
ALWAYS CHECK:
- Remix version compatibility
- React Router version alignment
- Storefront API version in use
- SSR vs client-side behavior differences
- TypeScript types generation
- Vite configuration impacts
```

### Common Code Locations
```
packages/hydrogen/src/
├── analytics/          # Analytics implementation
├── cart/              # Cart providers and hooks
├── customer/          # Customer account features
├── data/              # Data fetching utilities
├── hooks/             # React hooks
├── routing/           # Routing utilities
├── seo/              # SEO components
├── storefront/        # Storefront client
└── utils/            # Shared utilities
```

### Package-Specific Testing Commands
```bash
# Unit tests
npm test -- packages/hydrogen

# Type checking
npm run typecheck -- --filter=./packages/hydrogen

# Build package
npm run build:pkg -- --filter=./packages/hydrogen
```

## LEARNED PATTERNS
<!-- This section will grow as we resolve issues -->

### Issue Type: [Name]
**Pattern Recognition**: 
**Common Root Causes**:
**Effective Solutions**:
**Tests to Add**:

---

## PHASE OVERRIDES

### Phase 2.2: Package-Specific Investigation
```
HYDROGEN-SPECIFIC CHECKS:
1. Check if issue relates to:
   - Loader/action data flow
   - Remix meta exports
   - Storefront client configuration
   - Cart/customer context providers
   
2. Search patterns:
   - Error boundaries in routes
   - Suspense boundaries for streaming
   - defer() usage in loaders
   - Context provider setup

3. Version considerations:
   - Check Remix version in package.json
   - Verify Storefront API version compatibility
   - Check for breaking changes in recent releases
```

### Phase 6.3: Testing Verification
```
HYDROGEN-SPECIFIC TESTING:
1. Run unit tests: npm test -- packages/hydrogen
2. Check type safety: npm run typecheck -- --filter=./packages/hydrogen
3. If route-related, test SSR: npm run dev:app
4. Verify no hydration warnings in browser console
```

## COMMON GOTCHAS
<!-- To be populated during trials -->
- Remix loaders must return serializable data
- defer() requires Suspense boundaries
- Cart operations are async
- SEO components need proper meta exports

## TRIAL LOG
<!-- Track what we learn from each issue -->
<!--
Issue #XXXX: [Brief description]
- Learned: [What we discovered]
- Added to prompt: [What section we enhanced]
-->