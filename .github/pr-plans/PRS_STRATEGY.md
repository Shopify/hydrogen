# PR #3127 Breakdown Strategy - Validated Plan

## Overview
PR #3127 contains 945 changed files with 96,239 additions and 11,689 deletions across 60 commits. This document provides a validated strategy to break down these changes into manageable, testable PRs.

## Critical Dependencies Discovered

The skeleton template depends on:
1. `@shopify/hydrogen` package exports (HydrogenRouterContextProvider, NonceProvider, context keys)
2. `@shopify/hydrogen/react-router-preset` for configuration
3. `@shopify/hydrogen/react-router-types` for TypeScript augmentation
4. React Router 7.8.2 exact versions across all packages

## PR Breakdown Strategy

### PR 0: Version Pinning Across Monorepo
**Priority: CRITICAL - Must be first**  
**Files:** ~10-15 package.json files across all packages  
**Commits to cherry-pick:**
- 411bb36: Pin React Router versions to exact 7.8.2

**Critical Changes:**
- Pin all React Router dependencies to exact `7.8.2`
- Remove all version ranges (~, ^) for React Router
- Ensure consistency across all packages and templates
- No source code changes - purely dependency management

**Why it must be first:** Version consistency is the foundation for all other changes. Without exact versions, packages may resolve different React Router versions causing runtime errors.

**Validation:**
```bash
npm install
npm ls react-router | grep -c "7.8.2"
# All packages should show 7.8.2
```

### PR 1: Remix-Oxygen Package Updates  
**Priority: HIGH**  
**Files:** ~2 files in packages/remix-oxygen/  
**Dependencies:** PR 0 must be merged  

**Changes:**
- Update peer dependencies to React Router 7.8.2
- Small compatibility updates
- Minimal changes focused on version compatibility

**Why after PR 0:** Needs consistent versions established first.

**Validation:**
```bash
cd packages/remix-oxygen
npm run build
npm run typecheck
```

### PR 2: Hydrogen-React Package Updates
**Priority: HIGH**  
**Files:** ~9 files in packages/hydrogen-react/  
**Dependencies:** PR 0 must be merged  
**Commits to cherry-pick:**
- 636bc80: GraphQL codegen enum compatibility
- df09825: TypeScript 5.9 inference fixes

**Critical Changes:**
- GraphQL codegen enum compatibility fixes
- TypeScript 5.9 inference fixes
- `package.json` updates (already done in PR 0)

**Why separate:** Independent package with its own test suite.

**Validation:**
```bash
cd packages/hydrogen-react
npm run build
npm run typecheck
npm run test
```

### PR 3: Core Hydrogen Package Infrastructure
**Priority: CRITICAL**  
**Dependencies:** PR 0, 1, 2 must be merged  
**Files:** ~18 files in packages/hydrogen/  
**Commits to cherry-pick:**
- 22e4ca3: React Router foundation
- 7ae1060: Hybrid context implementation
- ee23476: Proxy-based context
- 269853d: TypeScript server recognition
- 16f51f4: React Router preset
- 3b9207c: UIMatch type fix

**Critical Changes:**
- `src/createHydrogenContext.ts` - Proxy-based hybrid context
- `src/context-keys.ts` - React Router context keys
- `src/types.d.ts` - HydrogenRouterContextProvider interface
- `src/index.ts` - Export NonceProvider and new types
- `src/react-router-preset.ts` - React Router configuration preset
- `react-router.d.ts` - Module augmentation
- `src/seo/seo.test.ts` - Fix UIMatch type for RR 7.8.x
- `package.json` - Already updated in PR 0

**Why after version pinning:** Skeleton template imports these types and the preset. Needs consistent versions first.

**Validation:**
```bash
cd packages/hydrogen
npm run build
npm run typecheck
npm run test
```

### PR 4: CLI Core Updates (Minimal)
**Priority: HIGH**  
**Files:** ~10 files in packages/cli/ (only essential)  
**Dependencies:** PR 0, 1, 2, 3 must be merged  
**Commits to cherry-pick:**
- 543e93a: Version consistency checks

**Critical Changes:**
- `src/lib/react-router-version-check.ts` - Update to expect 7.8.2
- `src/lib/remix-config.ts` - Remove legacy Remix code
- `package.json` - Already updated in PR 0
- `tsup.config.ts` - Build configuration fixes

**Why minimal:** Only include changes needed for skeleton to work. Save diff removal for later.

**Validation:**
```bash
cd packages/cli
npm run build
npm run typecheck
```

### PR 5: Skeleton Template Migration
**Priority: CRITICAL**  
**Dependencies:** PR 0, 1, 2, 3, 4 must be merged  
**Files:** All 56 files in templates/skeleton/  
**Commits to cherry-pick:**
- All commits touching templates/skeleton after PR 1-3 changes

