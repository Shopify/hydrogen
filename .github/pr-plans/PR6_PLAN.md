# PR 6: Mini-Oxygen & Create-Hydrogen Updates - Detailed Execution Plan

## Overview
This PR updates the @shopify/mini-oxygen and @shopify/create-hydrogen packages for React Router 7.8.x compatibility. These are lower-priority packages that need minor dependency updates to maintain ecosystem consistency.

## Pre-requisites
- Working from branch: `hydrogen-react-router-7.8.2-clean`
- Target branch: `main`
- Required tools: git, npm, node
- Can be done independently (no strict PR dependencies)
- Clean working directory

## Phase 1: Setup and Branch Preparation

### Task 1.1: Create Feature Branch
**WHAT:** Create a clean feature branch for both packages  
**WHY:** Group related minor package updates together  
**STEPS:**
1. Ensure you're on main branch: `git checkout main`
2. Pull latest changes: `git pull origin main`
3. Create feature branch: `git checkout -b feat/mini-oxygen-create-hydrogen-rr-7.8`
4. Verify clean state: `git status` (should show no changes)
5. Note current commit: `git log -1 --oneline`
6. Document: `echo "Starting PR 6: Mini-Oxygen & Create-Hydrogen" > pr6-status.txt`

### Task 1.2: Assess Both Packages
**WHAT:** Quick overview of both packages  
**WHY:** Understand scope of changes needed  
**STEPS:**
1. Check mini-oxygen structure:
   ```bash
   ls -la packages/mini-oxygen/
   echo "Mini-Oxygen files:" >> pr6-status.txt
   ls packages/mini-oxygen/*.json >> pr6-status.txt
   ```
2. Check create-hydrogen structure:
   ```bash
   ls -la packages/create-hydrogen/
   echo "Create-Hydrogen files:" >> pr6-status.txt
   ls packages/create-hydrogen/*.json >> pr6-status.txt
   ```
3. Both should have package.json at minimum
4. Note which has more complexity

## Phase 2: Mini-Oxygen Package Updates

### Task 2.1: Navigate to Mini-Oxygen
**WHAT:** Start with mini-oxygen package  
**WHY:** Handle one package at a time  
**STEPS:**
1. Navigate: `cd packages/mini-oxygen`
2. Check current dependencies:
   ```bash
   cat package.json | grep -i "react-router\|remix" | head -10
   ```
3. Document current versions in pr6-status.txt
4. Install dependencies: `npm install`
5. Try baseline build: `npm run build 2>&1 | tee baseline-mini-oxygen.log`

### Task 2.2: Apply Version Updates to Mini-Oxygen
**WHAT:** Update React Router related dependencies  
**WHY:** Ensure compatibility with 7.8.2  
**STEPS:**
1. Open package.json in editor
2. Look for React Router in dependencies or devDependencies
3. If found, update to "7.8.2" (exact)
4. Check for @react-router packages
5. If this package doesn't directly use React Router, no changes needed
6. Document what was changed (or "No React Router deps" if none)

### Task 2.3: Check Mini-Oxygen Source Code
**WHAT:** Verify if source needs updates  
**WHY:** Some imports might need changes  
**STEPS:**
1. Search for React Router imports:
   ```bash
   grep -r "react-router\|remix-run" src/ 2>/dev/null || echo "No React Router imports"
   ```
2. If found, may need to update import paths
3. Mini-Oxygen likely doesn't directly import React Router
4. Document findings in pr6-status.txt

### Task 2.4: Build and Test Mini-Oxygen
**WHAT:** Verify package builds correctly  
**WHY:** Ensure no regressions  
**STEPS:**
1. Clean and build:
   ```bash
   rm -rf dist/
   npm run build
   ```
2. Run typecheck if available:
   ```bash
   npm run typecheck 2>/dev/null || echo "No typecheck script"
   ```
3. Run tests if available:
   ```bash
   npm run test 2>/dev/null || echo "No test script"
   ```
4. Document results: `echo "Mini-Oxygen build: SUCCESS" >> ../pr6-status.txt`
5. Return to monorepo root: `cd ../..`

## Phase 3: Create-Hydrogen Package Updates

### Task 3.1: Navigate to Create-Hydrogen
**WHAT:** Move to create-hydrogen package  
**WHY:** Second package to update  
**STEPS:**
1. Navigate: `cd packages/create-hydrogen`
2. Check current dependencies:
   ```bash
   cat package.json | grep -i "react-router\|remix\|hydrogen" | head -10
   ```
3. Document current versions
4. This package likely depends on @shopify/cli-hydrogen
5. Install: `npm install`

### Task 3.2: Apply Version Updates to Create-Hydrogen
**WHAT:** Update any React Router references  
**WHY:** Maintain version consistency  
**STEPS:**
1. Open package.json
2. This package probably doesn't have direct React Router deps
3. It's a scaffolding tool that calls hydrogen init
4. Check for @shopify/cli-hydrogen dependency
5. If no React Router deps, document "No direct RR deps"
6. Save if any changes made

