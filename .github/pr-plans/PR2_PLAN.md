# PR 2: Hydrogen-React Package Updates - Detailed Execution Plan

## Overview
This PR fixes critical TypeScript and GraphQL compatibility issues in the @shopify/hydrogen-react package to support React Router 7.8.x and TypeScript 5.9. These fixes are required for the skeleton template to compile without errors.

## Pre-requisites
- Working from branch: `hydrogen-react-router-7.8.2-clean`
- Target branch: `main`
- Required tools: git, npm, node
- PR 0 must be merged first (version pinning)
- PR 1 should ideally be merged (but not strictly required)
- Clean working directory

## Phase 1: Setup and Branch Preparation

### Task 1.1: Create Feature Branch
**WHAT:** Create a clean feature branch for PR 2 changes  
**WHY:** Isolate hydrogen-react changes for independent testing and review  
**STEPS:**
1. Ensure you're on main branch: `git checkout main`
2. Pull latest changes: `git pull origin main`
3. Create feature branch: `git checkout -b feat/hydrogen-react-rr-7.8-compat`
4. Verify clean state: `git status` (should show no changes)
5. Note current commit: `git log -1 --oneline` (record for reference)

### Task 1.2: Initial Package Build Verification
**WHAT:** Verify hydrogen-react package builds on main  
**WHY:** Establish baseline and identify any existing issues  
**STEPS:**
1. Navigate to package: `cd packages/hydrogen-react`
2. Install dependencies: `npm install`
3. Run build: `npm run build`
4. Run tests: `npm run test`
5. Run typecheck: `npm run typecheck`
6. Document results: `echo "Baseline build: SUCCESS" > build-status.txt`
7. Note any existing warnings or issues

## Phase 2: Apply GraphQL Codegen Enum Compatibility Fix

### Task 2.1: Cherry-pick GraphQL Enum Fix
**WHAT:** Apply the GraphQL codegen enum compatibility fix  
**WHY:** Fixes type incompatibility between Storefront API and Customer Account API enums  
**STEPS:**
1. Cherry-pick commit: `git cherry-pick 636bc80e2f66a7f04741acf49b59c98ff6b15b8c`
2. This commit should modify:
   - Generated GraphQL type files
   - Possibly `codegen.ts` configuration
3. If conflicts in generated files:
   - Accept incoming changes (the fixed versions)
   - These are auto-generated, so incoming is correct
4. Verify changes applied: `git diff HEAD~1`

### Task 2.2: Understand the Enum Fix
**WHAT:** Verify what the enum fix actually does  
**WHY:** Ensure we understand the change for documentation and testing  
**STEPS:**
1. Check codegen.ts: `cat codegen.ts | grep -A 10 enumValues`
2. Should see configuration that makes Customer Account API reference Storefront API types
3. Look for:
   ```typescript
   enumValues: {
     LanguageCode: '#LanguageCode',
     CurrencyCode: '#CurrencyCode',
   }
   ```
4. This makes both APIs use the same enum types, avoiding conflicts

### Task 2.3: Verify GraphQL Types
**WHAT:** Check that GraphQL types are properly generated  
**WHY:** Ensure the enum fix is reflected in generated types  
**STEPS:**
1. Look for generated files:
   ```bash
   ls -la customer-account-api-types.d.ts
   ls -la storefront-api-types.d.ts
   ```
2. Check LanguageCode in Customer Account types:
   ```bash
   grep -n "LanguageCode" customer-account-api-types.d.ts | head -5
   ```
3. Should reference the Storefront API type, not define its own
4. Document findings in build-status.txt

## Phase 3: Apply TypeScript 5.9 Inference Fix

### Task 3.1: Cherry-pick TypeScript 5.9 Fix
**WHAT:** Apply the TypeScript 5.9 type inference fix  
**WHY:** Fixes "Type instantiation is excessively deep" errors in TypeScript 5.9  
**STEPS:**
1. Cherry-pick commit: `git cherry-pick df0982509056c2f5f5085c31d0469c18d01fc698`
2. This should modify files that have recursive type inference
3. If this commit touches example files (metaobjects), we only want hydrogen-react changes:
   ```bash
   git cherry-pick -n df0982509056c2f5f5085c31d0469c18d01fc698
   git reset HEAD
   git add packages/hydrogen-react/
   git commit -m "fix(hydrogen-react): resolve TypeScript 5.9 type inference issues"
   ```
4. If no hydrogen-react changes in this commit, skip it

