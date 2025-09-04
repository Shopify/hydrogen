# PR 5: Skeleton Template Migration - Detailed Execution Plan

## Overview
This PR migrates the skeleton template to React Router 7.8.x, replacing all Remix imports with React Router imports and updating the context system. This is the most critical PR after the package updates, as it's the default template for new Hydrogen projects.

## Pre-requisites
- **CRITICAL**: PR 0, 1, 2, 3, and 4 MUST be merged first
- Working from branch: `hydrogen-react-router-7.8.2-clean`
- Target branch: `main` (with PR 0-4 merged)
- Required tools: git, npm, node
- Clean working directory

## Phase 1: Setup and Branch Preparation

### Task 1.1: Verify Prerequisites
**WHAT:** Confirm PR 0-4 are merged to main  
**WHY:** Skeleton depends on types and features from these PRs  
**STEPS:**
1. Fetch latest main: `git fetch origin main`
2. Check PR 0 (version pinning):
   ```bash
   git log origin/main --oneline | grep -i "pin.*react.*router" | head -1
   ```
3. Check PR 1 (remix-oxygen):
   ```bash
   git log origin/main --oneline | grep -i "remix-oxygen" | head -1
   ```
4. Check PR 2 (hydrogen-react):
   ```bash
   git log origin/main --oneline | grep -i "hydrogen-react.*compatibility" | head -1
   ```
5. Check PR 3 (hydrogen core):
   ```bash
   git log origin/main --oneline | grep -i "hydrogen.*core.*infrastructure" | head -1
   ```
6. Check PR 4 (CLI):
   ```bash
   git log origin/main --oneline | grep -i "cli.*minimal" | head -1
   ```
5. If any missing, STOP - wait for them to merge
6. Document status: `echo "Prerequisites: PR1 ✓ PR2 ✓ PR3 ✓" > pr5-status.txt`

### Task 1.2: Create Feature Branch
**WHAT:** Create branch from updated main  
**WHY:** Need the changes from PR 1-3 as foundation  
**STEPS:**
1. Checkout and update main:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Create feature branch: `git checkout -b feat/skeleton-rr-7.8-migration`
3. Verify clean state: `git status` (should show no changes)
4. Note commit: `git log -1 --oneline`

### Task 1.3: Baseline Skeleton Build Test
**WHAT:** Verify skeleton builds with PR 1-3 changes  
**WHY:** Establish what works before our changes  
**STEPS:**
1. Navigate to skeleton: `cd templates/skeleton`
2. Install dependencies: `npm install`
3. Try to build: `npm run build 2>&1 | tee baseline-build.log`
4. Expected: Will likely fail with import errors
5. Try typecheck: `npm run typecheck 2>&1 | tee baseline-typecheck.log`
6. Document errors - these are what we need to fix

## Phase 2: Import Migration - Core Files

### Task 2.1: Identify Files Needing Import Changes
**WHAT:** Find all files importing from @shopify/remix-oxygen  
**WHY:** These all need to change to react-router  
**STEPS:**
1. Search for Remix imports:
   ```bash
   grep -r "@shopify/remix-oxygen" app/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort -u > files-to-update.txt
   ```
2. Count files: `wc -l files-to-update.txt`
3. Should be ~35-40 files
4. Also check for LoaderFunctionArgs, ActionFunctionArgs:
   ```bash
   grep -r "LoaderFunctionArgs\|ActionFunctionArgs" app/ --include="*.ts" --include="*.tsx"
   ```
5. Document file count in pr5-status.txt

### Task 2.2: Update Route File Imports
**WHAT:** Change all route imports to react-router  
**WHY:** React Router 7.8.x is the new runtime  
**STEPS:**
1. For each route file in app/routes/:
   ```bash
   for file in app/routes/*.tsx; do
     echo "Updating $file"
     sed -i '' "s/from '@shopify\/remix-oxygen'/from 'react-router'/g" "$file"
   done
   ```
