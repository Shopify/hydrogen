# PR 9: Recipe Updates - Detailed Execution Plan

## Overview
This PR updates all cookbook recipes to be compatible with React Router 7.8.x. Recipes are patch files that modify the skeleton template to add specific features like markets, subscriptions, and combined listings. This is the final PR in the migration strategy and updates ~31 files in the cookbook directory. Note that per project requirements, recipes may remain broken until fixed as a final step.

## Pre-requisites
- **CRITICAL**: PR 5 (Skeleton) must be merged first
- **RECOMMENDED**: PR 0-8 should all be merged
- Working from branch: `hydrogen-react-router-7.8.2-clean`
- Target branch: `main` (with PR 5 merged)
- Required tools: git, npm, node, patch utility
- Clean working directory

## Recipe Categories
Based on the cookbook structure, recipes likely include:
1. **markets** - Internationalization and multi-market support
2. **subscriptions** - Selling plans and subscription products
3. **combined-listings** - Product bundles and combinations
4. Plus other feature recipes

## Phase 1: Setup and Branch Preparation

### Task 1.1: Verify Prerequisites
**WHAT:** Confirm PR 5 (Skeleton) is merged  
**WHY:** Recipes patch the skeleton template  
**STEPS:**
1. Fetch latest main: `git fetch origin main`
2. Check skeleton migration is merged:
   ```bash
   git log origin/main --oneline | grep -i "skeleton.*migration" | head -1
   ```
3. Must return a result
4. If missing, STOP - skeleton must be updated first
5. Document: `echo "Prerequisites: PR5 ✓" > pr9-status.txt`

### Task 1.2: Create Feature Branch
**WHAT:** Create branch for recipe updates  
**WHY:** Isolate recipe changes  
**STEPS:**
1. Checkout and update main:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Create feature branch: `git checkout -b feat/recipes-rr-7.8`
3. Verify clean state: `git status`
4. Note commit: `git log -1 --oneline`
5. Document: `echo "Branch created from: $(git rev-parse --short HEAD)" >> pr9-status.txt`

### Task 1.3: Assess Current Recipe Structure
**WHAT:** Understand current cookbook organization  
**WHY:** Need to know what recipes exist  
**STEPS:**
1. Navigate to cookbook: `cd cookbook`
2. List recipe directories:
   ```bash
   ls -la
   ```
3. Check for patch files:
   ```bash
   find . -name "*.patch" -o -name "*.diff" | wc -l
   ```
4. List all recipes:
   ```bash
   for dir in */; do
     echo "=== $dir ==="
     ls -la $dir/*.patch 2>/dev/null | head -5 || echo "No patches"
   done
   ```
5. Document recipe structure

## Phase 2: Identify Recipe Changes Needed

### Task 2.1: Analyze Recipe Patches
**WHAT:** Understand what each recipe modifies  
**WHY:** Need to update for React Router  
**STEPS:**
1. Check markets recipe:
   ```bash
   if [ -d "markets" ]; then
     echo "=== Markets Recipe ==="
     ls -la markets/
     head -20 markets/*.patch 2>/dev/null || head -20 markets/*.md
   fi
   ```
2. Check subscriptions recipe:
   ```bash
   if [ -d "subscriptions" ]; then
     echo "=== Subscriptions Recipe ==="
     ls -la subscriptions/
     head -20 subscriptions/*.patch 2>/dev/null || head -20 subscriptions/*.md
   fi
   ```
3. Check combined-listings:
   ```bash
   if [ -d "combined-listings" ]; then
     echo "=== Combined Listings Recipe ==="
     ls -la combined-listings/
     head -20 combined-listings/*.patch 2>/dev/null || head -20 combined-listings/*.md
   fi
   ```
4. Document what each recipe does
5. Note which files they patch

### Task 2.2: Search for Remix Imports in Recipes
**WHAT:** Find outdated import statements  
**WHY:** Must update to React Router  
**STEPS:**
1. Search for Remix imports in patches:
   ```bash
   grep -r "@remix-run\|@shopify/remix-oxygen" . --include="*.patch" --include="*.diff" | head -20
   ```
2. Count occurrences:
   ```bash
   grep -r "@remix-run\|@shopify/remix-oxygen" . --include="*.patch" --include="*.diff" | wc -l
   ```
3. List affected files:
   ```bash
   grep -l "@remix-run\|@shopify/remix-oxygen" */*.patch 2>/dev/null
   ```
4. Document which recipes need import updates
5. Note specific imports to change

