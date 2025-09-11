# Fix Broken Cookbook Recipe - Comprehensive Guide

## Purpose
This document provides a systematic approach to diagnose and fix broken cookbook recipes when the underlying skeleton template changes (e.g., after framework migrations, major refactors, or dependency updates).

## Prerequisites
- Access to the cookbook directory and tools
- Understanding of Git patches and diff format
- Ability to run build and validation commands
- Knowledge of the changed skeleton structure

## Step 1: Initial Diagnosis

### 1.1 Identify the Failure
First, run validation to understand what's broken:

```bash
# Validate a specific recipe
npm run validate:recipe <recipe-name>

# Or use the cookbook directly
cd cookbook && npm run cookbook -- validate --recipe <recipe-name>
```

### 1.2 Analyze the Error Output
Look for key indicators:
- **"X out of Y hunks failed"**: Patch context doesn't match
- **"File not found"**: File was moved or renamed
- **"patching file"**: Shows which file is failing
- **".rej file"**: Contains rejected hunks (though may not always be created)

### 1.3 Document the Failure Pattern
Record what type of failure you're seeing:
- [ ] Import structure changes
- [ ] Type definition changes  
- [ ] File location changes
- [ ] Function signature changes
- [ ] Component API changes
- [ ] Build system changes

**Learning from bundles recipe:**
The failure showed "1 out of 2 hunks failed" for `_index.tsx`, indicating the patch expected old import structure that no longer exists.

## Step 2: Understand the Changes

### 2.1 Compare Old vs New Structure
Examine what changed in the skeleton:

```bash
# Check the failing patch content
cat cookbook/recipes/<recipe-name>/patches/<failing-patch>

# Check the current file structure
cat templates/skeleton/<path-to-file>

# Look for patterns across multiple files
grep -r "import.*LoaderFunctionArgs" templates/skeleton/
grep -r "import.*Route" templates/skeleton/
```

### 2.2 Identify Systematic Changes
Document patterns that affect multiple files:
- Import changes (e.g., `@shopify/remix-oxygen` → `./+types/`)
- Type changes (e.g., `LoaderFunctionArgs` → `Route.LoaderArgs`)
- Export changes (e.g., `export const meta` → `export const meta: Route.MetaFunction`)
- File structure changes (e.g., new type definition files)

**Learning from bundles recipe:**
React Router 7.8.x migration introduced:
- Type imports from `./+types/<route-name>` instead of `@shopify/remix-oxygen`
- `Route.LoaderArgs` instead of `LoaderFunctionArgs`
- `Route.MetaFunction` instead of imported `MetaFunction`

## Step 3: Fix Strategy Selection

### 3.1 Choose Approach Based on Failure Type

| Failure Type | Recommended Approach | When to Use |
|--------------|---------------------|-------------|
| Minor context changes | Regenerate patches only | Patches fail but logic unchanged |
| Major structural changes | Full manual reapplication | Framework migration, file reorganization |
| Mixed (some work, some don't) | Selective regeneration | Part of recipe still valid |
| Complete failure | Start from scratch | Nothing salvageable |

### 3.2 Decision Tree
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