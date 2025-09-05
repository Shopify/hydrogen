# PR 3: Core Hydrogen Package Infrastructure - Detailed Execution Plan

## Overview
This PR implements the core React Router 7.8.x infrastructure in the @shopify/hydrogen package. This includes the proxy-based hybrid context system, React Router preset, TypeScript module augmentation, and essential exports that the skeleton template depends on. This is the most critical PR after version pinning and basic package updates.

## Pre-requisites
- **CRITICAL**: PR 0 (Version pinning) MUST be merged first
- **RECOMMENDED**: PR 1, 2 should ideally be merged
- Working from branch: `hydrogen-react-router-7.8.2-clean`
- Target branch: `main` (with PR 0 merged)
- Required tools: git, npm, node
- Clean working directory

## Phase 1: Setup and Branch Preparation

### Task 1.1: Verify Prerequisites
**WHAT:** Confirm PR 0 is merged to main  
**WHY:** Need consistent React Router 7.8.2 versions  
**STEPS:**
1. Fetch latest main: `git fetch origin main`
2. Check PR 0 (version pinning):
   ```bash
   git log origin/main --oneline | grep -i "pin.*react.*router.*7.8.2" | head -1
   ```
3. If not found, STOP - PR 0 must be merged first
4. Check PR 1 and 2 (optional but recommended):
   ```bash
   git log origin/main --oneline | grep -i "remix-oxygen" | head -1
   git log origin/main --oneline | grep -i "hydrogen-react" | head -1
   ```
5. Document status: `echo "Prerequisites: PR0 ✓" > pr3-status.txt`

### Task 1.2: Create Feature Branch
**WHAT:** Create branch for hydrogen core changes  
**WHY:** Isolate core infrastructure changes  
**STEPS:**
1. Checkout and update main:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Create feature branch: `git checkout -b feat/hydrogen-core-rr-7.8`
3. Verify clean state: `git status`
4. Note commit: `git log -1 --oneline`
5. Document: `echo "Branch created from: $(git rev-parse --short HEAD)" >> pr3-status.txt`

### Task 1.3: Initial Package Assessment
**WHAT:** Verify hydrogen package current state  
**WHY:** Understand baseline before changes  
**STEPS:**
1. Navigate to package: `cd packages/hydrogen`
2. Check structure:
   ```bash
   ls -la src/
   ls -la src/*.ts | head -10
   ```
3. Install dependencies: `npm install`
4. Attempt baseline build: `npm run build 2>&1 | tee baseline-build.log`
5. Document any existing issues

## Phase 2: Cherry-Pick Core Infrastructure Commits

### Task 2.1: Apply React Router Foundation
**WHAT:** Cherry-pick the React Router foundation commit  
**WHY:** Sets up basic React Router integration  
**STEPS:**
1. Cherry-pick: `git cherry-pick 22e4ca3`
2. If conflicts:
   - Usually in package.json (already resolved in PR 0)
   - Accept incoming changes for new files
   - For package.json: `git checkout HEAD -- package.json`
3. Continue if needed: `git cherry-pick --continue`
4. Verify new files added:
   ```bash
   git status --short | grep "^A"
   ```
5. Document: `echo "Foundation commit: SUCCESS" >> pr3-status.txt`

### Task 2.2: Apply Hybrid Context Implementation
**WHAT:** Cherry-pick the hybrid context system  
**WHY:** Enables both direct and context.get() access patterns  
**STEPS:**
1. Cherry-pick: `git cherry-pick 7ae1060`
2. This adds createHydrogenContext functionality
3. If conflicts:
   - Check src/index.ts exports
   - Ensure new exports are included
4. Verify file created:
   ```bash
   ls -la src/createHydrogenContext.ts
   ```
5. Should exist with hybrid context implementation

### Task 2.3: Apply Proxy-Based Context
**WHAT:** Cherry-pick the proxy implementation  
**WHY:** Enables transparent context access  
**STEPS:**
1. Cherry-pick: `git cherry-pick ee23476`
2. This enhances the context system with proxy support
3. Check implementation:
   ```bash
   grep -n "Proxy" src/createHydrogenContext.ts | head -5
   ```
