# React 19 Migration Plan for Skeleton Template

## Current Status
- ✅ Initial React 19 compatibility patches applied
- ✅ React Router v7 type patches created
- ⚠️ 46 TypeScript errors remaining

## Remaining TypeScript Errors to Fix

### 1. Missing Type Exports from @shopify/hydrogen (Priority: High)
These types are exported but may need proper re-exports or import path updates:

- [ ] `OptimisticCart` - Used in CartSummary.tsx
- [ ] `OptimisticCartLine` - Used in CartLineItem.tsx  
- [ ] `OptimisticCartLineInput` - Used in AddToCartButton.tsx
- [ ] `CartViewPayload` - Used in Header.tsx
- [ ] `MappedProductOptions` - Used in ProductForm.tsx
- [ ] `HydrogenSession` - Used in lib/session.ts
- [ ] `CartQueryDataReturn` - Used in cart.tsx

**Solution**: Check if these are exported from different paths or need to be imported from hydrogen-react

### 2. JSX Component Compatibility Issues (Priority: High)
React Router components still showing as incompatible JSX elements:

- [ ] `Link` component in multiple files
- [ ] `NavLink` component in Footer.tsx, Header.tsx
- [ ] `Form` component in account routes
- [ ] `Await` component in Footer.tsx

**Solution**: Extend ReactRouterCompat.tsx wrappers or update react-router-patches.d.ts

### 3. Implicit Any Types (Priority: Medium)
- [ ] CartMain.tsx - Parameters in map functions
- [ ] sitemap.$type.$page[.xml].tsx - Destructured parameters
- [ ] Various callback functions missing type annotations

**Solution**: Add explicit type annotations

### 4. Type Inference Issues (Priority: Medium)
- [ ] `flattenConnection` returning unknown in account.orders routes
- [ ] Discount value type narrowing in account.orders.$id.tsx
- [ ] Order type inference in account.orders._index.tsx

**Solution**: Add proper type assertions or improve type inference

### 5. Missing Props (Priority: Low)
- [ ] `fetcherKey` prop missing in CartForm calls
- [ ] Other optional props that became required

**Solution**: Add missing props or update component interfaces

## Implementation Strategy

### Phase 1: Fix Import Issues (Tasks 10-15)
1. Audit all type imports from @shopify/hydrogen
2. Find correct import paths or alternative exports
3. Update imports across all affected files

### Phase 2: Fix Component Compatibility (Task 19)
1. Extend react-router-patches.d.ts with missing components
2. Add more wrappers to ReactRouterCompat.tsx if needed
3. Apply wrappers consistently across the codebase

### Phase 3: Fix Type Annotations (Tasks 16-17)
1. Add explicit types to all implicit any parameters
2. Use proper TypeScript utility types where needed
3. Ensure all function parameters have types

### Phase 4: Fix Type Inference (Task 18)
1. Improve flattenConnection usage or add targeted assertions
2. Use proper type guards for discriminated unions
3. Add helper functions for type narrowing if needed

### Phase 5: Fix Missing Props (Task 20)
1. Audit all component usage for missing required props
2. Add default values or make props optional where appropriate
3. Update component calls with required props

## Testing Strategy
After each phase:
1. Run `npm run typecheck` to verify errors are reduced
2. Run `npm run dev` to ensure runtime functionality
3. Run `npm run build` to verify production build
4. Test key user flows in the browser

## Success Criteria
- [ ] 0 TypeScript errors when running `npm run typecheck`
- [ ] Successful development server startup
- [ ] Successful production build
- [ ] All routes load without errors
- [ ] Cart functionality works correctly
- [ ] Search functionality works correctly