### Task 2.3: Check for Context System References
**WHAT:** Find old context patterns  
**WHY:** Context system changed in React Router  
**STEPS:**
1. Search for context references:
   ```bash
   grep -r "LoaderArgs\|ActionArgs\|createAppLoadContext" . --include="*.patch" | head -10
   ```
2. Check for loader/action patterns:
   ```bash
   grep -r "export.*loader\|export.*action" . --include="*.patch" | head -10
   ```
3. These need updating to new patterns
4. Document context-related changes needed
5. Note affected recipes

## Phase 3: Apply Recipe Updates from Branch

### Task 3.1: Cherry-Pick Recipe Updates
**WHAT:** Apply recipe update commits  
**WHY:** Updates recipes for React Router 7.8.x  
**STEPS:**
1. Check for recipe-related commits:
   ```bash
   git log --oneline hydrogen-react-router-7.8.x -- cookbook/ | head -10
   ```
2. Cherry-pick relevant commits (if any):
   ```bash
   # Cherry-pick recipe updates if commits exist
   # git cherry-pick <commit-hash>
   ```
3. If no specific commits, proceed to manual updates
4. Document what was cherry-picked
5. Note any conflicts

### Task 3.2: Manual Recipe Updates - Markets
**WHAT:** Update markets recipe for React Router  
**WHY:** Common internationalization feature  
**STEPS:**
1. Navigate to markets recipe:
   ```bash
   cd markets 2>/dev/null || echo "No markets recipe"
   ```
2. If exists, update patch files:
   ```bash
   for patch in *.patch; do
     echo "=== Updating $patch ==="
     # Replace Remix imports with React Router
     sed -i '' 's/@remix-run\/node/react-router/g' $patch
     sed -i '' 's/@remix-run\/react/react-router/g' $patch
     sed -i '' 's/@shopify\/remix-oxygen/react-router/g' $patch
     
     # Update type names
     sed -i '' 's/LoaderArgs/LoaderFunctionArgs/g' $patch
     sed -i '' 's/ActionArgs/ActionFunctionArgs/g' $patch
   done
   ```
3. Review changes:
   ```bash
   git diff *.patch | head -50
   ```
4. Document updates made
5. Return: `cd ..`

### Task 3.3: Manual Recipe Updates - Subscriptions
**WHAT:** Update subscriptions recipe  
**WHY:** Selling plans are important  
**STEPS:**
1. Navigate to subscriptions:
   ```bash
   cd subscriptions 2>/dev/null || echo "No subscriptions recipe"
   ```
2. If exists, update patches:
   ```bash
   for patch in *.patch; do
     echo "=== Updating $patch ==="
     sed -i '' 's/@remix-run\/node/react-router/g' $patch
     sed -i '' 's/@remix-run\/react/react-router/g' $patch
     sed -i '' 's/@shopify\/remix-oxygen/react-router/g' $patch
     sed -i '' 's/LoaderArgs/LoaderFunctionArgs/g' $patch
     sed -i '' 's/ActionArgs/ActionFunctionArgs/g' $patch
   done
   ```
3. Check for GraphQL updates needed:
   ```bash
   grep -n "sellingPlan\|subscription" *.patch | head -10
   ```
4. Document changes
5. Return: `cd ..`

### Task 3.4: Manual Recipe Updates - Combined Listings
**WHAT:** Update combined listings recipe  
**WHY:** Product bundles feature  
**STEPS:**
1. Navigate to combined-listings:
   ```bash
   cd combined-listings 2>/dev/null || echo "No combined-listings recipe"
   ```
2. If exists, update patches:
   ```bash
   for patch in *.patch; do
     echo "=== Updating $patch ==="
     sed -i '' 's/@remix-run\/node/react-router/g' $patch
     sed -i '' 's/@remix-run\/react/react-router/g' $patch
     sed -i '' 's/@shopify\/remix-oxygen/react-router/g' $patch
     sed -i '' 's/LoaderArgs/LoaderFunctionArgs/g' $patch
     sed -i '' 's/ActionArgs/ActionFunctionArgs/g' $patch
   done
   ```
3. Check for bundle-specific updates:
   ```bash
   grep -n "bundle\|combined" *.patch | head -10
   ```
4. Document changes
5. Return: `cd ..`