### Task 3.2: Identify Type Inference Issues
**WHAT:** Check for any recursive type patterns in the package  
**WHY:** TypeScript 5.9 is stricter about type recursion depth  
**STEPS:**
1. Search for potentially problematic patterns:
   ```bash
   grep -r "extends.*<.*extends" src/ || echo "No nested extends found"
   grep -r "type.*=.*type" src/ || echo "No recursive types found"
   ```
2. Look for complex generic constraints:
   ```bash
   grep -r "<T extends" src/ | grep -v "^//" | head -10
   ```
3. Document any findings that might cause TS 5.9 issues

## Phase 4: Update Package Dependencies

### Task 4.1: Update React Router Version (if needed)
**WHAT:** Check if hydrogen-react has React Router dependencies  
**WHY:** Ensure version consistency across packages  
**STEPS:**
1. Check package.json: `cat package.json | grep -i "react-router"`
2. If React Router is listed as dependency or peer dependency:
   - Open `package.json` in editor
   - Update to exact "7.8.2" (no ~ or ^)
   - Save file
3. If not listed, no action needed
4. Document in build-status.txt

### Task 4.2: Check Other Dependencies
**WHAT:** Verify all dependencies are compatible  
**WHY:** Ensure no version conflicts with React Router 7.8.x  
**STEPS:**
1. Check React version: `cat package.json | grep '"react"'`
2. Should be "^18.2.0" or "18.3.1"
3. Check TypeScript version in devDependencies
4. Should support TypeScript 5.9
5. If updates needed, modify and save

## Phase 5: Build and Test Validation

### Task 5.1: Clean Build
**WHAT:** Perform clean build to ensure all changes compile  
**WHY:** Verify no compilation errors with fixes applied  
**STEPS:**
1. Clean previous build: `rm -rf dist/`
2. Clear cache: `rm -rf node_modules/.cache`
3. Install dependencies: `npm install`
4. Run build: `npm run build`
5. Expected: Build completes without errors
6. If errors:
   - Note the specific error
   - Check if it's enum-related or type-recursion related
   - Document in build-status.txt

### Task 5.2: Verify Build Output
**WHAT:** Check that all expected files are in dist/  
**WHY:** Ensure package exports are intact  
**STEPS:**
1. Check main export: `ls -la dist/index.js`
2. Check type definitions: `ls -la dist/index.d.ts`
3. Check API types:
   ```bash
   ls -la customer-account-api-types.d.ts
   ls -la storefront-api-types.d.ts
   ```
4. Verify file sizes are reasonable (not empty)
5. Sample check for exports: `head -20 dist/index.js`

### Task 5.3: Run Type Checking
**WHAT:** Ensure TypeScript compilation succeeds  
**WHY:** Validate that type fixes work correctly  
**STEPS:**
1. Run typecheck: `npm run typecheck`
2. Should complete without errors
3. If "excessively deep" errors:
   - Note which file/type causes it
   - May need additional inference breaking
4. If enum errors:
   - Check the enumValues configuration
   - Verify generated types
5. Document results

### Task 5.4: Run Tests
**WHAT:** Execute test suite to ensure no regressions  
**WHY:** Validate existing functionality still works  
**STEPS:**
1. Run tests: `npm run test`
2. Expected: All tests pass
3. If test failures:
   - Note which tests fail
   - Check if related to enum changes
   - Check if type-related
4. Document test results in build-status.txt

## Phase 6: GraphQL Codegen Verification

### Task 6.1: Regenerate GraphQL Types
**WHAT:** Run codegen to ensure it works with fixes  
**WHY:** Verify the enum configuration works correctly  
**STEPS:**
1. Check for codegen script: `cat package.json | grep codegen`
2. If exists, run: `npm run codegen`
3. Check for changes: `git status`
4. If files changed:
   - Review changes: `git diff`
   - Should only be enum reference updates
   - Commit if changes are correct
5. If codegen fails:
   - Check codegen.ts configuration
   - Verify enumValues override is present

### Task 6.2: Verify Enum Compatibility
**WHAT:** Check that LanguageCode and CurrencyCode work across APIs  
**WHY:** This was the main issue the fix addresses  
**STEPS:**
1. Create test file: `test-enum-compat.ts`
2. Add content:
   ```typescript
   import type { LanguageCode as StorefrontLang } from './storefront-api-types';
   import type { LanguageCode as CustomerLang } from './customer-account-api-types';
   
   // This should not cause type errors
   const testLang: StorefrontLang = 'EN' as CustomerLang;
   const testLang2: CustomerLang = 'EN' as StorefrontLang;
   
   console.log('Enum compatibility test passed');
   ```