4. Should see Proxy usage for context wrapping
5. Document: `echo "Proxy context: APPLIED" >> pr3-status.txt`

### Task 2.4: Apply TypeScript Server Recognition
**WHAT:** Cherry-pick TypeScript server enhancements  
**WHY:** Better TypeScript support for server-side code  
**STEPS:**
1. Cherry-pick: `git cherry-pick 269853d`
2. This improves TypeScript's understanding of server context
3. Check for type updates:
   ```bash
   grep -r "HydrogenRouterContextProvider" src/ --include="*.ts" | head -3
   ```
4. Should see type definitions
5. Document results

### Task 2.5: Apply React Router Preset
**WHAT:** Cherry-pick the React Router preset configuration  
**WHY:** Provides default configuration for React Router  
**STEPS:**
1. Cherry-pick: `git cherry-pick 16f51f4`
2. This adds the preset configuration
3. Verify file created:
   ```bash
   ls -la src/react-router-preset.ts
   ```
4. Check exports:
   ```bash
   grep "export" src/react-router-preset.ts
   ```
5. Should export hydrogenPreset function

### Task 2.6: Apply UIMatch Type Fix
**WHAT:** Cherry-pick the UIMatch type compatibility fix  
**WHY:** Fixes type issues with React Router 7.8.x  
**STEPS:**
1. Cherry-pick: `git cherry-pick 3b9207c`
2. This fixes test type issues
3. Check the fix:
   ```bash
   grep -n "UIMatch" src/seo/seo.test.ts | head -5
   ```
4. Should see updated UIMatch usage
5. Document: `echo "All commits applied" >> pr3-status.txt`

## Phase 3: Verify Core Files Created

### Task 3.1: Check Context System Files
**WHAT:** Verify all context-related files exist  
**WHY:** These are critical for the hybrid context system  
**STEPS:**
1. Check core files:
   ```bash
   ls -la src/createHydrogenContext.ts
   ls -la src/context-keys.ts
   ls -la src/types.d.ts
   ```
2. All should exist
3. Check context keys content:
   ```bash
   cat src/context-keys.ts | grep "export const"
   ```
4. Should export HYDROGEN_CONTEXT_KEY and others
5. Document file count

### Task 3.2: Check React Router Integration
**WHAT:** Verify React Router preset and types  
**WHY:** Required for skeleton configuration  
**STEPS:**
1. Check preset:
   ```bash
   cat src/react-router-preset.ts | grep "export.*function"
   ```
2. Should export hydrogenPreset
3. Check module augmentation:
   ```bash
   ls -la react-router.d.ts
   cat react-router.d.ts | head -10
   ```
4. Should declare module for type augmentation
5. Document exports

### Task 3.3: Verify Index Exports
**WHAT:** Ensure all new exports are in index.ts  
**WHY:** Skeleton imports these exports  
**STEPS:**
1. Check exports:
   ```bash
   grep "export.*from.*createHydrogenContext" src/index.ts
   grep "export.*NonceProvider" src/index.ts
   grep "export.*HydrogenRouterContextProvider" src/index.ts
   ```
2. All should be exported
3. If missing, add exports:
   ```typescript
   export { createHydrogenContext } from './createHydrogenContext';
   export { NonceProvider } from './NonceProvider';
   export type { HydrogenRouterContextProvider } from './types';
   ```
4. Document all exports found

## Phase 4: Build and Type Validation

### Task 4.1: Clean Build Test
**WHAT:** Perform clean build with new infrastructure  
**WHY:** Ensure all code compiles correctly  
**STEPS:**
1. Clean previous build:
   ```bash
   rm -rf dist/
   rm -rf node_modules/.cache
   ```
2. Run build:
   ```bash
   npm run build
   ```
3. Expected: Build completes successfully
4. If errors:
   - Check import statements
   - Verify all files are included
   - Fix and retry
5. Document: `echo "Build: SUCCESS" >> pr3-status.txt`

### Task 4.2: Verify Build Output
**WHAT:** Check that build produces expected files  
**WHY:** Ensure all exports are available  
**STEPS:**
1. Check dist structure:
   ```bash
   ls -la dist/ | head -10
   ls -la dist/vite/ 2>/dev/null
   ls -la dist/node/ 2>/dev/null
   ```