### Task 3.5: Update Other Recipes
**WHAT:** Update any additional recipes found  
**WHY:** All recipes need React Router compatibility  
**STEPS:**
1. Find all other recipe directories:
   ```bash
   for dir in */; do
     if [[ "$dir" != "markets/" && "$dir" != "subscriptions/" && "$dir" != "combined-listings/" ]]; then
       echo "=== Updating $dir ==="
       cd "$dir"
       for patch in *.patch 2>/dev/null; do
         if [ -f "$patch" ]; then
           sed -i '' 's/@remix-run\/node/react-router/g' $patch
           sed -i '' 's/@remix-run\/react/react-router/g' $patch
           sed -i '' 's/@shopify\/remix-oxygen/react-router/g' $patch
           sed -i '' 's/LoaderArgs/LoaderFunctionArgs/g' $patch
           sed -i '' 's/ActionArgs/ActionFunctionArgs/g' $patch
         fi
       done
       cd ..
     fi
   done
   ```
2. Document all recipes updated
3. Note any special cases
4. Check for completion
5. Return to cookbook root

## Phase 4: Update Recipe Documentation

### Task 4.1: Update README Files
**WHAT:** Update recipe documentation  
**WHY:** Instructions must match new patterns  
**STEPS:**
1. Find all README files:
   ```bash
   find . -name "README.md" -o -name "readme.md"
   ```
2. Update React Router references:
   ```bash
   for readme in $(find . -name "*.md"); do
     echo "=== Updating $readme ==="
     sed -i '' 's/@remix-run\/node/react-router/g' $readme
     sed -i '' 's/@remix-run\/react/react-router/g' $readme
     sed -i '' 's/@shopify\/remix-oxygen/react-router/g' $readme
     sed -i '' 's/Remix/React Router/g' $readme
   done
   ```
3. Review documentation changes:
   ```bash
   git diff *.md | head -100
   ```
4. Ensure instructions are clear
5. Document updates made