2. For TypeScript files:
   ```bash
   for file in app/routes/*.ts; do
     [ -f "$file" ] && sed -i '' "s/from '@shopify\/remix-oxygen'/from 'react-router'/g" "$file"
   done
   ```
3. Verify changes:
   ```bash
   grep "@shopify/remix-oxygen" app/routes/*.tsx
   ```
4. Should return nothing (all replaced)

### Task 2.3: Update Library File Imports
**WHAT:** Update imports in lib directory  
**WHY:** Library files also use Remix types  
**STEPS:**
1. Update lib files:
   ```bash
   for file in app/lib/*.ts; do
     echo "Updating $file"
     sed -i '' "s/from '@shopify\/remix-oxygen'/from 'react-router'/g" "$file"
   done
   ```
2. Check specifically:
   - `app/lib/session.ts`
   - `app/lib/redirect.ts`
3. Verify: `grep "@shopify/remix-oxygen" app/lib/*.ts`
4. Should return nothing

### Task 2.4: Update Entry Files
**WHAT:** Update entry.server.tsx and entry.client.tsx  
**WHY:** Entry files have special context types  
**STEPS:**
1. Open `app/entry.server.tsx`
2. Change:
   ```typescript
   // FROM:
   import type {AppLoadContext} from '@shopify/remix-oxygen';
   
   // TO:
   import type {HydrogenRouterContextProvider} from '@shopify/hydrogen';
   ```
3. Update function signature:
   ```typescript
   // FROM:
   context: AppLoadContext,
   
   // TO:
   context: HydrogenRouterContextProvider,
   ```
4. Save file
5. Check entry.client.tsx for any similar imports

## Phase 3: Context System Migration

### Task 3.1: Update Context Creation
**WHAT:** Migrate from createAppLoadContext to createHydrogenRouterContext  
**WHY:** New context system with hybrid access patterns  
**STEPS:**
1. Open `app/lib/context.ts`
2. Update function name:
   ```typescript
   // FROM:
   export async function createAppLoadContext(
   
   // TO:
   export async function createHydrogenRouterContext(
   ```
3. Update the function call:
   ```typescript
   // FROM:
   const hydrogenContext = createHydrogenContext({
   
   // TO:
   const hydrogenContext = createHydrogenContext(
     {
   ```
4. Add additional context parameter:
   ```typescript
   const additionalContext = {
     // Additional context properties can go here
   } as const;
   
   const hydrogenContext = createHydrogenContext(
     { /* existing config */ },
     additionalContext,
   );
   ```

### Task 3.2: Add TypeScript Augmentation
**WHAT:** Add type augmentation for additional context  
**WHY:** Enables TypeScript to recognize custom context properties  
**STEPS:**
1. In `app/lib/context.ts`, add before the function:
   ```typescript
   // Define the additional context object
   const additionalContext = {
     // Additional context for custom properties
   } as const;
   
   // Automatically augment HydrogenAdditionalContext
   type AdditionalContextType = typeof additionalContext;
   
   declare global {
     interface HydrogenAdditionalContext extends AdditionalContextType {}
   }
   ```
2. Save file
3. This enables both access patterns:
   - `context.storefront` (direct)
   - `context.get(storefrontContext)` (React Router native)

### Task 3.3: Update Server Entry Point
**WHAT:** Update server.ts to use new context function  
**WHY:** Server needs to create context with new system  
**STEPS:**
1. Open `server.ts`
2. Update import:
   ```typescript
   // FROM:
   import {createAppLoadContext} from '~/lib/context';
   
   // TO:
   import {createHydrogenRouterContext} from '~/lib/context';
   ```
3. Update function call:
   ```typescript
   // FROM:
   const context = await createAppLoadContext(
   
   // TO:
   const context = await createHydrogenRouterContext(
   ```
4. Save file

## Phase 4: TypeScript Configuration

### Task 4.1: Update env.d.ts
**WHAT:** Complete rewrite of env.d.ts for module augmentation  
**WHY:** New type system uses different augmentation approach  
**STEPS:**
1. Open `env.d.ts`
2. Replace entire content with:
   ```typescript
   /// <reference types="vite/client" />
   /// <reference types="react-router" />
   /// <reference types="@shopify/oxygen-workers-types" />
   /// <reference types="@shopify/hydrogen/react-router-types" />
   
   // Enhance TypeScript's built-in typings.
   import '@total-typescript/ts-reset';
   ```
