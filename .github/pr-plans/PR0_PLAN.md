# PR 0: Version Pinning Across Monorepo - Detailed Execution Plan

## Overview
This PR pins all React Router and related dependencies to exact version 7.8.2 across the entire monorepo. This is the FOUNDATION PR that must be merged first to ensure version consistency before any other changes.

## Pre-requisites
- Working from branch: `hydrogen-react-router-7.8.2-clean`
- Target branch: `main`
- Required tools: git, npm, node
- NO other PRs required - this goes FIRST
- Clean working directory

## Phase 1: Setup and Branch Preparation

### Task 1.1: Create Feature Branch
**WHAT:** Create a clean feature branch for version pinning  
**WHY:** This is the foundation for all other React Router changes  
**STEPS:**
1. Ensure you're on main branch: `git checkout main`
2. Pull latest changes: `git pull origin main`
3. Create feature branch: `git checkout -b feat/pin-react-router-7.8.2`
4. Verify clean state: `git status` (should show no changes)
5. Note current commit: `git log -1 --oneline` (record for reference)
6. Document: `echo "Starting PR 0: Version Pinning" > pr0-status.txt`

### Task 1.2: Identify All Packages
**WHAT:** List all packages that need version updates  
**WHY:** Ensure we don't miss any package  
**STEPS:**
1. List all package directories:
   ```bash
   find packages -name package.json -not -path "*/node_modules/*" | sort
   ```
2. List all template directories:
   ```bash
   find templates -name package.json -not -path "*/node_modules/*" | sort
   ```
3. Document package count:
   ```bash
   echo "Total packages to check: $(find . -name package.json -not -path "*/node_modules/*" | wc -l)" >> pr0-status.txt
   ```
4. Should find approximately 10-15 package.json files
5. Record list for verification

## Phase 2: Apply Version Pinning Commit

### Task 2.1: Cherry-Pick Version Pinning
**WHAT:** Apply the version pinning commit  
**WHY:** This commit contains all necessary version updates  
**STEPS:**
1. Cherry-pick the version pinning commit:
   ```bash
   git cherry-pick 411bb363f54cafc2823999e92e94ace96985653b
   ```
2. If conflicts occur:
   - This is unexpected - version pinning should apply cleanly
   - Review conflicts: `git status`
   - If minor, resolve and continue
   - If major, abort: `git cherry-pick --abort` and investigate
3. Verify successful cherry-pick:
   ```bash
   git log --oneline -1
   ```
4. Should show: "Pin React Router versions to exact 7.8.2"
5. Document: `echo "Cherry-pick: SUCCESS" >> pr0-status.txt`

### Task 2.2: Verify Changed Files
**WHAT:** Check which files were modified  
**WHY:** Ensure only package.json files changed  
**STEPS:**
1. List changed files:
   ```bash
   git diff --name-only main
   ```
2. All changes should be package.json files
3. Count changed files:
   ```bash
   git diff --name-only main | wc -l
   ```
4. Should be 10-15 files approximately
5. If any non-package.json files changed, investigate why

## Phase 3: Validate Version Consistency

### Task 3.1: Check React Router Versions
**WHAT:** Verify all React Router references are exact 7.8.2  
**WHY:** Must have exact version for compatibility  
**STEPS:**
1. Search for React Router versions:
   ```bash
   grep -r '"react-router"' --include="package.json" packages/ templates/ | grep -v node_modules
   ```
2. All should show exactly `"7.8.2"` - no `~` or `^`
3. Check @react-router packages:
   ```bash
   grep -r '"@react-router' --include="package.json" packages/ templates/ | grep -v node_modules
   ```
4. Should also be exact versions if present
5. Document any inconsistencies found

### Task 3.2: Check Related Dependencies
**WHAT:** Verify other pinned dependencies  
**WHY:** Some packages might need consistent versions  
**STEPS:**
1. Check for Remix dependencies (should be removed or updated):
   ```bash
   grep -r '"@remix-run' --include="package.json" packages/ templates/ | grep -v node_modules
   ```