3. Compile test: `npx tsc test-enum-compat.ts --noEmit`
4. Should complete without errors
5. Clean up: `rm test-enum-compat.ts`

## Phase 7: Integration Testing

### Task 7.1: Test Package Exports
**WHAT:** Verify the package exports work correctly  
**WHY:** Consumers need to be able to import from this package  
**STEPS:**
1. Create test file: `test-exports.mjs`
2. Add content:
   ```javascript
   import { CartProvider, ShopifyProvider } from './dist/index.js';
   
   console.log('CartProvider:', typeof CartProvider);
   console.log('ShopifyProvider:', typeof ShopifyProvider);
   
   if (typeof CartProvider === 'function' && typeof ShopifyProvider === 'function') {
     console.log('✓ Exports test passed');
   } else {
     console.error('✗ Exports test failed');
     process.exit(1);
   }
   ```
3. Run test: `node test-exports.mjs`
4. Should output success message
5. Clean up: `rm test-exports.mjs`

### Task 7.2: Test TypeScript Exports
**WHAT:** Verify TypeScript types are properly exported  
**WHY:** Type safety is critical for consumers  
**STEPS:**
1. Create test file: `test-types.ts`
2. Add content:
   ```typescript
   import type { 
     Cart,
     CartLineInput,
     Product,
     ProductVariant 
   } from './storefront-api-types';
   
   // Test that types are accessible
   const testCart: Partial<Cart> = {};
   const testProduct: Partial<Product> = {};
   
   console.log('Type exports test passed');
   ```
3. Compile: `npx tsc test-types.ts --noEmit --skipLibCheck`
4. Should complete without errors
5. Clean up: `rm test-types.ts`

## Phase 8: Final Validation

### Task 8.1: Lint Check
**WHAT:** Run linting to ensure code style compliance  
**WHY:** Maintain code quality standards  
**STEPS:**
1. Check if lint script exists: `cat package.json | grep '"lint"'`
2. If exists, run: `npm run lint`
3. If issues found:
   - Auto-fix if possible: `npm run lint -- --fix`
   - Review remaining issues
   - Fix manually if needed
4. If no lint script, skip this step

### Task 8.2: Final Build Verification
**WHAT:** One final build to ensure everything works  
**WHY:** Confirm no issues before creating PR  
**STEPS:**
1. Clean and rebuild:
   ```bash
   rm -rf dist/
   npm run build
   ```
2. Run all checks:
   ```bash
   npm run typecheck
   npm run test
   npm run lint 2>/dev/null || echo "No lint script"
   ```
3. All should pass
4. Update build-status.txt: `echo "Final build: SUCCESS" >> build-status.txt`

### Task 8.3: Verify No Unintended Changes
**WHAT:** Ensure only hydrogen-react package was modified  
**WHY:** This PR should only touch hydrogen-react  
**STEPS:**
1. Check changed files: `git status`
2. Check diff: `git diff --stat`
3. Should only show files in `packages/hydrogen-react/`
4. If other files modified:
   - Reset them: `git checkout -- <file>`
   - Or justify why they're needed
5. Final review: `git diff --cached`

## Phase 9: Commit and Push

### Task 9.1: Review All Changes
**WHAT:** Carefully review all changes before committing  
**WHY:** Ensure only intended fixes are included  
**STEPS:**
1. Show all changes: `git diff HEAD main`
2. Should see:
   - Enum compatibility changes in codegen or types
   - Possible TypeScript inference fixes
   - No unrelated changes
3. Count changed files: `git diff --stat HEAD main`
4. Should be ~9 files or fewer

### Task 9.2: Create Final Commit
**WHAT:** Create clean commit with descriptive message  
**WHY:** Clear history for reviewers  
**STEPS:**
1. If multiple commits, squash them:
   ```bash
   git rebase -i main
   # Mark all but first as 'squash'
   ```
2. Write commit message:
   ```
   fix(hydrogen-react): resolve TypeScript 5.9 and GraphQL enum compatibility
   
   - Fix LanguageCode/CurrencyCode enum compatibility between APIs
   - Apply enumValues override in codegen configuration
   - Resolve TypeScript 5.9 "excessively deep" type inference issues
   - Ensure Customer Account API uses Storefront API enum types
   
   This allows the skeleton template to compile without type errors
   when using both Storefront and Customer Account APIs together.
   
   Fixes compatibility with TypeScript 5.9 stricter recursion limits.
   ```

