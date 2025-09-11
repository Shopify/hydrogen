# Fix Broken Cookbook Recipe - Comprehensive Guide

## Purpose
This document provides a systematic approach to diagnose and fix broken cookbook recipes when the underlying skeleton template changes (e.g., after framework migrations, major refactors, or dependency updates).

## Prerequisites
- Access to the cookbook directory and tools
- Understanding of Git patches and diff format
- Ability to run build and validation commands
- Knowledge of the changed skeleton structure

## Step 1: Recipe Selection

### 1.1 Ask User for Recipe to Fix
**ALWAYS START HERE - DO NOT ASSUME**

```
Which recipe from cookbook/recipes/ would you like to fix?
Available recipes:
- bundles
- markets
- subscriptions
- combined-listings
- [other recipes in the directory]

Please specify the recipe name:
```

Wait for user input before proceeding. Do not make assumptions about which recipe to fix.

### 1.2 Verify Recipe Exists
```bash
ls cookbook/recipes/[user-specified-recipe]/
```

## Step 2: Initial Diagnosis Using Cookbook Apply

### 2.1 Clean Skeleton and Apply Recipe
Use the cookbook's apply command to understand the problems:

```bash
# Ensure skeleton is clean
cd templates/skeleton
git status  # Should show no changes
git clean -fd
git checkout -- .

# Apply the recipe to see failures
cd ../../cookbook
npm run cookbook -- apply --recipe [user-specified-recipe]
```

### 2.2 Create Detailed Conflict Analysis
**Create a per-file and per-patch technical list of all conflicts:**

```bash
# Document each failing patch
for patch in recipes/[recipe]/patches/*.patch; do
  echo "=== $(basename $patch) ==="
  # Try to apply and capture the specific error
  patch --dry-run -p3 -d ../templates/skeleton < "$patch" 2>&1 | grep -E "(FAILED|succeeded)"
done
```

### 2.3 Deep Investigation of Each Conflict
For EACH failing patch, create a detailed analysis:

```
File: [filename]
Patch: [patch-name]
Failure Type: [Hunk failed / File not found / etc.]

Expected Structure (from patch):
- [Show the patch expectations]

Current Structure (in skeleton):
- [Show current file structure]

Root Cause:
- [Identify why it's failing]

Required Changes:
- [List what needs to be adapted]
```

### 2.4 Check for .rej and .orig Files
```bash
# Find reject files that show exact conflicts
find ../templates/skeleton -name "*.rej" -o -name "*.orig"

# Examine each .rej file for details
for rej in $(find ../templates/skeleton -name "*.rej"); do
  echo "=== $rej ==="
  cat "$rej"
done
```

## Step 3: Manual Application with Deep Evaluation

### 3.1 Understand New Skeleton Structure
Before applying changes, deeply understand the current skeleton:

```bash
# Analyze import patterns in current skeleton
echo "=== Current Import Structure ==="
grep -h "^import" templates/skeleton/app/routes/*.tsx | sort -u

# Check type definition structure
ls -la templates/skeleton/app/routes/+types/

# Understand component structure
find templates/skeleton/app/components -name "*.tsx" -exec basename {} \;
```

### 3.2 Apply Changes Manually by Evaluating Each Patch
For each patch that needs to be applied:

1. **Copy new files (ingredients)**:
   ```bash
   cp -r cookbook/recipes/[recipe]/ingredients/* templates/skeleton/
   ```

2. **For each patch, manually apply the INTENT, not the literal patch**:
   ```bash
   # Read the patch to understand intent
   cat cookbook/recipes/[recipe]/patches/[patch-file]
   
   # Open the target file
   vi templates/skeleton/[target-file]
   
   # Apply the logical changes, adapting to new structure:
   # - Use Route.LoaderArgs instead of LoaderFunctionArgs
   # - Import from 'react-router' not '@shopify/remix-oxygen'
   # - Use Route.MetaFunction for meta exports
   # - Import types from './+types/[route-name]'
   ```

3. **Document each manual change made**:
   ```
   File: [filename]
   Original Change: [what the patch wanted to do]
   Adapted Change: [what you actually did]
   Reason for Adaptation: [why the change was needed]
   ```