2. Check key exports in dist:
   ```bash
   grep -l "createHydrogenContext" dist/index.js
   grep -l "hydrogenPreset" dist/index.js
   ```
3. Both should be found
4. Check file sizes (not empty)
5. Document structure

### Task 4.3: TypeScript Validation
**WHAT:** Run TypeScript type checking  
**WHY:** Ensure type safety  
**STEPS:**
1. Run typecheck:
   ```bash
   npm run typecheck
   ```
2. Should complete without errors
3. If errors:
   - Check for UIMatch issues
   - Verify React Router types
   - Fix and retry
4. Document: `echo "TypeCheck: PASS" >> pr3-status.txt`

## Phase 5: Test Suite Validation

### Task 5.1: Run Unit Tests
**WHAT:** Execute the test suite  
**WHY:** Ensure no regressions  
**STEPS:**
1. Run tests:
   ```bash
   npm run test 2>&1 | tee test-results.log
   ```
2. Focus on seo tests (where UIMatch fix was applied):
   ```bash
   npm run test seo.test
   ```
3. All tests should pass
4. If failures:
   - Check if related to our changes
   - UIMatch type issues should be fixed
   - Other failures may be pre-existing
5. Document test results

### Task 5.2: Test Context System
**WHAT:** Verify context system works  
**WHY:** Core functionality for skeleton  
**STEPS:**
1. Create test file: `test-context.mjs`
2. Add content:
   ```javascript
   import { createHydrogenContext } from './dist/index.js';
   
   // Test context creation
   const context = createHydrogenContext({
     env: { SESSION_SECRET: 'test' },
     request: new Request('http://localhost'),
     waitUntil: () => {}
   });
   
   console.log('Context type:', typeof context);
   console.log('Has env:', 'env' in context);
   console.log('Context test: PASS');
   ```
3. Run: `node test-context.mjs`
4. Should output success
5. Clean up: `rm test-context.mjs`

### Task 5.3: Test Preset Export
**WHAT:** Verify React Router preset is accessible  
**WHY:** Skeleton uses this for configuration  
**STEPS:**
1. Create test: `test-preset.mjs`
2. Add content:
   ```javascript
   import { hydrogenPreset } from './dist/react-router-preset.js';
   
   console.log('Preset type:', typeof hydrogenPreset);
   
   if (typeof hydrogenPreset === 'function') {
     console.log('Preset test: PASS');
   } else {
     console.error('Preset test: FAIL');
     process.exit(1);
   }
   ```
3. Run: `node test-preset.mjs`
4. Should pass
5. Clean up: `rm test-preset.mjs`

## Phase 6: Integration Testing

### Task 6.1: Test TypeScript Module Augmentation
**WHAT:** Verify module augmentation works  
**WHY:** Required for TypeScript projects  
**STEPS:**
1. Create test: `test-augmentation.ts`
2. Add content:
   ```typescript
   import '@shopify/hydrogen/react-router-types';
   import { createHydrogenContext } from './dist/index';
   
   // This should compile without errors
   const test: any = createHydrogenContext;
   console.log('Augmentation test: PASS');
   ```
3. Compile: `npx tsc test-augmentation.ts --noEmit --skipLibCheck`
4. Should compile without errors
5. Clean up: `rm test-augmentation.ts`

### Task 6.2: Verify All Critical Exports
**WHAT:** Comprehensive export check  
**WHY:** Skeleton needs all these exports  
**STEPS:**
1. Create comprehensive test: `test-exports.mjs`
2. Add content:
   ```javascript
   import * as Hydrogen from './dist/index.js';
   
   const requiredExports = [
     'createHydrogenContext',
     'NonceProvider',
     'HydrogenRouterContextProvider',
     'hydrogenPreset'
   ];
   
   let allFound = true;
   for (const exp of requiredExports) {
     if (!(exp in Hydrogen) && typeof Hydrogen[exp] === 'undefined') {
       console.error(`Missing export: ${exp}`);
       allFound = false;
     }
   }
   
   console.log(allFound ? 'All exports: PASS' : 'Exports: FAIL');
   ```
3. Run: `node test-exports.mjs`
4. All exports should be found
5. Clean up: `rm test-exports.mjs`