3. That's it - much simpler!
4. The module augmentation now happens via the hydrogen package
5. Save file

### Task 4.2: Update tsconfig.json
**WHAT:** Add types array to tsconfig  
**WHY:** Ensures TypeScript loads the module augmentation  
**STEPS:**
1. Open `tsconfig.json`
2. In compilerOptions, add:
   ```json
   "types": [
     "@shopify/hydrogen/react-router-types"
   ]
   ```
3. Full example:
   ```json
   {
     "compilerOptions": {
       "types": [
         "@shopify/hydrogen/react-router-types"
       ],
       // ... other options
     }
   }
   ```
4. Save file

## Phase 5: React Router Configuration

### Task 5.1: Update react-router.config.ts
**WHAT:** Use the hydrogen preset for configuration  
**WHY:** Provides optimal settings for Hydrogen on Oxygen  
**STEPS:**
1. Open `react-router.config.ts`
2. Replace content with:
   ```typescript
   import type {Config} from '@react-router/dev/config';
   import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';
   
   /**
    * React Router 7.8.x Configuration for Hydrogen
    *
    * This configuration uses the official Hydrogen preset to provide optimal
    * React Router settings for Shopify Oxygen deployment. The preset enables
    * validated performance optimizations while ensuring compatibility.
    */
   export default {
     presets: [hydrogenPreset()],
   } satisfies Config;
   ```
3. Much simpler - preset handles all configuration
4. Save file

### Task 5.2: Update package.json Scripts
**WHAT:** Update scripts to include React Router typegen  
**WHY:** React Router 7.8.x can generate route types  
**STEPS:**
1. Open `package.json`
2. Update scripts:
   ```json
   "typecheck": "react-router typegen && tsc --noEmit",
   "codegen": "shopify hydrogen codegen && react-router typegen"
   ```
3. This adds route type generation to both commands
4. Save file

## Phase 6: Version Pinning

### Task 6.1: Pin React Router Versions
**WHAT:** Update all React Router packages to exact 7.8.2  
**WHY:** Version mismatches cause runtime errors  
**STEPS:**
1. Open `package.json`
2. In dependencies:
   ```json
   "react-router": "7.8.2",
   "react-router-dom": "7.8.2"
   ```
3. In devDependencies:
   ```json
   "@react-router/dev": "7.8.2",
   "@react-router/fs-routes": "7.8.2"
   ```
4. NO ~ or ^ prefixes - exact versions only
5. Also update React if needed:
   ```json
   "react": "18.3.1",
   "react-dom": "18.3.1"
   ```
6. Save file

### Task 6.2: Update Other Dependencies
**WHAT:** Ensure other deps are compatible  
**WHY:** Version consistency across the template  
**STEPS:**
1. Check @shopify packages are latest:
   ```json
   "@shopify/hydrogen": "2025.5.0",
   "@shopify/remix-oxygen": "^3.0.0",
   "@shopify/cli": "~3.80.4"
   ```
2. These should match what's in main
3. If different, use versions from main
4. Save if changed

## Phase 7: Additional File Updates

### Task 7.1: Update Root Component
**WHAT:** Ensure root.tsx uses correct imports  
**WHY:** Root component is critical for app initialization  
**STEPS:**
1. Open `app/root.tsx`
2. Check imports - should be from 'react-router'
3. If any @shopify/remix-oxygen imports, change to react-router
4. Check the context usage is correct
5. Save if changed

### Task 7.2: Update Vite Configuration
**WHAT:** Add allowed hosts to vite config  
**WHY:** Development server needs to accept certain hosts  
**STEPS:**
1. Open `vite.config.ts`
2. Add to server.hmr.host configuration:
   ```typescript
   server: {
     host: true,
     hmr: {
       host: 'localhost',
     },
   }
   ```