### 3.3 Verify No .orig or .rej Files
```bash
# Must return empty - no .orig or .rej files allowed
find templates/skeleton -name "*.orig" -o -name "*.rej"

# If any exist, remove them
find templates/skeleton -name "*.orig" -o -name "*.rej" | xargs rm -f
```

## Step 4: Full Validation of Applied Changes

### 4.1 TypeScript Validation
```bash
cd templates/skeleton
npm run typecheck
```

If TypeScript errors occur, fix them before proceeding.

### 4.2 Development Server Test
```bash
cd templates/skeleton

# Start dev server
npm run dev &
DEV_PID=$!

# Wait for server to start
sleep 5

# Test home page
curl -s http://localhost:3000/ > /dev/null && echo "✅ Dev server home page works" || echo "❌ Dev server home page failed"

# Test a product page if applicable
curl -s http://localhost:3000/products/[test-product] > /dev/null && echo "✅ Product page works" || echo "❌ Product page failed"

# Kill dev server
kill $DEV_PID
```

### 4.3 Build Validation
```bash
cd templates/skeleton

# Build the application
npm run build

# Check build succeeded
if [ -d "dist" ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed"
  exit 1
fi
```

### 4.4 Preview Server Test
```bash
cd templates/skeleton

# Start preview server
npm run preview &
PREVIEW_PID=$!

# Wait for server to start
sleep 5

# Test home page in preview
curl -s http://localhost:4173/ > /dev/null && echo "✅ Preview home page works" || echo "❌ Preview home page failed"

# Test dynamic routes
curl -s http://localhost:4173/products/[test-product] > /dev/null && echo "✅ Preview dynamic routes work" || echo "❌ Preview dynamic routes failed"

# Kill preview server
kill $PREVIEW_PID
```

### 4.5 Runtime Feature Validation
Test that the recipe's features actually work:

```bash
# For bundles recipe: Check bundle components render
# For markets recipe: Check locale switching works
# For subscriptions: Check selling plans appear
# Document specific tests for each recipe's features
```

## Step 5: Regenerate or Update Recipe

### 5.1 Verify Clean State for Regeneration
```bash
# CRITICAL: No .orig or .rej files can exist
find templates/skeleton -name "*.orig" -o -name "*.rej"

# If any found, remove them
find templates/skeleton -name "*.orig" -o -name "*.rej" -delete
```

### 5.2 Regenerate Recipe with Current Changes
```bash
cd cookbook

# Regenerate patches only (preserves recipe.yaml)
npm run cookbook -- generate --recipe [recipe-name] --onlyFiles

# Or full regeneration with new manifest
npm run cookbook -- regenerate --recipe [recipe-name] --format github
```

### 5.3 Verify Regenerated Recipe
```bash
# Clean skeleton
cd templates/skeleton
git clean -fd
git checkout -- .

# Apply regenerated recipe
cd ../cookbook
npm run cookbook -- apply --recipe [recipe-name]

# Run full validation again
cd ../templates/skeleton
npm run typecheck
npm run build
npm run dev # Test manually
```

## Step 6: Final Commit and Documentation

### 6.1 Commit the Fixed Recipe
```bash
cd cookbook
git add recipes/[recipe-name]/
git commit -m "fix: update [recipe-name] recipe for React Router 7.8.x compatibility

- Updated patches to work with new import structure
- Adapted to Route.LoaderArgs and Route.MetaFunction types
- Removed obsolete import modifications
- Validated with dev, build, and preview servers
- All runtime features confirmed working"
```

### 6.2 Document Migration Notes
Add to recipe README or create a MIGRATION.md:

```markdown
## React Router 7.8.x Compatibility

This recipe has been updated for React Router 7.8.x which uses:
- Consolidated imports from 'react-router'
- Type imports from './+types/[route-name]'
- Route.LoaderArgs instead of LoaderFunctionArgs
- Route.MetaFunction for meta exports

Last validated: [date]
Skeleton commit: [commit-hash]
```

