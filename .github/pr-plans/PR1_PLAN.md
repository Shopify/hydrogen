# PR 1: Remix-Oxygen Package Updates - Detailed Execution Plan

## Overview
This PR updates the @shopify/remix-oxygen package to be compatible with React Router 7.8.x. This is a small but important change that updates peer dependencies and ensures compatibility with the new React Router version.

## Pre-requisites
- Working from branch: `hydrogen-react-router-7.8.2-clean`
- Target branch: `main`
- Required tools: git, npm, node
- PR 1 recommended (but not strictly required)
- Clean working directory

## Phase 1: Setup and Branch Preparation

### Task 1.1: Create Feature Branch
**WHAT:** Create a clean feature branch for PR 5 changes  
**WHY:** Isolate remix-oxygen changes for independent review  
**STEPS:**
1. Ensure you're on main branch: `git checkout main`
2. Pull latest changes: `git pull origin main`
3. Create feature branch: `git checkout -b feat/remix-oxygen-rr-7.8`
4. Verify clean state: `git status` (should show no changes)
5. Note current commit: `git log -1 --oneline` (record for reference)
6. Document: `echo "Starting PR 1: Remix-Oxygen" > pr1-status.txt`

### Task 1.2: Initial Package Verification
**WHAT:** Verify remix-oxygen package current state  
**WHY:** Understand baseline before changes  
**STEPS:**
1. Navigate to package: `cd packages/remix-oxygen`
2. Check package structure:
   ```bash
   ls -la
   ```
3. Should see:
   - package.json
   - src/ directory
   - tsconfig.json
   - README.md
   - Other standard files
4. Install dependencies: `npm install`
5. Try initial build: `npm run build 2>&1 | tee baseline-build.log`
6. Document any existing issues

### Task 1.3: Examine Current Dependencies
**WHAT:** Check current React Router references  
**WHY:** Understand what needs to be updated  
**STEPS:**
1. Check package.json for React Router:
   ```bash
   cat package.json | grep -i "react-router"
   ```
2. Check peer dependencies:
   ```bash
   cat package.json | jq '.peerDependencies'
   ```
3. Check regular dependencies:
   ```bash
   cat package.json | jq '.dependencies'
   ```
4. Document current versions in pr1-status.txt
5. Note if using ranges (~, ^) or exact versions

## Phase 2: Cherry-Pick Version Updates

### Task 2.1: Apply Version Pinning (Partial)
**WHAT:** Cherry-pick only remix-oxygen changes from version pinning commit  
**WHY:** Need exact React Router 7.8.2 versions  
**STEPS:**
1. Cherry-pick without committing:
   ```bash
   git cherry-pick -n 411bb363f54cafc2823999e92e94ace96985653b
   ```
2. Reset all changes:
   ```bash
   git reset HEAD
   ```
3. Add only remix-oxygen changes:
   ```bash
   git add packages/remix-oxygen/
   ```
4. Check what's staged:
   ```bash
   git diff --cached --stat
   ```
5. Should only show remix-oxygen files (likely just package.json)
6. Commit:
   ```bash
   git commit -m "fix(remix-oxygen): pin React Router to exact 7.8.2 version"
   ```

### Task 2.2: Verify Package.json Changes
**WHAT:** Ensure React Router versions are correct  
**WHY:** Must match exact version for compatibility  
**STEPS:**
1. Open package.json in editor
2. Check peerDependencies section:
   ```json
   "peerDependencies": {
     "react-router": "7.8.2"
   }
   ```
3. Should be exactly "7.8.2" - no ~ or ^
4. If dependencies has React Router, same rule applies
5. If not exactly 7.8.2, manually edit to fix
6. Save file if edited

## Phase 3: Source Code Compatibility Check

### Task 3.1: Check for Import Updates
**WHAT:** Verify if source code needs React Router import changes  
**WHY:** Some code might reference old Remix exports  
**STEPS:**
1. Check source files:
   ```bash
   ls -la src/
   ```
2. Search for any Remix-specific imports:
   ```bash
   grep -r "from '@remix-run" src/ || echo "No Remix imports found"
   ```