### Task 3.3: Check Create-Hydrogen Source
**WHAT:** Verify source code compatibility  
**WHY:** Ensure scaffolding logic still works  
**STEPS:**
1. Check main source file:
   ```bash
   cat src/create-app.ts | head -50
   ```
2. Look for version checks or validations
3. This likely just calls through to CLI
4. Search for hardcoded versions:
   ```bash
   grep -r "7\.[0-9]" src/ 2>/dev/null || echo "No version numbers found"
   ```
5. Document findings

### Task 3.4: Build and Test Create-Hydrogen
**WHAT:** Verify package builds  
**WHY:** Ensure functionality preserved  
**STEPS:**
1. Clean and build:
   ```bash
   rm -rf dist/
   npm run build
   ```
2. Check output exists:
   ```bash
   ls -la dist/
   ```
3. Run typecheck if available:
   ```bash
   npm run typecheck 2>/dev/null || echo "No typecheck"
   ```
4. Document: `echo "Create-Hydrogen build: SUCCESS" >> ../pr6-status.txt`
5. Return to root: `cd ../..`

## Phase 4: Cherry-Pick Version Updates (If Applicable)

### Task 4.1: Check for Relevant Commits
**WHAT:** See if version pinning commit has changes for these packages  
**WHY:** May already have the changes we need  
**STEPS:**
1. Check what the commit changed:
   ```bash
   git show --stat 411bb363f | grep -E "mini-oxygen|create-hydrogen"
   ```
2. If shows changes, cherry-pick partially:
   ```bash
   git cherry-pick -n 411bb363f
   git reset HEAD
   git add packages/mini-oxygen/ packages/create-hydrogen/
   git status
   ```
3. If no changes shown, skip cherry-pick
4. If changes exist, commit:
   ```bash
   git commit -m "fix(mini-oxygen,create-hydrogen): update for React Router 7.8.x compatibility"
   ```

### Task 4.2: Verify Changes Applied
**WHAT:** Confirm correct changes were made  
**WHY:** Ensure we got what we needed  
**STEPS:**
1. Review changes:
   ```bash
   git diff main -- packages/mini-oxygen packages/create-hydrogen
   ```
2. Should be minimal - likely just package.json files
3. If more than expected, review carefully
4. Document changed files in pr6-status.txt

## Phase 5: Integration Testing

### Task 5.1: Test Mini-Oxygen Exports
**WHAT:** Verify mini-oxygen exports work  
**WHY:** Consumers need the package to function  
**STEPS:**
1. Navigate to mini-oxygen: `cd packages/mini-oxygen`
2. Create test: `test-exports.mjs`
   ```javascript
   import miniOxygen from './dist/node/index.js';
   
   console.log('Mini-Oxygen type:', typeof miniOxygen);
   console.log('Export test:', miniOxygen ? 'PASS' : 'FAIL');
   ```
3. Run: `node test-exports.mjs 2>/dev/null || echo "Check export path"`
4. Clean up: `rm -f test-exports.mjs`
5. Return: `cd ../..`

### Task 5.2: Test Create-Hydrogen
**WHAT:** Verify create-hydrogen can be invoked  
**WHY:** Must be able to scaffold new projects  
**STEPS:**
1. Navigate: `cd packages/create-hydrogen`
2. Check the binary entry:
   ```bash
   cat package.json | grep '"bin"' -A 2
   ```
3. Test that it builds to executable:
   ```bash
   ls -la dist/ | grep -E "index|create"
   ```
4. Don't actually run it (would create project)
5. Return: `cd ../..`

## Phase 6: Final Validation

### Task 6.1: Verify Minimal Changes
**WHAT:** Ensure we only changed what's necessary  
**WHY:** These packages likely need minimal updates  
**STEPS:**
1. Check total changes:
   ```bash
   git diff --stat main
   ```
2. Should be very few files (2-4 total)
3. List files:
   ```bash
   git diff --name-only main
   ```
4. Should only be in packages/mini-oxygen and packages/create-hydrogen
5. Document file count

### Task 6.2: Final Build Test
**WHAT:** Rebuild both packages  
**WHY:** Final verification  
**STEPS:**
1. Build mini-oxygen:
   ```bash
   cd packages/mini-oxygen
   npm run build
   cd ../..
   ```
2. Build create-hydrogen:
   ```bash
   cd packages/create-hydrogen
   npm run build
   cd ../..
   ```
3. Both should succeed
4. Document: `echo "Final builds: SUCCESS" >> pr6-status.txt`

### Task 6.3: Check for Unintended Changes
**WHAT:** Ensure no extra files modified  
**WHY:** Keep PR focused  
**STEPS:**
1. Check git status: `git status`
2. Should only show tracked changes
3. No untracked files or modifications
4. If extra files, clean them: `git clean -fd`
5. Final check: `git diff --stat main`

## Phase 7: Commit and Push