## Decision Tree for Fix Strategy

### Choose Approach Based on Failure Analysis
```
Is the recipe's core functionality still relevant?
├─ No → Archive recipe or mark as deprecated
└─ Yes → Continue
   │
   Are the ingredients (new files) still valid?
   ├─ No → Update ingredients first
   └─ Yes → Continue
      │
      How many patches are failing?
      ├─ All → Manual reapplication needed
      ├─ Most → Selective fix with regeneration
      └─ Few → Fix individual patches
```

## Step 4: Execution - Manual Reapplication Method

### 4.1 Prepare Clean Environment
```bash
# IMPORTANT: Only clean the skeleton directory, not the entire repo!
cd templates/skeleton
git status  # Should show no changes
git clean -fd  # Remove untracked files if needed
git checkout -- .  # Reset any changes
```

**⚠️ WARNING**: Never run `git clean -fd` from the repository root - it will delete all your work including documentation and scripts!

### 4.2 Apply Recipe Manually
Instead of using the broken patches, manually recreate the changes:

1. **Copy ingredients manually**:
   ```bash
   cp -r cookbook/recipes/<recipe-name>/ingredients/* templates/skeleton/
   ```

2. **Understand intended changes**:
   - Read the recipe.yaml for description
   - Review each patch to understand what it was trying to do
   - Look at the README.md for context

3. **Reimplement changes**:
   - Open the files that need patching
   - Manually apply the logical changes (not the literal patch)
   - Adapt to new structure (imports, types, etc.)

### 4.3 Regenerate Recipe
Once changes are manually applied and working:

```bash
# Generate new patches from your manual changes
cd cookbook
npm run cookbook -- generate --recipe <recipe-name> --onlyFiles

# This preserves the recipe.yaml but updates all patches
```

## Step 5: Execution - Selective Regeneration Method

### 5.1 Identify Working vs Broken Patches
```bash
# Try applying patches one by one to identify which work
cd templates/skeleton
for patch in ../../cookbook/recipes/<recipe-name>/patches/*.patch; do
  echo "Testing: $patch"
  patch --dry-run -p1 < "$patch" 2>&1 | grep -E "(succeeded|FAILED)"
done
```

### 5.2 Fix Broken Patches Only
For each broken patch:
1. Manually apply the intended change to the file
2. Regenerate just that file's patch:
   ```bash
   npm run cookbook -- generate --recipe <recipe-name> --filePath <path-to-file>
   ```

## Step 6: Validation and Testing

### 6.1 Validate the Fixed Recipe
```bash
# Clean skeleton first (ONLY skeleton directory!)
cd templates/skeleton
git clean -fd
git checkout -- .

# Run validation
cd ../..
npm run validate:recipe <recipe-name>
```

### 6.2 Test Build and Type Checking
If validation passes, additionally verify:
```bash
cd templates/skeleton
npm install
npm run typecheck
npm run build
npm run dev  # Quick manual test
```

### 6.3 Check for Regressions
- Ensure all original features still work
- Verify no unintended changes were introduced
- Test edge cases specific to the recipe

## Step 7: Documentation and Cleanup

### 7.1 Update Recipe Documentation
- Update recipe.yaml if behavior changed
- Regenerate README:
  ```bash
  npm run cookbook -- render --recipe <recipe-name> --format github
  ```

### 7.2 Document Migration Notes
Add a section to recipe.yaml or README about:
- What framework version it's compatible with
- Any migration steps needed
- Known limitations

### 7.3 Clean Up
```bash
# Reset ONLY skeleton to clean state
cd templates/skeleton
git clean -fd
git checkout -- .

# Remove any .rej or .orig files
find . -name "*.rej" -o -name "*.orig" | xargs rm -f
```

## Common Pitfalls and Solutions

### Pitfall 1: Assuming Patches Should Apply Literally
**Problem**: Trying to force old patches to work with new structure
**Solution**: Focus on the intent, not the literal patch

### Pitfall 2: Not Checking Dependencies
**Problem**: Recipe may depend on packages that changed
**Solution**: Verify all required dependencies still exist and are compatible