3. Or if allowing specific domains:
   ```typescript
   server: {
     allowedHosts: ['.tryhydrogen.dev'],
   }
   ```
4. Save file

## Phase 8: Build and Test Validation

### Task 8.1: Clean Install
**WHAT:** Fresh install to avoid cached issues  
**WHY:** Ensures clean dependency resolution  
**STEPS:**
1. Remove node_modules: `rm -rf node_modules`
2. Remove lock file: `rm -f package-lock.json`
3. Clear cache: `npm cache clean --force`
4. Install: `npm install`
5. Check for errors during install
6. If errors, usually version conflicts - check package.json

### Task 8.2: Run Codegen
**WHAT:** Generate GraphQL and route types  
**WHY:** Required for TypeScript to work properly  
**STEPS:**
1. Run codegen: `npm run codegen`
2. Should run both:
   - Shopify hydrogen codegen (GraphQL)
   - React Router typegen (routes)
3. Check for generated files:
   ```bash
   ls -la customer-accountapi.generated.d.ts
   ls -la storefrontapi.generated.d.ts
   ls -la .react-router/
   ```
4. All should exist

### Task 8.3: TypeScript Validation
**WHAT:** Verify TypeScript compilation works  
**WHY:** Must compile without errors  
**STEPS:**
1. Run typecheck: `npm run typecheck`
2. Expected: Should pass with no errors
3. If errors:
   - Check the file and line number
   - Usually import or type issues
   - Common: HydrogenRouterContextProvider not found
   - Fix: Ensure @shopify/hydrogen is latest from PR 1
4. Document results: `echo "TypeCheck: PASS" >> pr5-status.txt`

### Task 8.4: Build Test
**WHAT:** Verify production build works  
**WHY:** Must be able to build for deployment  
**STEPS:**
1. Run build: `npm run build`
2. Should create dist/ directory
3. Check output:
   ```bash
   ls -la dist/
   ls -la dist/server/
   ls -la dist/client/
   ```
4. All should have content
5. Document: `echo "Build: SUCCESS" >> pr5-status.txt`

## Phase 9: Runtime Testing

### Task 9.1: Development Server Test
**WHAT:** Start dev server and verify it runs  
**WHY:** Developers need working dev environment  
**STEPS:**
1. Start dev server: `npm run dev`
2. Should start without errors
3. Check console output for:
   - Port number (usually 3000)
   - No TypeScript errors
   - No React Router errors
4. Open browser to http://localhost:3000
5. Should see Hydrogen starter page
6. Check browser console for errors
7. Stop server (Ctrl+C)

### Task 9.2: Test Key Routes
**WHAT:** Verify critical routes work  
**WHY:** Ensure routing system functions correctly  
**STEPS:**
1. Start dev server again
2. Test these routes:
   - `/` - Homepage
   - `/products` - Products listing
   - `/collections` - Collections
   - `/cart` - Cart page
   - `/account/login` - Login page
3. Each should load without errors
4. Check network tab for failed requests
5. Document working routes

### Task 9.3: Test Context Access
**WHAT:** Verify context properties are accessible  
**WHY:** Routes need access to storefront, cart, etc.  
**STEPS:**
1. Add temporary debug to `app/routes/_index.tsx`:
   ```typescript
   export async function loader({context}: LoaderFunctionArgs) {
     console.log('Context has storefront:', !!context.storefront);
     console.log('Context has cart:', !!context.cart);
     console.log('Context has env:', !!context.env);
     // existing code...
   }
   ```
2. Reload homepage
3. Check server console for output
4. All should be true
5. Remove debug code

## Phase 10: Final Validation

### Task 10.1: Lint Check
**WHAT:** Run linting on skeleton  
**WHY:** Code quality standards  
**STEPS:**
1. Run lint: `npm run lint`
2. If errors, try auto-fix: `npm run lint -- --fix`
3. Review remaining issues
4. Fix critical ones
5. Document any unfixable warnings