3. Search for React Router imports:
   ```bash
   grep -r "from 'react-router'" src/ || echo "No direct React Router imports"
   ```
4. If any imports found, document them
5. Most likely, this package just re-exports or wraps

### Task 3.2: Check createRequestHandler
**WHAT:** Verify the main export still works  
**WHY:** This is the key function apps use from this package  
**STEPS:**
1. Open main source file:
   ```bash
   cat src/index.ts
   ```
2. Look for createRequestHandler export
3. Check if it imports from React Router or another package
4. If it wraps React Router's version:
   - Ensure import path is correct
   - May need to update from '@remix-run/server-runtime' to 'react-router'
5. Document any necessary changes

### Task 3.3: Check Type Exports
**WHAT:** Verify TypeScript types are properly exported  
**WHY:** Consumers depend on these types  
**STEPS:**
1. Check for type exports:
   ```bash
   grep -r "export type" src/ | head -10
   ```
2. Check if any reference AppLoadContext:
   ```bash
   grep -r "AppLoadContext" src/
   ```
3. Note: AppLoadContext might be kept for backward compatibility
4. If found, ensure it's properly typed
5. Document type exports in pr1-status.txt

## Phase 4: Build and Test Validation

### Task 4.1: Clean Build
**WHAT:** Perform clean build with updated dependencies  
**WHY:** Ensure package compiles correctly  
**STEPS:**
1. Clean previous build:
   ```bash
   rm -rf dist/
   rm -rf node_modules/.cache
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run build:
   ```bash
   npm run build
   ```
4. Expected: Build completes without errors
5. If errors:
   - Note the specific error
   - Usually import path issues
   - Fix and retry
6. Document: `echo "Build: SUCCESS" >> pr1-status.txt`

### Task 4.2: Verify Build Output
**WHAT:** Check that build produces expected files  
**WHY:** Ensure package exports are intact  
**STEPS:**
1. Check dist structure:
   ```bash
   ls -la dist/
   ```
2. Should have:
   - index.js (main export)
   - index.d.ts (TypeScript types)
   - Possibly other files
3. Check main export:
   ```bash
   grep -l "createRequestHandler" dist/index.js
   ```
4. Should find it
5. Check file sizes are reasonable (not empty)

### Task 4.3: Run Type Checking
**WHAT:** Ensure TypeScript compilation works  
**WHY:** Type safety for consumers  
**STEPS:**
1. Run typecheck:
   ```bash
   npm run typecheck
   ```
2. Should complete without errors
3. If errors:
   - Check for React Router type issues
   - May need to update type imports
   - Fix and retry
4. Document results

### Task 4.4: Run Tests (If Available)
**WHAT:** Execute any existing tests  
**WHY:** Ensure no regressions  
**STEPS:**
1. Check for test script:
   ```bash
   cat package.json | grep '"test"'
   ```
2. If test script exists:
   ```bash
   npm run test
   ```
3. All tests should pass
4. If no tests, note in pr1-status.txt
5. Document test results

## Phase 5: Integration Testing

### Task 5.1: Test Package Exports
**WHAT:** Verify the package exports work correctly  
**WHY:** Consumers need to import from this package  
**STEPS:**
1. Create test file: `test-exports.mjs`
2. Add content:
   ```javascript
   import { createRequestHandler } from './dist/index.js';
   
   console.log('createRequestHandler type:', typeof createRequestHandler);
   
   if (typeof createRequestHandler === 'function') {
     console.log('✓ Export test passed');
   } else {
     console.error('✗ Export test failed');
     process.exit(1);
   }
   ```
3. Run test: `node test-exports.mjs`
4. Should output success
5. Clean up: `rm test-exports.mjs`

### Task 5.2: Test TypeScript Types
**WHAT:** Verify TypeScript types are accessible  
**WHY:** Type safety for TypeScript users  
**STEPS:**
1. Create test file: `test-types.ts`
2. Add content:
   ```typescript
   import { createRequestHandler } from './dist/index';
   import type { RequestHandler } from './dist/index';
   
   // Test that types are accessible
   const handler: typeof createRequestHandler = {} as any;
   
   console.log('Type exports test passed');
   ```
3. Compile: `npx tsc test-types.ts --noEmit --skipLibCheck`
4. Should complete without errors
5. Clean up: `rm test-types.ts`

### Task 5.3: Verify Peer Dependency Compatibility
**WHAT:** Check that peer deps are satisfied  
**WHY:** Prevent runtime errors for consumers  
**STEPS:**
1. Create test package.json:
   ```bash
   cat > test-package.json << 'EOF'
   {
     "name": "test-remix-oxygen",
     "dependencies": {
       "react-router": "7.8.2",
       "@shopify/remix-oxygen": "file:."
     }
   }
   EOF
   ```
2. Check with npm:
   ```bash
   npm ls --json --package-lock-only --package=./test-package.json 2>&1 | grep -i "peer"
   ```
3. Should not show peer dependency warnings
4. Clean up: `rm test-package.json`

## Phase 6: Documentation Updates

### Task 6.1: Update README (If Needed)
**WHAT:** Check if README needs updates  
**WHY:** Documentation should reflect React Router 7.8.x  
**STEPS:**
1. Open README.md
2. Search for version references:
   ```bash
   grep -i "remix\|react-router" README.md
   ```
3. If mentions specific versions, update to 7.8.2
4. If mentions Remix, consider updating to React Router
5. Save if changed
6. If no changes needed, note in pr1-status.txt

### Task 6.2: Check Changelog
**WHAT:** Note changes for changelog  
**WHY:** Users need to know what changed  
**STEPS:**
1. If CHANGELOG.md exists:
   ```bash
   ls CHANGELOG.md
   ```
2. Don't update it (will be done by release process)
3. But note what should be added:
   ```
   - Updated React Router peer dependency to 7.8.2
   - Ensured compatibility with React Router 7.8.x
   ```
4. Document this in pr1-status.txt for PR description

## Phase 7: Final Validation

### Task 7.1: Lint Check
**WHAT:** Run linting if available  
**WHY:** Code quality standards  
**STEPS:**
1. Check for lint script:
   ```bash
   cat package.json | grep '"lint"'
   ```
2. If exists, run: `npm run lint`
3. If issues:
   - Try auto-fix: `npm run lint -- --fix`
   - Fix remaining manually
4. If no lint script, skip
5. Document results

### Task 7.2: Verify Minimal Changes
**WHAT:** Ensure we only changed what's necessary  
**WHY:** This should be a minimal PR  
**STEPS:**
1. Check changed files:
   ```bash
   git diff --stat main
   ```
2. Should only be 1-2 files (mainly package.json)
3. If more files:
   ```bash
   git diff --name-only main
   ```
4. Review each - should all be necessary
5. Document file count in pr1-status.txt

### Task 7.3: Final Build Test
**WHAT:** One more build to ensure everything works  
**WHY:** Final confirmation before PR  
**STEPS:**
1. Clean and rebuild:
   ```bash
   rm -rf dist/
   npm run build
   npm run typecheck
   ```
2. All should pass
3. Final status: `echo "Final validation: COMPLETE" >> pr1-status.txt`

## Phase 8: Commit and Push

### Task 8.1: Review All Changes
**WHAT:** Final review before committing  
**WHY:** Ensure quality and minimalism  
**STEPS:**
1. Review changes:
   ```bash
   git diff main
   ```
2. Should primarily be package.json changes
3. Possibly minor source updates
4. No unnecessary changes
5. Check no debug code added

### Task 8.2: Create Final Commit (If Needed)
**WHAT:** Squash if multiple commits  
**WHY:** Clean history  
**STEPS:**
1. Check commit count:
   ```bash
   git log --oneline main..HEAD
   ```
2. If more than one commit:
   ```bash
   git rebase -i main
   # Squash all but first
   ```
3. Final commit message:
   ```
   fix(remix-oxygen): update React Router compatibility to 7.8.2
   
   - Pin React Router peer dependency to exact 7.8.2
   - Ensure compatibility with React Router 7.8.x
   - Remove version ranges for consistency
   
   This ensures remix-oxygen works correctly with the new
   React Router version used across Hydrogen.
   
   Part of React Router 7.8.x migration (PR 1 of 9)
   ```

### Task 8.3: Push Branch
**WHAT:** Push to GitHub  
**WHY:** Required for PR creation  
**STEPS:**
1. Push: `git push origin feat/remix-oxygen-rr-7.8`
2. Note URL provided
3. Verify push succeeded

## Phase 9: Pull Request Creation

### Task 9.1: Create GitHub PR
**WHAT:** Open pull request  
**WHY:** Begin review process  
**STEPS:**
1. Go to GitHub repository
2. Click "Compare & pull request"
3. Base: `main`
4. Compare: `feat/remix-oxygen-rr-7.8`
5. Title: "fix(remix-oxygen): update React Router compatibility to 7.8.2"

### Task 9.2: PR Description Template
**WHAT:** Provide context for reviewers  
**WHY:** Clear communication  
**STEPS:**
Copy and use:
```markdown
## Summary
Update @shopify/remix-oxygen package for React Router 7.8.x compatibility. This is PR 1 of 9 in the migration strategy.