## Phase 7: Documentation and Cleanup

### Task 7.1: Update Package Documentation
**WHAT:** Check if README needs updates  
**WHY:** Document new React Router integration  
**STEPS:**
1. Check README:
   ```bash
   grep -i "react-router\|remix" README.md | head -5
   ```
2. If mentions Remix, consider updating
3. If no mentions, leave as-is
4. Don't add extensive documentation (separate PR)
5. Document any changes made

### Task 7.2: Verify No Extra Files
**WHAT:** Ensure only necessary files added  
**WHY:** Keep PR focused  
**STEPS:**
1. List all new files:
   ```bash
   git status --short | grep "^A"
   ```
2. Should only be:
   - Core context files
   - React Router preset
   - Type definitions
   - Module augmentation
3. No test files or examples
4. If extra files, remove them
5. Document file count

## Phase 8: Final Validation

### Task 8.1: Lint Check
**WHAT:** Run linting on hydrogen package  
**WHY:** Code quality  
**STEPS:**
1. Run lint: `npm run lint`
2. If fixable issues: `npm run lint -- --fix`
3. Review remaining issues
4. Fix critical ones
5. Document: `echo "Lint: COMPLETE" >> pr3-status.txt`

### Task 8.2: Verify Minimal Scope
**WHAT:** Ensure we only changed core infrastructure  
**WHY:** This PR should be focused  
**STEPS:**
1. Check changed files:
   ```bash
   git diff --name-only main | sort
   ```
2. Should be ~18 files in packages/hydrogen/
3. All should be related to:
   - Context system
   - React Router integration
   - Type definitions
4. No unrelated changes
5. Document file count

### Task 8.3: Final Build and Test
**WHAT:** Complete validation  
**WHY:** Ensure PR is ready  
**STEPS:**
1. Final clean build:
   ```bash
   rm -rf dist/
   npm run build
   npm run typecheck
   npm run test
   ```
2. All should pass
3. Record: `echo "Final validation: SUCCESS" >> pr3-status.txt`
4. Return to monorepo root: `cd ../..`

## Phase 9: Commit and Push

### Task 9.1: Review All Changes
**WHAT:** Final review before push  
**WHY:** Ensure quality  
**STEPS:**
1. Review complete diff:
   ```bash
   git diff main
   ```
2. Check each file serves a purpose
3. No debug code or console.logs
4. All changes support React Router 7.8.x
5. Document total lines changed

### Task 9.2: Squash Commits If Needed
**WHAT:** Clean commit history  
**WHY:** Easier review  
**STEPS:**
1. Check commit count:
   ```bash
   git log --oneline main..HEAD
   ```
2. If more than 6 commits (one per cherry-pick), squash:
   ```bash
   git rebase -i main
   # Keep first, squash others
   ```
3. Final message:
   ```
   feat(hydrogen): core React Router 7.8.x infrastructure
   
   - Implement proxy-based hybrid context system
   - Add React Router preset configuration
   - Export HydrogenRouterContextProvider interface
   - Add TypeScript module augmentation
   - Export NonceProvider and context utilities
   - Fix UIMatch type compatibility
   
   This provides the core infrastructure that the skeleton
   template depends on for React Router 7.8.x compatibility.
   
   Part of React Router 7.8.x migration (PR 3 of 9)
   ```

### Task 9.3: Push Branch
**WHAT:** Push to GitHub  
**WHY:** Create PR  
**STEPS:**
1. Push: `git push origin feat/hydrogen-core-rr-7.8`
2. Note URL provided
3. Verify push succeeded

## Phase 10: Pull Request Creation

### Task 10.1: Create GitHub PR
**WHAT:** Open pull request  
**WHY:** Begin review  
**STEPS:**
1. Go to GitHub
2. Click "Compare & pull request"
3. Base: `main`
4. Compare: `feat/hydrogen-core-rr-7.8`
5. Title: "feat(hydrogen): core React Router 7.8.x infrastructure"