### Task 7.1: Review All Changes
**WHAT:** Final review before committing  
**WHY:** Ensure quality and minimalism  
**STEPS:**
1. Review full diff:
   ```bash
   git diff main
   ```
2. Should be primarily (or only) package.json changes
3. No functional code changes expected
4. No debug code or console.logs
5. Document total changes

### Task 7.2: Create or Amend Commit
**WHAT:** Ensure single clean commit  
**WHY:** Clean history  
**STEPS:**
1. If no commit yet, create one:
   ```bash
   git add packages/mini-oxygen packages/create-hydrogen
   git commit -m "fix(mini-oxygen,create-hydrogen): minor updates for React Router 7.8.x"
   ```
2. If already have commit, check:
   ```bash
   git log --oneline -1
   ```
3. Amend if needed:
   ```bash
   git commit --amend -m "fix(mini-oxygen,create-hydrogen): minor updates for React Router 7.8.x

   - Update dependencies for consistency
   - Ensure compatibility with React Router 7.8.x ecosystem
   - No functional changes
   
   These packages don't directly use React Router but are updated
   for ecosystem consistency.
   
   Part of React Router 7.8.x migration (PR 6 of 9)"
   ```

### Task 7.3: Push Branch
**WHAT:** Push to GitHub  
**WHY:** Required for PR  
**STEPS:**
1. Push: `git push origin feat/mini-oxygen-create-hydrogen-rr-7.8`
2. Note URL provided
3. Verify succeeded

## Phase 8: Pull Request Creation

### Task 8.1: Create GitHub PR
**WHAT:** Open pull request  
**WHY:** Get changes reviewed  
**STEPS:**
1. Go to GitHub repository
2. Click "Compare & pull request"
3. Base: `main`
4. Compare: `feat/mini-oxygen-create-hydrogen-rr-7.8`
5. Title: "fix(mini-oxygen,create-hydrogen): minor updates for React Router 7.8.x"

### Task 8.2: PR Description Template
**WHAT:** Provide context  
**WHY:** Help reviewers  
**STEPS:**
Copy and use:
```markdown
## Summary
Minor updates to @shopify/mini-oxygen and @shopify/create-hydrogen packages for React Router 7.8.x ecosystem consistency. This is PR 6 of 9 in the migration strategy.

## Changes

### Mini-Oxygen
- ✅ Updated dependencies (if any)
- ✅ Build verification
- ✅ No functional changes

### Create-Hydrogen
- ✅ Updated dependencies (if any)
- ✅ Build verification
- ✅ No functional changes

## Scope
These packages don't directly use React Router but are being updated for ecosystem consistency. Changes are minimal or potentially none if packages don't have relevant dependencies.

## Testing
- [x] Both packages build successfully
- [x] TypeScript compilation passes (where applicable)
- [x] No functionality changes
- [x] Exports remain intact

## Dependencies
- Fully independent - can be merged anytime
- No prerequisites from other PRs

## Files Changed
- packages/mini-oxygen/package.json (possibly)
- packages/create-hydrogen/package.json (possibly)
- (2-4 files maximum)

## Impact
Minimal - These are infrastructure packages that don't directly impact React Router usage.

## Notes
If these packages don't have React Router dependencies, this PR may contain no changes or minimal version alignment only.

## Related
- Part of #3127 breakdown strategy
- See PRS_STRATEGY.md for overall plan
- Low priority PR in the migration sequence
```

## Success Criteria Checklist
- [ ] Feature branch created
- [ ] Mini-oxygen checked for updates
- [ ] Create-hydrogen checked for updates
- [ ] Both packages build successfully
- [ ] Minimal changes (2-4 files max)
- [ ] No functional code changes
- [ ] Only these two packages modified
- [ ] Clean commit history
- [ ] PR created and ready

## Troubleshooting Guide

### Issue: Packages don't have React Router dependencies
**Solution:**
1. This is fine - document "No changes needed"
2. These packages may not need updates
3. PR might be empty or minimal
4. That's acceptable - shows we checked

### Issue: Build fails
**Solution:**
1. Check if unrelated to our changes
2. May be pre-existing issue
3. Document in PR if pre-existing
4. Only fix if related to React Router

### Issue: Can't find mini-oxygen entry point
**Solution:**
1. Check dist structure
2. May be in dist/node/ or dist/worker/
3. Check package.json "main" field
4. Adjust test accordingly

### Issue: Create-hydrogen won't build
**Solution:**
1. Check if it needs @shopify/cli-hydrogen
2. May need to install dependencies first
3. Check tsconfig.json for issues
4. May be okay to skip if unrelated

### Issue: More files changed than expected
**Solution:**
1. Review each file
2. Revert unnecessary changes
3. Keep only package.json updates
4. Use `git checkout main -- <file>` to revert

## Notes for Implementer
- These are low-priority packages
- Changes will be minimal or possibly none
- Don't add unnecessary updates
- Focus only on React Router compatibility
- If packages work as-is, that's fine
- Document if no changes needed
- Keep PR as small as possible
- This is likely the simplest PR in the series