### Task 9.3: Push Branch
**WHAT:** Push feature branch to GitHub  
**WHY:** Required to create pull request  
**STEPS:**
1. Push branch: `git push origin feat/hydrogen-react-rr-7.8-compat`
2. Note the URL provided for creating PR
3. If push rejected, check permissions

## Phase 10: Pull Request Creation

### Task 10.1: Create GitHub PR
**WHAT:** Open pull request on GitHub  
**WHY:** Begin review process  
**STEPS:**
1. Navigate to GitHub repository
2. Click "Compare & pull request" button
3. Set base branch: `main`
4. Set compare branch: `feat/hydrogen-react-rr-7.8-compat`
5. Title: "fix(hydrogen-react): TypeScript 5.9 and GraphQL enum compatibility"

### Task 10.2: PR Description Template
**WHAT:** Use this template for PR description  
**WHY:** Provide context for reviewers  
**STEPS:**
Copy and use this template:
```markdown
## Summary
Fixes critical TypeScript and GraphQL compatibility issues in @shopify/hydrogen-react package as part of React Router 7.8.x migration (PR 2 of 9).

## Problem
- TypeScript errors in skeleton template when using Customer Account API
- LanguageCode/CurrencyCode enum conflicts between Storefront and Customer Account APIs
- TypeScript 5.9 "Type instantiation is excessively deep" errors

## Solution
- ✅ Applied enumValues override to reference Storefront API types from Customer Account API
- ✅ Fixed recursive type inference issues for TypeScript 5.9 compatibility
- ✅ Regenerated GraphQL types with proper enum references

## Changes
- Modified GraphQL codegen configuration
- Updated generated type files
- Fixed recursive type patterns

## Testing
- [x] Package builds successfully
- [x] TypeScript compilation passes
- [x] All tests pass
- [x] Enum compatibility verified
- [x] No type recursion errors

## Dependencies
- PR 0 (Version pinning) must be merged first
- PR 1 (Remix-Oxygen) recommended but not required
- This package is independent and can be merged separately

## Migration Guide
No changes required for consumers. This is a compatibility fix only.

## Related
- Part of #3127 breakdown strategy
- See PRS_STRATEGY.md for overall plan
```

## Success Criteria Checklist
- [ ] Feature branch created from main
- [ ] GraphQL enum fix cherry-picked successfully
- [ ] TypeScript 5.9 fix applied (if applicable)
- [ ] Package builds without errors
- [ ] TypeScript compilation succeeds
- [ ] All tests pass
- [ ] GraphQL codegen works
- [ ] Enum compatibility verified between APIs
- [ ] No "excessively deep" type errors
- [ ] Only hydrogen-react package modified
- [ ] No unintended files changed
- [ ] Clean commit history
- [ ] PR created and ready for review

## Troubleshooting Guide

### Issue: Cherry-pick conflicts in generated files
**Solution:**
1. Generated files should always take incoming changes
2. Run codegen after resolving conflicts
3. Commit the regenerated files

### Issue: Enum type conflicts persist
**Solution:**
1. Check codegen.ts has enumValues configuration
2. Verify it maps to Storefront API types with '#'
3. Re-run codegen: `npm run codegen`
4. Check generated customer-account-api-types.d.ts

### Issue: TypeScript 5.9 "excessively deep" errors
**Solution:**
1. Identify the specific type causing issues
2. Break recursion with strategic `unknown` casts
3. Maintain type safety at usage points
4. Test that inference still works for consumers

### Issue: Build fails with module errors
**Solution:**
1. Check all imports in modified files
2. Verify package.json dependencies
3. Clear node_modules and reinstall
4. Check tsconfig.json settings

### Issue: Tests fail after changes
**Solution:**
1. Run tests with verbose output
2. Check if failures are type-related
3. May need to update test types
4. Ensure mocks match new types

### Issue: Codegen script not found
**Solution:**
1. Check if this package uses codegen
2. Look for graphql-codegen config files
3. May need to run from monorepo root
4. Check README for instructions

## Notes for Implementer
- This PR is simpler than PR 3 (Hydrogen core) - fewer changes
- Focus is on compatibility fixes, not new features
- If the TS 5.9 fix commit doesn't touch hydrogen-react, skip it
- Enum fix is the critical change for skeleton compatibility
- Test the enum compatibility thoroughly
- Keep changes minimal - only fix what's broken
- Document any unexpected issues in build-status.txt