### Task 10.2: Verify Import Replacement
**WHAT:** Confirm no Remix imports remain  
**WHY:** All should be React Router now  
**STEPS:**
1. Final check:
   ```bash
   grep -r "@shopify/remix-oxygen" app/ --include="*.ts" --include="*.tsx"
   ```
2. Should return nothing
3. Check for old function names:
   ```bash
   grep -r "createAppLoadContext" app/ server.ts
   ```
4. Should return nothing (all migrated)

### Task 10.3: File Count Verification
**WHAT:** Verify we modified expected files  
**WHY:** Should be ~56 files in skeleton  
**STEPS:**
1. Count modified files:
   ```bash
   git diff --name-only main | grep "^templates/skeleton" | wc -l
   ```
2. Should be around 56 files
3. List them: `git diff --name-only main | grep "^templates/skeleton"`
4. Review for any unexpected changes

## Phase 11: Commit and Push

### Task 11.1: Review All Changes
**WHAT:** Final review before committing  
**WHY:** Ensure quality and completeness  
**STEPS:**
1. Review changes: `git diff main`
2. Check:
   - All imports updated
   - Context system migrated
   - TypeScript configuration updated
   - React Router config uses preset
   - Versions pinned exactly
3. No debug code or console.logs remain

### Task 11.2: Create Commit
**WHAT:** Create comprehensive commit  
**WHY:** Clear history for review  
**STEPS:**
1. Stage all skeleton changes:
   ```bash
   git add templates/skeleton/
   ```
2. Create commit:
   ```bash
   git commit -m "feat(skeleton): migrate to React Router 7.8.x

   - Replace all @shopify/remix-oxygen imports with react-router
   - Migrate from createAppLoadContext to createHydrogenRouterContext
   - Update entry.server.tsx to use HydrogenRouterContextProvider
   - Complete rewrite of env.d.ts for module augmentation
   - Use hydrogenPreset() in react-router.config.ts
   - Pin all React Router packages to exact 7.8.2
   - Add types array to tsconfig.json
   - Update scripts to include React Router typegen
   
   This completes the skeleton template migration to React Router 7.8.x
   with full TypeScript support and hybrid context access patterns.
   
   Depends on: PR 0 (version pinning), PR 3 (hydrogen), PR 2 (hydrogen-react), PR 4 (cli)
   Part of React Router 7.8.x migration (PR 5 of 9)"
   ```

### Task 11.3: Push Branch
**WHAT:** Push to GitHub  
**WHY:** Required for PR creation  
**STEPS:**
1. Push: `git push origin feat/skeleton-rr-7.8-migration`
2. Note URL for PR creation
3. Verify push succeeded

## Phase 12: Pull Request Creation

### Task 12.1: Create GitHub PR
**WHAT:** Open pull request  
**WHY:** Begin review process  
**STEPS:**
1. Go to GitHub repository
2. Click "Compare & pull request"
3. Base: `main`
4. Compare: `feat/skeleton-rr-7.8-migration`
5. Title: "feat(skeleton): migrate to React Router 7.8.x"