## Changes
- ✅ Pin React Router peer dependency to exact 7.8.2
- ✅ Remove version ranges (~, ^) for consistency
- ✅ Ensure package builds with new version

## Scope
This is a minimal change focused on dependency compatibility. No functional changes to the package behavior.

## Testing
- [x] Package builds successfully
- [x] TypeScript compilation passes
- [x] Exports remain accessible
- [x] No peer dependency warnings

## Dependencies
- Requires PR 0 (Version pinning) to be merged first
- Can be merged before or after PR 2 (Hydrogen-React)

## Files Changed
- packages/remix-oxygen/package.json
- (possibly 1-2 other minor files)

## Impact
Low risk - only updates version compatibility. No breaking changes for consumers already using React Router 7.x.

## Migration Guide
No changes required for consumers. This is a compatibility update only.

## Related
- Part of #3127 breakdown strategy
- See PRS_STRATEGY.md for overall plan

## Next Steps
After this PR:
- Can proceed with remaining package updates
- PR 2-6 can follow
```

## Success Criteria Checklist
- [ ] Feature branch created from main
- [ ] Package.json updated with exact 7.8.2
- [ ] No version ranges (~/^) remain
- [ ] Package builds successfully
- [ ] TypeScript compilation passes
- [ ] Exports work correctly
- [ ] Tests pass (if any exist)
- [ ] Minimal changes (1-2 files)
- [ ] Only remix-oxygen package modified
- [ ] Clean commit history
- [ ] PR created and ready

## Troubleshooting Guide

### Issue: Build fails with import errors
**Solution:**
1. Check if source imports need updating
2. Update from '@remix-run/...' to 'react-router' if needed
3. Ensure all imports resolve correctly
4. Clear node_modules and reinstall

### Issue: Peer dependency warnings
**Solution:**
1. Ensure React Router is exactly "7.8.2"
2. Remove any ~ or ^ prefixes
3. Check both dependencies and peerDependencies
4. Use npm ls to verify resolution

### Issue: TypeScript errors
**Solution:**
1. Check if types are properly exported
2. May need to update type imports
3. Ensure tsconfig.json is correct
4. Try skipLibCheck if needed temporarily

### Issue: createRequestHandler not found
**Solution:**
1. Verify it's exported from index.ts
2. Check the build output has it
3. Ensure no typos in export
4. Check dist/index.js directly

### Issue: Package seems unchanged
**Solution:**
1. This is actually good - minimal changes
2. Main change is package.json versions
3. That's all that's needed
4. Don't add unnecessary changes

## Notes for Implementer
- Keep this PR very minimal
- Main goal is version compatibility
- Don't refactor or improve code
- Focus only on React Router 7.8.2 compatibility
- If package already works, just update versions
- Test that exports still work
- Document if no changes needed beyond package.json
- This is a low-risk, simple PR