### Task 10.2: PR Description Template
**WHAT:** Comprehensive description  
**WHY:** Help reviewers understand  
**STEPS:**
Copy and use:
```markdown
## Summary
Implement core React Router 7.8.x infrastructure in @shopify/hydrogen package. This is PR 3 of 9 in the migration strategy.

## Dependencies
⚠️ **REQUIRES**: PR 0 must be merged first
- PR 0: Version pinning ✅
- PR 1: Remix-Oxygen (recommended) ⭕
- PR 2: Hydrogen-React (recommended) ⭕

## Changes
### Context System
- ✅ Proxy-based hybrid context implementation
- ✅ Support for both direct access and context.get() patterns
- ✅ React Router context keys for native integration
- ✅ HydrogenRouterContextProvider interface

### React Router Integration
- ✅ React Router preset configuration (hydrogenPreset)
- ✅ TypeScript module augmentation
- ✅ NonceProvider export for CSP support
- ✅ UIMatch type compatibility fix

### Files Changed (~18 files)
- `src/createHydrogenContext.ts` - NEW: Hybrid context system
- `src/context-keys.ts` - NEW: React Router context keys
- `src/types.d.ts` - NEW: TypeScript interfaces
- `src/react-router-preset.ts` - NEW: Configuration preset
- `react-router.d.ts` - NEW: Module augmentation
- `src/index.ts` - MODIFIED: New exports
- `src/seo/seo.test.ts` - MODIFIED: UIMatch type fix
- Plus supporting files and tests

## Testing
- [x] Package builds successfully
- [x] TypeScript compilation passes
- [x] All tests pass
- [x] Context system functional
- [x] Preset exports correctly
- [x] Module augmentation works

## Why This Is Critical
The skeleton template depends on these exports:
- Imports HydrogenRouterContextProvider type
- Uses hydrogenPreset() in configuration
- Requires context system for data loading
- Needs TypeScript augmentation to compile

Without this PR, the skeleton template cannot function with React Router 7.8.x.

## Migration Impact
- No breaking changes for existing apps
- New context system is backward compatible
- Types are properly augmented

## Next Steps
After this PR:
1. PR 4: CLI minimal updates
2. PR 5: Skeleton template migration
3. Skeleton will have all required dependencies

## Related
- Part of #3127 breakdown strategy
- See PRS_STRATEGY.md for overall plan
- Commits cherry-picked from hydrogen-react-router-7.8.x branch

## Validation
Run these commands to verify:
```bash
cd packages/hydrogen
npm run build
npm run typecheck
npm run test
```
```

## Success Criteria Checklist
- [ ] PR 0 (Version pinning) merged first
- [ ] Feature branch created from main
- [ ] All 6 commits cherry-picked successfully
- [ ] Context system files created
- [ ] React Router preset implemented
- [ ] Module augmentation added
- [ ] All exports available
- [ ] Package builds without errors
- [ ] TypeScript passes
- [ ] Tests pass
- [ ] ~18 files modified
- [ ] Only packages/hydrogen/ modified
- [ ] No debug code
- [ ] Clean commit history
- [ ] PR created and ready

## Troubleshooting Guide

### Issue: Cherry-pick conflicts
**Solution:**
1. Package.json conflicts: Use HEAD version (PR 0)
2. New file conflicts: Accept incoming
3. Export conflicts: Merge both
4. Continue: `git cherry-pick --continue`

### Issue: Build fails with missing exports
**Solution:**
1. Check src/index.ts has all exports
2. Add missing exports manually
3. Ensure createHydrogenContext is exported
4. Check NonceProvider export

### Issue: TypeScript errors
**Solution:**
1. Check UIMatch usage in tests
2. Verify React Router types at 7.8.2
3. Check module augmentation file exists
4. Try skipLibCheck temporarily

### Issue: Test failures
**Solution:**
1. Focus on seo.test.ts (UIMatch fix)
2. Other failures may be pre-existing
3. Document which tests fail
4. If critical, investigate imports

### Issue: Context system not working
**Solution:**
1. Verify createHydrogenContext.ts exists
2. Check Proxy implementation
3. Ensure context-keys.ts exports keys
4. Test with simple example

## Notes for Implementer
- This is the most complex PR in the series
- Take time to understand the context system
- The proxy implementation is key
- Module augmentation enables TypeScript support
- All exports are critical for skeleton
- Test thoroughly before pushing
- Document any unexpected issues