### Task 12.2: PR Description Template
**WHAT:** Comprehensive PR description  
**WHY:** Context for reviewers  
**STEPS:**
Copy and use:
```markdown
## Summary
Complete migration of the skeleton template to React Router 7.8.x. This is PR 5 of 9 in the migration strategy.

## Dependencies
⚠️ **REQUIRES**: PR 0, 1, 2, 3, and 4 must be merged first
- PR 0: Version pinning ✅
- PR 1: Remix-Oxygen updates ✅
- PR 2: Hydrogen-React compatibility ✅  
- PR 3: Hydrogen core infrastructure ✅
- PR 4: CLI minimal updates ✅

## Changes

### Import Migration
- ✅ Replaced all `@shopify/remix-oxygen` imports with `react-router`
- ✅ Updated ~40 route files
- ✅ Updated lib files (session, redirect, etc.)
- ✅ Updated entry files

### Context System
- ✅ Migrated from `createAppLoadContext` to `createHydrogenRouterContext`
- ✅ Updated to use `HydrogenRouterContextProvider` type
- ✅ Added support for additional context with TypeScript augmentation

### Configuration
- ✅ Complete rewrite of env.d.ts for module augmentation
- ✅ Updated tsconfig.json with types array
- ✅ Migrated react-router.config.ts to use hydrogenPreset()
- ✅ Updated package.json scripts for React Router typegen

### Version Management
- ✅ Pinned all React Router packages to exact 7.8.2
- ✅ Updated React to 18.3.1
- ✅ Ensured all @shopify packages compatible

## Testing
- [x] TypeScript compilation passes
- [x] Production build succeeds
- [x] Development server runs
- [x] All routes accessible
- [x] Context properties available
- [x] GraphQL codegen works
- [x] React Router typegen works

## Validation Commands
```bash
cd templates/skeleton
npm install
npm run codegen
npm run typecheck
npm run build
npm run dev
```

## Migration Guide
For existing apps migrating from Remix:
1. Update all imports from `@shopify/remix-oxygen` to `react-router`
2. Rename `createAppLoadContext` to `createHydrogenRouterContext`
3. Update type from `AppLoadContext` to `HydrogenRouterContextProvider`
4. Simplify env.d.ts to just references
5. Use the hydrogen preset in react-router.config.ts

## Files Changed
~56 files in templates/skeleton/

## Related
- Part of #3127 breakdown strategy
- See PRS_STRATEGY.md for overall plan
- This enables the default template for new Hydrogen projects
```

## Success Criteria Checklist
- [ ] Prerequisites verified (PR 1-3 merged)
- [ ] Feature branch created from updated main
- [ ] All @shopify/remix-oxygen imports replaced
- [ ] Context system migrated to createHydrogenRouterContext
- [ ] HydrogenRouterContextProvider type used
- [ ] env.d.ts completely rewritten
- [ ] tsconfig.json includes types array
- [ ] react-router.config.ts uses preset
- [ ] All React Router versions exact 7.8.2
- [ ] Package.json scripts updated
- [ ] GraphQL codegen works
- [ ] TypeScript compilation passes
- [ ] Production build succeeds
- [ ] Dev server runs without errors
- [ ] All routes accessible
- [ ] Context properties available
- [ ] No Remix imports remain
- [ ] ~56 files modified
- [ ] Clean commit with good message
- [ ] PR created and ready

## Troubleshooting Guide

### Issue: TypeScript errors about HydrogenRouterContextProvider
**Solution:**
1. Verify @shopify/hydrogen is latest (from PR 1)
2. Check import in entry.server.tsx is correct
3. Ensure tsconfig.json has types array
4. Try: `rm -rf node_modules && npm install`

### Issue: Context properties not available
**Solution:**
1. Verify createHydrogenRouterContext is called correctly
2. Check additional context parameter is passed
3. Ensure global augmentation in context.ts
4. Verify hydrogen package exports context keys

### Issue: Build fails with preset not found
**Solution:**
1. Check @shopify/hydrogen version has preset
2. Import path should be '@shopify/hydrogen/react-router-preset'
3. Ensure PR 1 changes are included
4. Rebuild hydrogen package if in monorepo

### Issue: Dev server won't start
**Solution:**
1. Check all React Router versions match (7.8.2)
2. Verify no ~ or ^ in versions
3. Clear node_modules and reinstall
4. Check for port conflicts

### Issue: Routes not found
**Solution:**
1. Ensure react-router.config.ts is correct
2. Check file naming in routes directory
3. Verify routes.ts if using route config
4. Run `npx react-router routes` to debug

### Issue: GraphQL types missing
**Solution:**
1. Run `npm run codegen`
2. Check .graphqlrc.ts configuration
3. Ensure @shopify/hydrogen-codegen installed
4. May need to run twice initially

## Notes for Implementer
- This is the most critical PR after packages
- Take time to verify each step
- Test thoroughly - this is the default template
- If unsure about a change, check the original commits
- The simpler env.d.ts is correct - don't overthink it
- Context migration is crucial - test it works
- Version pinning is essential - no ranges!
- Document any deviations from plan