### Pitfall 3: Ignoring Type Changes
**Problem**: Fixing imports but not updating types
**Solution**: Ensure TypeScript compilation passes after fixes

### Pitfall 4: Partial Fixes
**Problem**: Fixing visible errors but missing subtle breaks
**Solution**: Always run full validation and build

### Pitfall 5: Not Testing Runtime Behavior
**Problem**: Code compiles but doesn't work as expected
**Solution**: Actually run the dev server and test the feature

### Pitfall 6: Cleaning From Wrong Directory
**Problem**: Running `git clean -fd` from repo root deletes all work
**Solution**: ALWAYS cd into templates/skeleton first before cleaning

## Automation Opportunities

### Create Helper Scripts
Consider creating scripts for common tasks:

```bash
# Script to test individual patches
#!/bin/bash
# test-patch.sh
RECIPE=$1
PATCH=$2
cd templates/skeleton
patch --dry-run -p1 < "../../cookbook/recipes/$RECIPE/patches/$PATCH"
```

### Batch Processing
For multiple recipes with similar issues:

```bash
# Fix all recipes with same pattern
for recipe in cookbook/recipes/*/; do
  # Apply systematic fixes
done
```

## Learning Log

### Entry 1: React Router 7.8.x Migration
**Issue**: All recipes broken due to import/type changes
**Pattern**: Systematic framework migration
**Solution**: Manual reapplication with adapted imports
**Key Learning**: Framework migrations require understanding the new patterns, not just fixing patches

### Entry 2: Partial Application Creates Incomplete Patches
**Issue**: Running `generate --onlyFiles` after partial manual changes creates incomplete patches
**Pattern**: The generate command only creates patches for files that have changes
**Solution**: Must apply ALL recipe changes before regenerating patches, not just some
**Key Learning**: The cookbook's generate command is stateless - it only sees current git diff, so partial application leads to partial patches

### Entry 3: Directory Context Matters for Git Commands
**Issue**: Running `git clean -fd` from repo root deleted all work including documentation
**Pattern**: Git clean removes ALL untracked files from current directory and below
**Solution**: Always cd into specific directory (templates/skeleton) before cleaning
**Key Learning**: Be extremely careful with destructive git commands - always verify your current directory first

### Entry 4: [Add future learnings here]
**Issue**: 
**Pattern**: 
**Solution**: 
**Key Learning**: 

---

## Quick Reference Checklist

When a recipe breaks:

1. [ ] Run validation to identify failure
2. [ ] Compare old patch with current file structure  
3. [ ] Identify systematic changes (imports, types, etc.)
4. [ ] Choose fix strategy (manual vs selective)
5. [ ] **CD INTO skeleton directory before cleaning**
6. [ ] Apply changes (manually or via patches)
7. [ ] Regenerate patches with `--onlyFiles`
8. [ ] Validate the fixed recipe
9. [ ] Test build and runtime behavior
10. [ ] Update documentation
11. [ ] Clean up environment (from skeleton directory only!)
12. [ ] Document learnings in this file

## Commands Quick Reference

```bash
# Validate recipe
npm run validate:recipe <name>

# Regenerate patches only (preserves recipe.yaml)
cd cookbook && npm run cookbook -- generate --recipe <name> --onlyFiles

# Regenerate single file patch
cd cookbook && npm run cookbook -- generate --recipe <name> --filePath <path>

# Full regeneration
cd cookbook && npm run cookbook -- regenerate --recipe <name> --format github

# Update with conflict resolution
cd cookbook && npm run cookbook -- update --recipe <name>

# Clean skeleton SAFELY
cd templates/skeleton && git clean -fd && git checkout -- .

# NEVER DO THIS from repo root - it deletes everything!
# git clean -fd  # ❌ DANGEROUS if not in skeleton directory
```

## Critical Safety Rules

1. **ALWAYS cd into templates/skeleton before running git clean**
2. **NEVER run git clean -fd from the repository root**
3. **Use git status to verify your location before destructive commands**
4. **Keep important work (docs, scripts) outside the skeleton directory**
5. **Consider using git stash instead of git clean when possible**