**Critical Changes:**
- All route files: Change imports from `@shopify/remix-oxygen` to `react-router`
- `app/lib/context.ts`: `createAppLoadContext` → `createHydrogenRouterContext`
- `app/entry.server.tsx`: Use `HydrogenRouterContextProvider` type
- `env.d.ts`: Complete rewrite to use module augmentation
- `react-router.config.ts`: Use `hydrogenPreset()`
- `package.json`: Already pinned in PR 0
- `tsconfig.json`: Add types array

**Test validation:** After PR 0-4, this should pass `npm run typecheck` and `npm run build`

**Validation:**
```bash
cd templates/skeleton
npm install
npm run codegen
npm run typecheck
npm run build
npm run dev # Quick manual test
```


### PR 6: Mini-Oxygen & Create-Hydrogen Updates
**Priority: LOW**  
**Files:** packages/mini-oxygen/, packages/create-hydrogen/  

**Changes:**
- Minor dependency updates
- Compatibility fixes

**Why separate:** Lower priority, independent changes.

### PR 7: CLI Advanced Features
**Priority: LOW**  
**Dependencies:** PR 0-5 complete  
**Files:** ~40 files in packages/cli/  
**Commits to cherry-pick:**
- 3beb46e: Runtime monorepo detection
- a600b04: CLI auto-linking
- 97493ed: Remove diff system  

**Changes:**
- Runtime monorepo detection
- CLI auto-linking
- Remove diff system completely
- Template handling improvements

**Why later:** These are enhancements, not required for basic functionality.

### PR 8: All Examples Conversion
**Priority: LOW**  
**Dependencies:** PR 0-5 complete  
**Files:** ~785 files in examples/  
**Commits to cherry-pick:**
- e2b78b1: Convert examples from diff-based to standalone

**Examples included:**
- b2b
- custom-cart-method
- gtm
- infinite-scroll
- legacy-customer-account-flow
- metaobjects
- multipass
- partytown
- third-party-queries-caching
- express

**Why single PR:** Examples don't affect each other or core functionality. Can be tested individually.

**Validation:**
```bash
# For each example:
cd examples/[example-name]
npm install
npm run build
npm run typecheck
```

### PR 9: Recipe Updates
**Priority: LOW**  
**Dependencies:** PR 5 (skeleton) complete  
**Files:** ~31 files in cookbook/  

**Changes:**
- Update all recipe patches
- Fix imports for React Router
- Update markets, subscriptions, combined-listings recipes

**Note:** Will remain broken until fixed as final step per project requirements.

## Implementation Timeline

### Week 1
- Day 1: PR 0 (Version pinning) - MUST be first
- Day 2: PR 1 (Remix-Oxygen) & PR 2 (Hydrogen-React) - can be parallel after PR 0
- Day 3: PR 3 (Hydrogen core) - requires PR 0-2
- Day 4: PR 4 (CLI minimal) - requires PR 0-3
- Day 5: PR 5 (Skeleton) - requires PR 0-4 merged

### Week 2
- Day 1: PR 6 (Mini-Oxygen, Create-Hydrogen)
- Day 2-3: PR 7 (CLI advanced)
- Day 4-5: PR 8 (Examples)

### Week 3
- PR 9 (Recipes)
- Final validation and cleanup

## Key Insights

1. **Version pinning MUST come first** - All packages need exact 7.8.2 before any code changes
2. **The skeleton needs hydrogen package changes** - It imports types and preset from `@shopify/hydrogen`
3. **React Router versions MUST be exact 7.8.2** - Any mismatch causes runtime errors
3. **Examples can be batched** - They're independent of each other
5. **CLI diff removal can be deferred** - Not needed for basic skeleton functionality
6. **Recipes will fail validation** - Expected per project requirements

## Risk Mitigation

1. **Test locally first**: Build packages in order locally before creating PRs
2. **Use feature branches**: Create all PRs from feature branches, not main
3. **CI validation**: Each PR should have green CI before merge
4. **Order matters**: Strictly follow PR 0→1→2→3→4→5 order for skeleton to work
5. **Version consistency**: Use exact version pinning (7.8.2) not ranges

## CI Validation Requirements

For each PR, ensure:
- `npm run build:pkg` passes
- `npm run typecheck` passes
- `npm run test` passes
- `npm run lint` passes
- No breaking changes for existing apps

## Cherry-Pick Commands

```bash
# For PR 0 (Version pinning)
git cherry-pick 411bb36

# For PR 1 (Remix-Oxygen)
# No specific commits - manual updates

# For PR 2 (Hydrogen-React)
git cherry-pick 636bc80 df09825

# For PR 3 (Hydrogen core)
git cherry-pick 22e4ca3 7ae1060 ee23476 269853d 16f51f4 3b9207c

# For PR 4 (CLI minimal)
git cherry-pick 543e93a

# Continue for other PRs...
```

## Success Criteria

Each PR must:
1. Pass all CI checks independently
2. Not break existing functionality
3. Be reviewable (reasonable size)
4. Have clear commit messages
5. Include necessary documentation updates

This strategy ensures each PR can pass CI independently while maintaining the logical separation of packages, skeleton, and examples.