2. Check for Shopify CLI versions:
   ```bash
   grep -r '"@shopify/cli"' --include="package.json" packages/ templates/ | grep -v node_modules
   ```
3. Should use consistent version (likely ~3.80.4)
4. Document versions for PR description

### Task 3.3: Verify No Version Ranges
**WHAT:** Ensure no ~ or ^ prefixes remain  
**WHY:** Exact versions prevent version mismatch issues  
**STEPS:**
1. Search for version ranges on React Router:
   ```bash
   grep -r '[~^].*react-router' --include="package.json" packages/ templates/ | grep -v node_modules
   ```
2. Should return nothing (no results)
3. If any found, manually edit to remove prefix
4. Document: `echo "Version ranges removed: YES" >> pr0-status.txt`

## Phase 4: Build Validation

### Task 4.1: Install Dependencies
**WHAT:** Install all monorepo dependencies  
**WHY:** Ensure versions resolve correctly  
**STEPS:**
1. Clean install from root:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Should complete without errors
3. If peer dependency warnings:
   - Note them but they're likely expected
   - Will be fixed in subsequent PRs
4. Check React Router is installed:
   ```bash
   npm ls react-router | head -20
   ```
5. Should show 7.8.2 for all packages

### Task 4.2: Run Basic Build
**WHAT:** Attempt to build core packages  
**WHY:** Verify version compatibility  
**STEPS:**
1. Build hydrogen package:
   ```bash
   cd packages/hydrogen
   npm run build 2>&1 | tee build.log
   ```
2. May fail - that's OK (code changes needed in later PRs)
3. What matters: dependency resolution works
4. Return to root: `cd ../..`
5. Document build status (OK if fails for now)

### Task 4.3: Check for Version Conflicts
**WHAT:** Verify no version conflicts exist  
**WHY:** Prevent runtime issues  
**STEPS:**
1. Check for duplicate React Router versions:
   ```bash
   npm ls react-router 2>&1 | grep -c "7.8.2" 
   ```
2. Should show consistent count (all same version)
3. Look for any non-7.8.2 versions:
   ```bash
   npm ls react-router 2>&1 | grep -v "7.8.2" | grep -v "├\|└\|│" | grep "@"
   ```
4. Should return nothing
5. Document: `echo "Version conflicts: NONE" >> pr0-status.txt`

## Phase 5: Package-Specific Verification

### Task 5.1: Verify Hydrogen Package
**WHAT:** Check main hydrogen package versions  
**WHY:** Core package must be correct  
**STEPS:**
1. Check hydrogen package.json:
   ```bash
   cat packages/hydrogen/package.json | grep -A5 -B5 "react-router"
   ```
2. Should show `"react-router": "7.8.2"` in dependencies
3. No version ranges
4. Document exact version

### Task 5.2: Verify Skeleton Template
**WHAT:** Check skeleton template versions  
**WHY:** New projects must get correct versions  
**STEPS:**
1. Check skeleton package.json:
   ```bash
   cat templates/skeleton/package.json | grep -A5 -B5 "react-router"
   ```
2. Should show `"react-router": "7.8.2"`
3. Also check @shopify packages are consistent
4. Document versions

### Task 5.3: Verify CLI Package
**WHAT:** Check CLI hydrogen versions  
**WHY:** CLI must expect correct versions  
**STEPS:**
1. Check cli package.json:
   ```bash
   cat packages/cli/package.json | grep -A5 -B5 "react-router"
   ```
2. Dependencies and devDependencies should use 7.8.2
3. Document versions found

## Phase 6: Documentation Review

### Task 6.1: Check for Version Documentation
**WHAT:** See if any docs reference versions  
**WHY:** Docs should match code  
**STEPS:**
1. Search for version references:
   ```bash
   grep -r "7\.[0-9]\.[0-9]" docs/ --include="*.md" | head -10
   ```