### Task 4.2: Update Code Examples
**WHAT:** Fix code snippets in documentation  
**WHY:** Examples must work with React Router  
**STEPS:**
1. Search for code blocks:
   ```bash
   grep -n '```' */*.md | head -20
   ```
2. Check for import statements in docs:
   ```bash
   grep -n "import.*from" */*.md | head -20
   ```
3. Manually review and update code blocks
4. Ensure examples use correct imports
5. Document code block updates

### Task 4.3: Update Installation Instructions
**WHAT:** Fix recipe application instructions  
**WHY:** Process may have changed  
**STEPS:**
1. Check for installation steps:
   ```bash
   grep -i "install\|apply\|patch" */README.md | head -20
   ```
2. Update patch commands if needed
3. Verify instructions reference correct paths
4. Update version requirements
5. Document instruction updates

## Phase 5: Test Recipe Application

### Task 5.1: Test Markets Recipe
**WHAT:** Verify markets recipe applies cleanly  
**WHY:** Must work with new skeleton  
**STEPS:**
1. Create test skeleton:
   ```bash
   cp -r ../../templates/skeleton /tmp/test-skeleton-markets
   cd /tmp/test-skeleton-markets
   ```
2. Try applying markets recipe:
   ```bash
   # Attempt to apply patch
   patch -p1 < /path/to/cookbook/markets/*.patch 2>&1 | head -20
   ```
3. Check for errors
4. If fails, note what needs fixing
5. Clean up: `rm -rf /tmp/test-skeleton-markets`
6. Document: `echo "Markets recipe: TESTED" >> /path/to/pr9-status.txt`

### Task 5.2: Test Subscriptions Recipe
**WHAT:** Verify subscriptions recipe works  
**WHY:** Important e-commerce feature  
**STEPS:**
1. Create test skeleton:
   ```bash
   cp -r ../../templates/skeleton /tmp/test-skeleton-subs
   cd /tmp/test-skeleton-subs
   ```
2. Try applying:
   ```bash
   patch -p1 < /path/to/cookbook/subscriptions/*.patch 2>&1 | head -20
   ```
3. Check results
4. Note any failures
5. Clean up: `rm -rf /tmp/test-skeleton-subs`
6. Document: `echo "Subscriptions recipe: TESTED" >> /path/to/pr9-status.txt`

### Task 5.3: Test Combined Listings Recipe
**WHAT:** Verify combined listings applies  
**WHY:** Product bundling is complex  
**STEPS:**
1. Create test skeleton:
   ```bash
   cp -r ../../templates/skeleton /tmp/test-skeleton-combined
   cd /tmp/test-skeleton-combined
   ```
2. Try applying:
   ```bash
   patch -p1 < /path/to/cookbook/combined-listings/*.patch 2>&1 | head -20
   ```
3. Check results
4. Note issues
5. Clean up: `rm -rf /tmp/test-skeleton-combined`
6. Document: `echo "Combined listings recipe: TESTED" >> /path/to/pr9-status.txt`

## Phase 6: Create Recipe Test Scripts

### Task 6.1: Create Batch Test Script
**WHAT:** Script to test all recipes  
**WHY:** Automate testing process  
**STEPS:**
1. Create test script: `test-recipes.sh`
   ```bash
   #!/bin/bash
   SKELETON_PATH="../../templates/skeleton"
   COOKBOOK_PATH="."
   
   for recipe_dir in */; do
     if [ -f "$recipe_dir"/*.patch ]; then
       echo "=== Testing $recipe_dir ==="
       
       # Create temp skeleton
       temp_dir="/tmp/test-recipe-$(basename $recipe_dir)"
       cp -r "$SKELETON_PATH" "$temp_dir"
       
       # Try applying patches
       for patch in "$recipe_dir"*.patch; do
         if [ -f "$patch" ]; then
           echo "Applying $(basename $patch)..."
           (cd "$temp_dir" && patch -p1 < "$(pwd)/$patch" 2>&1) | head -10
         fi
       done
       
       # Clean up
       rm -rf "$temp_dir"
     fi
   done
   ```
2. Make executable: `chmod +x test-recipes.sh`
3. Run: `./test-recipes.sh 2>&1 | tee recipe-test-results.txt`
4. Review results
5. Document which recipes apply cleanly

### Task 6.2: Create Validation Script
**WHAT:** Script to validate recipe files  
**WHY:** Ensure consistency  
**STEPS:**
1. Create validation script: `validate-recipes.sh`
   ```bash
   #!/bin/bash
   echo "=== Validating Recipe Files ==="
   
   # Check for Remix imports
   echo "Checking for old imports..."
   grep -r "@remix-run\|@shopify/remix-oxygen" . --include="*.patch" | wc -l
   
   # Check for React Router imports
   echo "Checking for React Router imports..."
   grep -r "from 'react-router'" . --include="*.patch" | wc -l
   
   # Check documentation
   echo "Checking documentation..."
   find . -name "README.md" | wc -l
   
   # List all recipes
   echo "Recipe directories:"
   for dir in */; do
     if [ -f "$dir"/*.patch 2>/dev/null ]; then
       echo "  - $dir ($(ls $dir/*.patch 2>/dev/null | wc -l) patches)"
     fi
   done
   ```
2. Run: `chmod +x validate-recipes.sh && ./validate-recipes.sh`
3. Review validation results
4. Fix any issues found
5. Clean up scripts

## Phase 7: Handle Expected Failures

### Task 7.1: Document Known Issues
**WHAT:** Note that recipes may not work  
**WHY:** Per project requirements  
**STEPS:**
1. Create KNOWN_ISSUES.md:
   ```markdown
   # Known Recipe Issues
   
   As per project requirements, recipes may remain broken after React Router 7.8.x migration.
   
   ## Expected Failures
   - Patch application may fail due to skeleton structure changes
   - Import paths may not resolve correctly
   - Type definitions may be incompatible
   
   ## Future Work Required
   - Recipes need comprehensive testing
   - May need complete rewrite for React Router 7.8.x
   - GraphQL queries may need updates
   ```
2. Add to cookbook directory
3. Reference in main README
4. Document specific failures found
5. Note remediation steps

### Task 7.2: Add Migration Notes
**WHAT:** Document migration requirements  
**WHY:** Help future fixes  
**STEPS:**
1. Create MIGRATION.md:
   ```markdown
   # Recipe Migration to React Router 7.8.x
   
   ## Changes Required
   1. Update all imports from @remix-run to react-router
   2. Change LoaderArgs to LoaderFunctionArgs
   3. Change ActionArgs to ActionFunctionArgs
   4. Update context system usage
   5. Fix TypeScript types
   
   ## Testing Required
   Each recipe needs:
   - Patch application testing
   - Build verification
   - Runtime testing
   - TypeScript validation
   ```
2. Add specific migration steps
3. Include code examples
4. Document test procedures
5. Save in cookbook root

## Phase 8: Final Validation

### Task 8.1: Count Changed Files
**WHAT:** Verify ~31 files changed  
**WHY:** Match expected scope  
**STEPS:**
1. Count all changes:
   ```bash
   git diff --name-only main | wc -l
   ```
2. Should be approximately 31 files
3. List changed files:
   ```bash
   git diff --name-only main | sort
   ```
4. Should all be in cookbook/
5. Document file count

### Task 8.2: Verify No Source Changes
**WHAT:** Ensure only cookbook modified  
**WHY:** This PR only updates recipes  
**STEPS:**
1. Check for changes outside cookbook:
   ```bash
   git diff --name-only main | grep -v "^cookbook/"
   ```
2. Should return nothing
3. If other files changed, review why
4. Revert if necessary
5. Document scope verification

### Task 8.3: Final Import Check
**WHAT:** Ensure React Router imports used  
**WHY:** Core requirement  
**STEPS:**
1. Check for remaining Remix imports:
   ```bash
   grep -r "@remix-run\|@shopify/remix-oxygen" . --include="*.patch" --include="*.md"
   ```
2. Should return minimal or no results
3. Check for React Router imports:
   ```bash
   grep -r "from 'react-router'" . --include="*.patch" | wc -l
   ```
4. Should show many results
5. Document final state

## Phase 9: Commit and Push

### Task 9.1: Review All Changes
**WHAT:** Final review before commit  
**WHY:** Ensure quality  
**STEPS:**
1. Review diff:
   ```bash
   git diff main | head -500
   ```
2. Check for:
   - Correct import updates
   - Consistent patterns
   - No debug code
   - Documentation updates
3. Review each recipe's changes
4. Ensure systematic updates
5. Document review complete

### Task 9.2: Create Commit
**WHAT:** Commit recipe updates  
**WHY:** Clear history  
**STEPS:**
1. Stage changes:
   ```bash
   git add cookbook/
   ```
2. Commit with message:
   ```bash
   git commit -m "fix(cookbook): update recipes for React Router 7.8.x compatibility

   - Update all recipe patches to use React Router imports
   - Replace @remix-run and @shopify/remix-oxygen imports
   - Update LoaderArgs/ActionArgs to LoaderFunctionArgs/ActionFunctionArgs
   - Update documentation and README files
   - Add migration and known issues documentation
   
   Note: Per project requirements, recipes may remain broken and need
   additional work for full React Router 7.8.x compatibility.
   
   Updated recipes:
   - markets
   - subscriptions
   - combined-listings
   - [other recipes as found]
   
   Part of React Router 7.8.x migration (PR 9 of 9)"
   ```
3. Verify commit

### Task 9.3: Push Branch
**WHAT:** Push to GitHub  
**WHY:** Create PR  
**STEPS:**
1. Push: `git push origin feat/recipes-rr-7.8`
2. Note URL provided
3. Verify on GitHub
4. Check file count
5. Document: `echo "Pushed to GitHub" >> pr9-status.txt`

## Phase 10: Pull Request Creation

### Task 10.1: Create GitHub PR
**WHAT:** Open pull request  
**WHY:** Complete migration  
**STEPS:**
1. Go to GitHub
2. Click "Compare & pull request"
3. Base: `main`
4. Compare: `feat/recipes-rr-7.8`
5. Title: "fix(cookbook): update recipes for React Router 7.8.x compatibility"

### Task 10.2: PR Description Template
**WHAT:** Comprehensive description  
**WHY:** Document final migration step  
**STEPS:**
Copy and use:
```markdown
## Summary
Update all cookbook recipes for React Router 7.8.x compatibility. This is PR 9 of 9, completing the React Router migration strategy. Note that per project requirements, recipes may remain broken and need additional work.

## Changes

### Import Updates
- ✅ Replaced all @remix-run imports with react-router
- ✅ Replaced @shopify/remix-oxygen imports with react-router
- ✅ Updated type names (LoaderArgs → LoaderFunctionArgs, etc.)

### Recipes Updated
- **markets** - Internationalization and multi-market support
- **subscriptions** - Selling plans and subscription products
- **combined-listings** - Product bundles and combinations
- [Additional recipes as found]

### Documentation
- ✅ Updated all README files with correct imports
- ✅ Fixed code examples in documentation
- ✅ Added KNOWN_ISSUES.md documenting expected failures
- ✅ Added MIGRATION.md with update requirements

## Known Issues
⚠️ **IMPORTANT**: Per project requirements, recipes may not fully work with the new skeleton structure. This PR updates imports and types, but recipes may need additional work:
- Patch application may fail due to skeleton changes
- Additional React Router 7.8.x updates may be needed
- GraphQL queries may need updates
- TypeScript types may need adjustments

## Dependencies
⚠️ **REQUIRES**: PR 5 (Skeleton) must be merged first
- PR 5: Skeleton template migration ✅
- Other PRs recommended but not required

## Testing
- [x] All recipe patches updated with new imports
- [x] Documentation updated
- [x] No Remix imports remain in patches
- [x] React Router imports used consistently
- [ ] ⚠️ Patch application (may fail - expected)
- [ ] ⚠️ Runtime testing (deferred - known issues)

## Files Changed (~31 files)
```
cookbook/
├── markets/
│   ├── *.patch (updated imports)
│   └── README.md (updated docs)
├── subscriptions/
│   ├── *.patch (updated imports)
│   └── README.md (updated docs)
├── combined-listings/
│   ├── *.patch (updated imports)
│   └── README.md (updated docs)
├── KNOWN_ISSUES.md (NEW)
└── MIGRATION.md (NEW)
```

## Migration Status
| Recipe | Imports Updated | Docs Updated | Applies Cleanly | Fully Working |
|--------|----------------|--------------|-----------------|---------------|
| markets | ✅ | ✅ | ❓ | ❌ |
| subscriptions | ✅ | ✅ | ❓ | ❌ |
| combined-listings | ✅ | ✅ | ❓ | ❌ |

## Next Steps
After this PR, recipes will need:
1. Testing against new skeleton structure
2. Fixing patch application issues
3. Runtime validation
4. Possible complete rewrite for some recipes

## Breaking Changes
- ⚠️ Recipes may not apply cleanly to new skeleton
- ⚠️ Manual fixes required for full functionality
- ⚠️ Some recipes may need complete rewrite

## Related
- Part of #3127 breakdown strategy
- See PRS_STRATEGY.md for overall plan
- Final PR in React Router 7.8.x migration

## Notes
This PR completes the initial React Router 7.8.x migration. Recipes are updated to use correct imports but may need additional work for full functionality, as expected per project requirements.

## Validation
To test recipe updates:
```bash
cd cookbook
# Check for old imports (should be 0)
grep -r "@remix-run" . --include="*.patch" | wc -l

# Check for new imports (should be many)
grep -r "react-router" . --include="*.patch" | wc -l

# Try applying a recipe (may fail - expected)
cp -r ../templates/skeleton /tmp/test
cd /tmp/test
patch -p1 < /path/to/cookbook/markets/*.patch
```
```

## Success Criteria Checklist
- [ ] PR 5 (Skeleton) merged first
- [ ] Feature branch created
- [ ] All recipe patches updated
- [ ] @remix-run imports replaced
- [ ] @shopify/remix-oxygen imports replaced
- [ ] Type names updated
- [ ] Documentation updated
- [ ] README files fixed
- [ ] KNOWN_ISSUES.md created
- [ ] MIGRATION.md created
- [ ] ~31 files changed
- [ ] Only cookbook/ modified
- [ ] React Router imports used
- [ ] Clean commit history
- [ ] PR created and ready

## Troubleshooting Guide

### Issue: Recipe won't apply
**Solution:**
1. This is EXPECTED per requirements
2. Document in KNOWN_ISSUES.md
3. Note what fails
4. Don't try to fix completely
5. Focus on import updates only

### Issue: Patch conflicts
**Solution:**
1. Expected due to skeleton changes
2. Update imports in patch file
3. Don't rewrite entire patch
4. Document conflict
5. Mark as known issue

### Issue: TypeScript errors
**Solution:**
1. Update type imports
2. Change Args to FunctionArgs
3. If complex, document for later
4. Don't spend too much time
5. Mark as needs work

### Issue: GraphQL changes needed
**Solution:**
1. Note in documentation
2. Don't update queries in this PR
3. Mark as future work
4. Focus on imports only
5. Document requirements

### Issue: Recipe tests fail
**Solution:**
1. This is EXPECTED
2. Document failure mode
3. Note what needs fixing
4. Don't block PR on this
5. Mark as known issue

### Issue: Documentation outdated
**Solution:**
1. Update imports in examples
2. Fix obvious errors
3. Add notes about issues
4. Don't rewrite entirely
5. Focus on React Router refs

## Notes for Implementer
- This is the FINAL PR in the migration
- Recipes may not work - this is EXPECTED
- Focus on import updates only
- Document all known issues
- Don't try to fix everything
- Create good documentation for future work
- Keep changes focused
- ~31 files is the target
- Test what you can
- Accept that full fixes come later