2. If any React Router version mentions found, note them
3. Don't update docs in this PR (just version pinning)
4. Document findings for later PRs

### Task 6.2: Review Changeset Requirement
**WHAT:** Determine if changeset needed  
**WHY:** This changes package dependencies  
**STEPS:**
1. Since this modifies package.json files, changeset likely needed
2. But since it's a development dependency update, might not need
3. Check if commit includes changeset:
   ```bash
   ls -la .changeset/
   ```
4. If changeset exists from cherry-pick, good
5. If not, we'll add one before pushing

## Phase 7: Final Validation

### Task 7.1: Verify Minimal Changes
**WHAT:** Ensure ONLY version changes were made  
**WHY:** This PR should be purely version updates  
**STEPS:**
1. Review full diff:
   ```bash
   git diff main --stat
   ```
2. Should only show package.json files
3. Check line count:
   ```bash
   git diff main | grep -c "^[+-]"
   ```
4. Should be relatively small (few hundred lines max)
5. No source code changes

### Task 7.2: Check Each Changed File
**WHAT:** Verify each change is correct  
**WHY:** Catch any mistakes  
**STEPS:**
1. For each changed file:
   ```bash
   git diff main -- [filename]
   ```
2. Should only show version changes
3. All React Router: `7.8.2` (exact)
4. No unrelated changes
5. Document verification complete

### Task 7.3: Test One Package Build
**WHAT:** Try building one simple package  
**WHY:** Basic smoke test  
**STEPS:**
1. Try mini-oxygen (simpler package):
   ```bash
   cd packages/mini-oxygen
   npm install
   npm run build 2>&1
   cd ../..
   ```
2. May or may not succeed (OK either way)
3. What matters: dependencies install correctly
4. Document result

## Phase 8: Commit and Push

### Task 8.1: Review and Finalize Commit
**WHAT:** Ensure commit message is clear  
**WHY:** Good history documentation  
**STEPS:**
1. Check commit message:
   ```bash
   git log --oneline -1
   ```
2. Should already have good message from cherry-pick
3. If need to amend:
   ```bash
   git commit --amend -m "fix: pin React Router to exact version 7.8.2 across monorepo

   Pin all React Router dependencies to exact version 7.8.2 to ensure
   consistency across all packages and templates. This is the foundation
   for the React Router 7.8.x migration.
   
   - Remove all version ranges (~, ^) for React Router
   - Update all packages to use exact 7.8.2
   - Ensure templates use consistent versions
   
   This is step 0 of the React Router migration strategy."
   ```

### Task 8.2: Create Changeset (If Needed)
**WHAT:** Add changeset for version updates  
**WHY:** Required for dependency changes  
**STEPS:**
1. Check if changeset exists:
   ```bash
   ls .changeset/*.md | grep -v README
   ```
2. If no changeset, create one:
   ```bash
   npm run changeset add
   ```
3. Select:
   - All packages that had version changes
   - Type: patch (dependency update)
   - Message: "Pin React Router to exact version 7.8.2"
4. Commit changeset:
   ```bash
   git add .changeset/
   git commit -m "Add changeset for version pinning"
   ```

### Task 8.3: Push Branch
**WHAT:** Push to GitHub  
**WHY:** Create PR  
**STEPS:**
1. Push branch:
   ```bash
   git push origin feat/pin-react-router-7.8.2
   ```
2. Note the URL provided
3. Document: `echo "Branch pushed: SUCCESS" >> pr0-status.txt`

## Phase 9: Pull Request Creation

### Task 9.1: Create GitHub PR
**WHAT:** Open pull request  
**WHY:** Start review process  
**STEPS:**
1. Go to GitHub repository
2. Click "Compare & pull request"
3. Base: `main`
4. Compare: `feat/pin-react-router-7.8.2`
5. Title: "fix: pin React Router to exact version 7.8.2 across monorepo"

### Task 9.2: PR Description Template
**WHAT:** Provide clear context  
**WHY:** Help reviewers understand  
**STEPS:**
Copy and use:
```markdown
## Summary
Pin all React Router dependencies to exact version 7.8.2 across the entire monorepo. This is PR 0 of 9 in the React Router 7.8.x migration strategy and MUST be merged first.

## Changes
- ✅ Pin React Router to exact `7.8.2` (remove ~, ^ prefixes)
- ✅ Update all packages consistently
- ✅ Update all templates consistently
- ✅ Ensure no version ranges remain

## Why This Must Be First
Version consistency is critical for the React Router migration. Having exact versions:
- Prevents version mismatch errors during development
- Ensures all packages use the same React Router version
- Provides a stable foundation for subsequent code changes
- Eliminates peer dependency warnings between packages

## Scope
This PR ONLY updates version numbers in package.json files. No source code changes are included.

## Testing
- [x] All packages use exact version 7.8.2
- [x] No version ranges (~, ^) remain
- [x] Dependencies install without conflicts
- [x] Version consistency verified across monorepo

## Files Changed
- packages/hydrogen/package.json
- packages/hydrogen-react/package.json  
- packages/cli/package.json
- packages/remix-oxygen/package.json
- packages/mini-oxygen/package.json
- packages/create-hydrogen/package.json
- templates/skeleton/package.json
- (Approximately 10-15 package.json files total)

## Impact
No functional changes. This only ensures version consistency. Some packages may not build until subsequent PRs add necessary code changes.

## Next Steps
After this PR is merged, the following PRs can proceed:
1. PR 1: Remix-Oxygen compatibility
2. PR 2: Hydrogen-React updates
3. PR 3: Hydrogen core infrastructure
4. PR 4: CLI minimal changes
5. PR 5: Skeleton template migration

## Migration Strategy
- Part of #3127 breakdown strategy
- See PRS_STRATEGY.md for overall plan
- This is the critical foundation PR

## Related
- Implements version pinning from commit 411bb363f
- Prepares for React Router 7.8.x migration
- Ensures monorepo version consistency
```

## Success Criteria Checklist
- [ ] Feature branch created from main
- [ ] Commit 411bb363f cherry-picked successfully
- [ ] All React Router versions are exactly 7.8.2
- [ ] No version ranges (~, ^) remain
- [ ] Only package.json files modified
- [ ] No source code changes
- [ ] Dependencies install without conflicts
- [ ] PR created and ready for review
- [ ] Changeset added (if needed)

## Troubleshooting Guide

### Issue: Cherry-pick has conflicts
**Solution:**
1. Check what's conflicting: `git status`
2. If package.json conflicts, manually edit to use 7.8.2
3. Resolve and continue: `git cherry-pick --continue`
4. If too complex, abort and apply changes manually

### Issue: Dependencies won't install
**Solution:**
1. Clear all caches: `npm cache clean --force`
2. Remove all node_modules: `find . -name node_modules -type d -prune -exec rm -rf {} +`
3. Remove package-lock.json
4. Try install again: `npm install`

### Issue: Version mismatch warnings
**Solution:**
1. Run `npm ls react-router` to see all versions
2. Ensure all show 7.8.2
3. If any don't, check that package's package.json
4. Fix and reinstall

### Issue: Unexpected file changes
**Solution:**
1. If non-package.json files changed, review why
2. Might be auto-formatting or git settings
3. Reset unwanted changes: `git checkout main -- <file>`
4. Keep only package.json changes

### Issue: Build errors after version update
**Solution:**
1. This is EXPECTED - code changes come in later PRs
2. Version pinning PR only ensures dependency consistency
3. Don't try to fix build errors in this PR
4. Document which packages fail for next PRs

## Notes for Implementer
- Keep this PR absolutely minimal
- ONLY version changes in package.json files
- Don't fix any code issues (those come later)
- Don't update documentation
- Don't add new dependencies
- This is purely version pinning
- If a package doesn't use React Router, it won't be changed
- Goal is version consistency as foundation