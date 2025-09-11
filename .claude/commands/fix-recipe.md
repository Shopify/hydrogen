<!-- 
╔══════════════════════════════════════════════════════════════════════════════╗
║                           🛑 STOP AND READ THIS 🛑                           ║
║                                                                              ║
║  This guide has MANDATORY SEQUENTIAL STEPS that MUST be followed in order.  ║
║  The FIRST STEP is to ASK THE USER which recipe to fix.                    ║
║  DO NOT skip ahead. DO NOT make assumptions. DO NOT proceed without asking. ║
║                                                                              ║
║  If you are reading this, your NEXT action MUST be to ask:                  ║
║  "Which recipe from cookbook/recipes/ would you like to fix?"               ║
╚══════════════════════════════════════════════════════════════════════════════╝
-->

# Fix Broken Cookbook Recipe - Comprehensive Guide

## ⚠️ CRITICAL: MANDATORY FIRST STEP - DO NOT SKIP ⚠️

**STOP! Before reading further or taking ANY action:**
1. You MUST ask the user which recipe to fix
2. You MUST wait for their response
3. You MUST NOT make assumptions based on context
4. Even if the user mentioned multiple recipes earlier, ASK WHICH ONE TO FIX FIRST

## Purpose
This document provides a systematic approach to diagnose and fix broken cookbook recipes when the underlying skeleton template changes (e.g., after framework migrations, major refactors, or dependency updates).

## Prerequisites
- Access to the cookbook directory and tools
- Understanding of Git patches and diff format
- Ability to run build and validation commands
- Knowledge of the changed skeleton structure

## Step 1: Recipe Selection [MANDATORY - NEVER SKIP]

### 1.1 Ask User for Recipe to Fix
**🛑 ALWAYS START HERE - DO NOT ASSUME - THIS IS NOT OPTIONAL 🛑**

**YOU MUST ASK THIS QUESTION FIRST:**

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

**CRITICAL REQUIREMENTS:**
- ❌ DO NOT proceed to Step 2 without user confirmation
- ❌ DO NOT assume based on previous conversation context
- ❌ DO NOT attempt to fix multiple recipes without asking
- ✅ WAIT for explicit user input specifying ONE recipe name
- ✅ ONLY after receiving the recipe name, proceed to Step 2

**If you skip this step, you are violating the core principle of this guide**

### 1.2 Verify Recipe Exists
```bash
ls cookbook/recipes/[user-specified-recipe]/
```

## Step 2: Initial Diagnosis Using Cookbook Apply

### 2.1 Setup and Verify Working Directory
**CRITICAL**: Always work from the cookbook directory to ensure correct relative paths:

```bash
# Navigate to cookbook directory first
cd /path/to/repo/cookbook
pwd  # Confirm you're in cookbook directory

# List available recipes to confirm structure
ls recipes/
```

### 2.2 Clean Skeleton and Attempt Recipe Application
Clean the skeleton and attempt to apply the recipe to identify failures:

```bash
# Clean skeleton from cookbook directory
cd ../templates/skeleton
git status  # Should show no changes
git clean -fd
git checkout -- .

# Return to cookbook and apply recipe
cd ../../cookbook
npm run cookbook -- apply --recipe [user-specified-recipe]
```

**Expected Output for Failed Application:**
```
- 🍱 Loading recipe '[recipe-name]'…
- 🔄 Checking template directory…
- 🍣 Checking ingredients…
- 🗑️ Deleting files…
- 🗳️ Copying ingredients…
  - Copying [component].tsx
- 🥣 Applying steps…
  - 🩹 Patching app/routes/[file].tsx with [file].tsx.[hash].patch…
patching file '/path/to/skeleton/app/routes/[file].tsx'
1 out of 2 hunks failed--saving rejects to '/path/to/skeleton/app/routes/[file].tsx.rej'
```

**Key Information to Extract:**
- Which patches failed (note the "X out of Y hunks failed" messages)
- Which patches succeeded silently
- Location of .rej files created

### 2.3 Create Comprehensive Patch Analysis
Test each patch individually to understand exactly what fails:

```bash
# From cookbook directory, test each patch
for patch in recipes/[recipe]/patches/*.patch; do
  echo "=== $(basename $patch) ==="
  # Use -p3 for correct path depth (removes 'templates/skeleton/' prefix)
  patch --dry-run -p3 -d ../templates/skeleton < "$patch" 2>&1 | grep -E "(FAILED|succeeded|Hunk)"
done
```

**Alternative: Test patches individually for detailed output:**
```bash
# Test a specific problematic patch
cd ../templates/skeleton
patch --dry-run -p3 < ../../cookbook/recipes/[recipe]/patches/[filename].patch
```

**Common Patch Failure Patterns:**
1. **"No file found"**: Wrong path depth, use -p3 instead of -p1
2. **"Hunk #X FAILED"**: Context mismatch due to changed imports/structure
3. **Silent success**: Patch applied but may not be doing what's intended

### 2.4 Analyze Rejection Files
Rejection files show exactly what couldn't be applied:

```bash
# Find all rejection files
find ../templates/skeleton -name "*.rej" -o -name "*.orig"

# Examine rejection contents
for rej in $(find ../templates/skeleton -name "*.rej"); do
  echo "=== $rej ==="
  cat "$rej"
  echo ""
done
```

**Reading .rej Files:**
- Shows the exact hunk that failed
- First lines show what patch expected to find
- Helps identify if issue is imports, types, or structural changes

### 2.5 Document Patch Failures
Create a failure matrix to track what needs fixing:

```bash
# Example analysis output to create:
# _index.tsx.8041d5.patch: FAILED - Expects old import structure
# app.css.e88d35.patch: SUCCESS
# collections.$handle.tsx.951367.patch: PARTIAL - 1/3 hunks failed
# products.$handle.tsx.3e0b7e.patch: PARTIAL - 1/7 hunks failed
```

## Step 3: Manual Application with Deep Evaluation

### 3.1 Understand Current Skeleton Structure
Before applying changes, understand what the skeleton currently uses:

```bash
# From cookbook directory
cd ../templates/skeleton

# Check current import patterns for route files
echo "=== Checking current import structure in routes ==="
head -10 app/routes/_index.tsx
head -10 app/routes/products.\$handle.tsx

# Key patterns to look for:
# - Imports from 'react-router' (not '@shopify/remix-oxygen')
# - Type imports from './+types/[route-name]'
# - Route.LoaderArgs, Route.MetaFunction (not LoaderFunctionArgs, MetaFunction)
```

**React Router 7.8.x Structure Example:**
```typescript
// New structure
import { redirect, useLoaderData } from 'react-router';
import type { Route } from './+types/products.$handle';
export async function loader(args: Route.LoaderArgs) { ... }
export const meta: Route.MetaFunction = () => { ... };

// Old structure (what patches expect)
import { redirect, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData, type MetaFunction } from '@remix-run/react';
export async function loader(args: LoaderFunctionArgs) { ... }
export const meta: MetaFunction<typeof loader> = () => { ... };
```

### 3.2 Clean Skeleton and Copy Ingredients
Start fresh and copy recipe ingredients:

```bash
# Clean skeleton completely
cd ../templates/skeleton
git clean -fd
git checkout -- .

# Copy ingredients - NOTE the nested structure!
cd ../../cookbook
cp -r recipes/[recipe]/ingredients/templates/skeleton/* ../templates/skeleton/

# Verify ingredients were copied
ls -la ../templates/skeleton/app/components/
```

**CRITICAL**: Ingredients often have nested paths like `ingredients/templates/skeleton/app/components/`. You must copy from the correct subdirectory!

### 3.3 Apply Patches Intelligently
For each patch, understand its intent and apply accordingly:

```bash
# Step 1: Read patch to understand intent
cat recipes/[recipe]/patches/[filename].patch

# Step 2: Check if patch is just formatting/imports
# If patch only changes spacing or old imports, SKIP IT

# Step 3: For substantive changes, apply manually or with patch
cd ../templates/skeleton

# Option A: Apply patch if it doesn't touch imports
patch -p3 < ../../cookbook/recipes/[recipe]/patches/[filename].patch

# Option B: Manually apply the logical change
# Use your editor to add the actual functionality, ignoring import changes
```

**Key Learning from combined-listings fix:**
- Some patches partially apply (e.g., GraphQL changes work but imports fail)
- When this happens, the successful parts are already applied
- Check `.rej` files to see what failed and manually apply only those parts
- Don't re-apply the entire patch - just fix the rejected hunks

**Decision Matrix for Each Patch:**

| Patch Content | Action | Example |
|--------------|--------|---------|
| Only import formatting | Skip entirely | Changing space in imports |
| Adds imports that no longer exist | Skip entirely | Adding `@shopify/remix-oxygen` imports |
| Adds new GraphQL fields | Apply manually or patch | Adding `maxVariantPrice` to query |
| Adds new components/logic | Apply with patch | Adding component logic |
| Mixed imports + logic | Apply logic only manually | Import changes + GraphQL changes |

### 3.4 Common Manual Fixes

**Fix 1: GraphQL Query Additions**
```bash
# If patch adds fields to GraphQL query, apply just that part
# Example: Adding maxVariantPrice to a product query
# Find the query location and add the fields manually
```

**Fix 2: Component Imports**
```bash
# If patch adds component imports that now fail
# Check if component was copied from ingredients
# Add import with correct path
```

**Fix 3: Skip Formatting-Only Changes**
```bash
# If patch only changes:
# - Space vs no space in imports
# - Import order
# - Similar trivial changes
# SKIP THE ENTIRE PATCH
```

**Fix 4: Type Import Issues**
```bash
# With verbatimModuleSyntax enabled, TypeScript requires explicit type imports
# Change: import {ProductFragment} from 'storefrontapi.generated';
# To: import type {ProductFragment} from 'storefrontapi.generated';
```

**Fix 5: Route Type Updates**
```bash
# React Router 7.8.x uses different type patterns
# Old: export async function loader(args: LoaderFunctionArgs)
# New: export async function loader(args: Route.LoaderArgs)
# Old: export const meta: MetaFunction<typeof loader>
# New: export const meta: Route.MetaFunction
```

### 3.5 React Router 7.8.x Specific Fixes

**Common patterns that need updating in every recipe:**

1. **Route File Imports**
   ```typescript
   // OLD (all route files):
   import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
   import {type MetaFunction} from '@remix-run/react';
   
   // NEW:
   import type {Route} from './+types/[route-name]';
   ```

2. **Function Signatures**
   ```typescript
   // OLD:
   export async function loader(args: LoaderFunctionArgs) { ... }
   export const meta: MetaFunction<typeof loader> = () => { ... };
   
   // NEW:
   export async function loader(args: Route.LoaderArgs) { ... }
   export const meta: Route.MetaFunction = () => { ... };
   ```

3. **Data Function Import**
   ```typescript
   // OLD:
   import {data} from '@shopify/remix-oxygen';
   
   // NEW:
   import {data} from 'react-router';
   ```

4. **Type-Only Imports (verbatimModuleSyntax)**
   ```typescript
   // OLD:
   import {SomeType} from 'some-module';
   
   // NEW:
   import type {SomeType} from 'some-module';
   ```

### 3.6 Clean Up After Manual Application
```bash
# Remove any .rej or .orig files created
find . -name "*.rej" -delete
find . -name "*.orig" -delete

# Alternatively, in one command
find . -name "*.rej" -o -name "*.orig" | xargs rm -f
```

## Step 4: Full Validation of Applied Changes

### 4.1 TypeScript Validation
First, ensure the code compiles without errors:

```bash
cd ../templates/skeleton
# ALWAYS run codegen first after applying patches
npm run codegen
npm run typecheck
```

**Common TypeScript Errors and Fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module '~/components/[Component]'` | Ingredient not copied | Check ingredients were copied correctly |
| `Type 'LoaderFunctionArgs' not found` | Old type imports | Change to `Route.LoaderArgs` |
| `Property does not exist on type` | GraphQL type mismatch | Run `npm run codegen` to regenerate types |
| `'[Type]' is a type and must be imported using a type-only import` | verbatimModuleSyntax | Add `type` keyword to import |

**If TypeScript errors occur:**
```bash
# Regenerate GraphQL types if needed
npm run codegen

# Check if components exist
ls app/components/

# Verify imports match file locations
grep -r "import.*from.*components" app/routes/
```

### 4.2 Build Validation
Ensure the application builds successfully:

```bash
# Run build
npm run build
```

**Expected Successful Build Output:**
```
vite v6.2.4 building for production...
✓ 198 modules transformed.
✓ built in 828ms
✓ 3 assets cleaned from React Router server build.
```

**If build fails:**
- Check for syntax errors in manually edited files
- Ensure all imports resolve correctly
- Verify no .orig or .rej files are being processed

### 4.3 Development Server Quick Test
Test that the dev server starts and serves pages:

```bash
# Quick test with timeout
timeout 5 npm run dev 2>&1 | head -20
```

**Expected Output:**
```
Environment variables injected into MiniOxygen:
SESSION_SECRET   from local .env

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose

╭─ success ────────────────────────────────────────────────────╮
│                                                              │
│  View Hydrogen app: http://localhost:3000/                   │
│                                                              │
│  View GraphiQL API browser:                                  │
│  http://localhost:3000/graphiql                              │
```

### 4.4 Comprehensive Server Test (Optional)
For thorough testing, start the server and test routes:

```bash
# Start dev server in background
npm run dev > /dev/null 2>&1 &
DEV_PID=$!

# Wait for startup
sleep 10

# Test routes
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep 200 && echo "✅ Home page works" || echo "❌ Home page failed"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/products/snowboard | grep 200 && echo "✅ Product page works" || echo "❌ Product page failed"

# Kill server
kill $DEV_PID
```

### 4.5 Feature-Specific Validation
Verify the recipe's specific features work:

```bash
# Quick visual check - start dev server
npm run dev

# Then manually verify:
# - New components appear where expected
# - GraphQL queries return additional fields
# - UI elements render correctly
# - No console errors in browser
```

**What to Check for Each Recipe Type:**
- **Component recipes**: New components render on appropriate pages
- **GraphQL recipes**: Additional fields available in queries
- **Route recipes**: New routes accessible
- **Style recipes**: Visual changes applied correctly

## Step 5: Regenerate Recipe Patches

### 5.1 Prepare for Regeneration
Ensure skeleton has all changes applied and no artifacts:

```bash
# From templates/skeleton directory
# Remove any .orig or .rej files that might interfere
find . -name "*.orig" -o -name "*.rej" -delete

# Verify all changes are applied
git status
# Should show:
# - modified files (patches applied)
# - new files (ingredients added)
# - NO .orig or .rej files
```

### 5.2 Regenerate Patches Only
**IMPORTANT**: Use `--onlyFiles` to preserve the recipe.yaml manifest:

```bash
cd ../../cookbook
npm run cookbook -- generate --recipe [recipe-name] --onlyFiles
```

**What this does:**
- Creates new patch files from current skeleton state
- Preserves existing recipe.yaml with descriptions
- Updates patch filenames with new hashes
- Removes patches that are no longer needed

**Expected Output:**
```
📖 Generating recipe
- 📖 Generating LLMs files…
Generating recipe LLM prompt
- [recipe-name]
/path/to/cookbook/recipes/[recipe-name]/recipe.yaml
From https://github.com/Shopify/hydrogen
 * branch                main       -> FETCH_HEAD
```

### 5.2.1 CRITICAL: Verify Patch Count After Regeneration

**⚠️ CRITICAL SUCCESS CRITERIA ⚠️**

After regenerating patches, you MUST verify that all original functionality is preserved:

```bash
# Count patches before and after regeneration
ls cookbook/recipes/[recipe-name]/patches/*.patch | wc -l

# List all patches to verify each has a regenerated equivalent
ls -la cookbook/recipes/[recipe-name]/patches/
```

**RED FLAGS - DO NOT PROCEED IF:**
- ❌ Number of patches significantly decreased (missing patches = lost functionality)
- ❌ Key files from original recipe have no patches (e.g., if root.tsx, Header.tsx, variants.ts had patches before, they MUST have patches after)
- ❌ Only 1-2 patches remain when there were originally 5+ patches

**WHY THIS MATTERS:**
- The cookbook's `generate --onlyFiles` command only creates patches for files with git diffs
- If you didn't apply ALL changes before regenerating, patches will be missing
- Missing patches = incomplete recipe = broken functionality

**IF PATCHES ARE MISSING:**
1. DO NOT discard skeleton changes
2. Check which files are missing patches
3. Manually apply the missing changes to those files
4. Run generate again to capture all patches

**Example Check:**
```bash
# Before regeneration: 8 patches
# After regeneration: only 2 patches = PROBLEM!
# This means 6 files worth of changes were not applied to skeleton
```

### 5.2.2 Systematic Recovery of Missing Patches

**When patches are missing after regeneration, follow this systematic approach:**

#### Step 1: Identify Missing Patches
```bash
# Compare original vs new patches
git diff --name-only cookbook/recipes/[recipe]/patches/

# List what patches were deleted (these need recovery)
git diff cookbook/recipes/[recipe]/patches/ | grep "^-" | grep ".patch"
```

#### Step 2: Review Each Missing Patch
For each missing patch, examine what it was trying to do:

```bash
# View the original patch content
git show HEAD:cookbook/recipes/[recipe]/patches/[missing-patch-name].patch

# Understand the intent:
# - What file was it modifying?
# - What functionality was it adding?
# - Is it just import changes or actual logic?
```

#### Step 3: Apply Missing Changes Systematically

**Example from markets recipe recovery:**

1. **Header.tsx patch (missing)**
   ```bash
   # Original patch added CountrySelector to header
   # Manual fix:
   - Add import: import {CountrySelector} from './CountrySelector';
   - Add component in HeaderCtas: <CountrySelector />
   ```

2. **root.tsx patch (missing)**
   ```bash
   # Original patch added selectedLocale to loader and key prop
   # Manual fix:
   - Add to loader return: selectedLocale: args.context.storefront.i18n,
   - Add key prop to PageLayout: key={`${data.selectedLocale.language}-${data.selectedLocale.country}`}
   ```

3. **sitemap patch (missing)**
   ```bash
   # Original patch used SUPPORTED_LOCALES for sitemap generation
   # Manual fix:
   - Add import: import {SUPPORTED_LOCALES} from '../lib/i18n';
   - Replace hardcoded locales with: SUPPORTED_LOCALES.map(...)
   ```

4. **variants.ts patch (missing)**
   ```bash
   # Original patch removed pathname-based URL generation
   # Manual fix:
   - Remove import: useLocation from 'react-router'
   - Remove pathname parameter from functions
   - Simplify path generation to: const path = `/products/${handle}`;
   ```

#### Step 4: Verify Each File Has Changes
After applying missing changes, verify git sees the modifications:

```bash
# Check which files now have changes
git status templates/skeleton/

# Verify each previously-patched file shows as modified:
git diff --name-only templates/skeleton/ | grep -E "(Header|root|sitemap|variants)"
```

#### Step 5: Regenerate with All Changes
```bash
# Now regenerate patches - should capture ALL files
cd cookbook
npm run cookbook -- generate --recipe [recipe] --onlyFiles

# Verify patch count matches original
ls recipes/[recipe]/patches/*.patch | wc -l
```

**CRITICAL VALIDATION:**
```bash
# Each original patch file should have a regenerated equivalent:
# Original: Header.tsx.05d0c2.patch
# New:      Header.tsx.[newhash].patch ✅

# If any file is still missing a patch, repeat Step 3 for that file
```

### 5.3 Verify Regenerated Recipe Works
Test the regenerated recipe on a clean skeleton:

```bash
# Clean skeleton completely
cd ../templates/skeleton
git clean -fd
git checkout -- .

# Apply regenerated recipe
cd ../../cookbook
npm run cookbook -- apply --recipe [recipe-name]
```

**Success Indicators:**
- No "hunk failed" messages
- No .rej files created
- All patches apply cleanly

**Quick Validation:**
```bash
cd ../templates/skeleton
npm run typecheck && npm run build && echo "✅ Recipe works!" || echo "❌ Recipe still has issues"
```

### 5.4 Alternative: Full Regeneration
If you need to update the manifest too:

```bash
cd cookbook
npm run cookbook -- regenerate --recipe [recipe-name] --format github
```

**This will:**
1. Apply the recipe to skeleton
2. Regenerate both patches AND recipe.yaml
3. Create new README.md
4. Full recipe refresh

**Use full regeneration when:**
- Recipe description needs updating
- Major structural changes occurred
- Starting fresh is easier than fixing

## Step 6: Final Validation and Cleanup

### 6.1 Run Official Recipe Validation
**CRITICAL**: This is the final check to ensure your recipe is fully working:

```bash
# From repository root (NOT cookbook directory)
npm run validate:recipe [recipe-name]
```

**What validation does:**
1. Applies recipe to a clean skeleton
2. Installs all dependencies
3. Runs TypeScript type checking
4. Builds the application
5. Reports success or failure

**Success Output:**
```
✅ Recipe [recipe-name] is valid!
```

**If validation fails:**
- Review the error output carefully
- Fix any remaining issues
- Regenerate patches if needed
- Run validation again

### 6.2 Clean Up Skeleton Changes
After successful validation, discard skeleton changes while preserving cookbook changes:

```bash
# Discard all skeleton changes (we only needed them for patch generation)
cd templates/skeleton
git clean -fd
git checkout -- .

# Verify cookbook changes are preserved
cd ../../cookbook
git status  # Should show modified recipe files
```

**IMPORTANT**: 
- ✅ KEEP all changes in `cookbook/recipes/[recipe-name]/`
- ❌ DISCARD all changes in `templates/skeleton/`
- The skeleton changes were only temporary for generating patches

### 6.3 Commit the Fixed Recipe
```bash
cd cookbook
git add recipes/[recipe-name]/
git commit -m "fix: update [recipe-name] recipe for React Router 7.8.x compatibility

- Updated patches to work with new import structure
- Adapted to Route.LoaderArgs and Route.MetaFunction types
- Removed obsolete import modifications
- Validated with npm run validate:recipe
- All runtime features confirmed working"
```

### 6.4 Document Migration Notes
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
Validation: Passed npm run validate:recipe
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

### Pitfall 1: Wrong Patch Path Depth
**Problem**: Using `-p1` when patches need `-p3` for correct path stripping
**Solution**: Use `patch -p3` to strip the `templates/skeleton/` prefix from patches
**Example**: `patch -p3 -d ../templates/skeleton < recipe.patch`

### Pitfall 2: Ingredients Have Nested Structure
**Problem**: Copying from wrong directory level misses ingredients
**Solution**: Copy from `ingredients/templates/skeleton/*` not just `ingredients/*`
**Example**: `cp -r recipes/[recipe]/ingredients/templates/skeleton/* ../templates/skeleton/`

### Pitfall 3: Trying to Fix Import-Only Patches
**Problem**: Wasting time fixing patches that only change import formatting or old imports
**Solution**: Skip patches that only modify imports - focus on functional changes
**Example**: Skip patches changing `import { A }` to `import {A}` or adding `@shopify/remix-oxygen`

### Pitfall 4: Not Cleaning .rej Files Before Regeneration
**Problem**: .rej and .orig files interfere with patch regeneration
**Solution**: Always clean these files before regenerating: `find . -name "*.rej" -o -name "*.orig" -delete`

### Pitfall 5: Using Full Regeneration Instead of --onlyFiles
**Problem**: Losing carefully crafted recipe.yaml descriptions
**Solution**: Use `generate --recipe [name] --onlyFiles` to preserve manifest

### Pitfall 6: Not Understanding Patch Intent
**Problem**: Applying patches literally when structure has changed
**Solution**: Read patch to understand what it's trying to achieve, then implement that intent
**Example**: If patch adds GraphQL fields, manually add just those fields

### Pitfall 7: Testing With Wrong Working Directory
**Problem**: Commands fail due to incorrect relative paths
**Solution**: Always work from cookbook directory for recipe commands

### Pitfall 8: Forgetting Final Validation
**Problem**: Recipe seems to work but fails in clean environment
**Solution**: Always run `npm run validate:recipe [name]` before committing
**Example**: Recipe builds locally but validation catches missing dependencies

### Pitfall 9: Committing Skeleton Changes
**Problem**: Accidentally committing temporary skeleton modifications
**Solution**: After validation, discard skeleton changes while keeping cookbook changes
**Example**: `cd templates/skeleton && git clean -fd && git checkout -- .`

### Pitfall 10: Not Verifying Patch Count After Regeneration
**Problem**: Missing patches after regeneration means lost functionality
**Solution**: ALWAYS compare patch count before/after and investigate discrepancies
**Example**: 6 patches → 2 patches = 4 missing changes that need manual recovery

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

### Entry 4: Patch Path Depth Critical for Application
**Issue**: Patches failing with "No file found" error when using `-p1`
**Pattern**: Patches include full path `templates/skeleton/app/...` that needs stripping
**Solution**: Use `-p3` to strip first 3 path components (templates/skeleton/)
**Key Learning**: Check patch headers to determine correct -p value; -p3 is standard for cookbook patches

### Entry 5: Import-Only Patches Should Be Skipped
**Issue**: Spending time fixing patches that only change import formatting
**Pattern**: Old patches often include trivial changes like space removal in imports
**Solution**: Identify and skip patches that only modify imports without adding functionality
**Key Learning**: Focus on functional changes, not formatting - the new skeleton handles imports correctly

### Entry 6: Ingredients Path Structure is Nested
**Issue**: Components not found after copying ingredients
**Pattern**: Ingredients stored in `ingredients/templates/skeleton/app/components/` not directly in `ingredients/`
**Solution**: Copy from the nested path: `cp -r recipes/[recipe]/ingredients/templates/skeleton/* ../templates/skeleton/`
**Key Learning**: Always check the actual structure of ingredients directory before copying

### Entry 7: TypeScript Errors Reveal Missing Components
**Issue**: TypeScript compilation fails with "Cannot find module" errors
**Pattern**: Patches expect components that weren't properly copied from ingredients
**Solution**: Verify ingredients were copied correctly, check paths match imports
**Key Learning**: TypeScript errors are good indicators of what's missing - use them to guide fixes 

---

## Complete Workflow for Fixing a Recipe

### Streamlined Process (What Actually Works)

```bash
# 1. Setup - Start in cookbook directory
cd /path/to/repo/cookbook
pwd  # Verify you're in cookbook

# 2. Initial diagnosis
cd ../templates/skeleton && git clean -fd && git checkout -- .
cd ../../cookbook
npm run cookbook -- apply --recipe [recipe-name]
# Note which patches fail

# 3. Clean and prepare for manual fixes
cd ../templates/skeleton
git clean -fd && git checkout -- .

# 4. Copy ingredients (critical step!)
cp -r ../cookbook/recipes/[recipe-name]/ingredients/templates/skeleton/* .
ls app/components/  # Verify new components copied

# 5. Apply patches selectively
for patch in ../cookbook/recipes/[recipe-name]/patches/*.patch; do
  echo "Testing $(basename $patch)..."
  # Read patch first to check if it's just imports
  head -20 "$patch"
  # If it has real changes (not just imports), apply it
  patch -p3 < "$patch"
done

# 6. Clean up artifacts
find . -name "*.rej" -o -name "*.orig" -delete

# 7. For patches that failed, apply intent manually
# Example: If patch adds GraphQL fields, add them manually
# Use editor to make logical changes, ignoring import modifications

# 8. Validate it works
npm run typecheck
npm run build
timeout 5 npm run dev 2>&1 | head -20

# 9. Regenerate patches (preserves recipe.yaml)
cd ../../cookbook
npm run cookbook -- generate --recipe [recipe-name] --onlyFiles

# 9.1 CRITICAL: Verify patch count!
ls recipes/[recipe-name]/patches/*.patch | wc -l
# If count decreased, return to step 7 and apply missing changes

# 10. Final test on clean skeleton
cd ../templates/skeleton && git clean -fd && git checkout -- .
cd ../../cookbook
npm run cookbook -- apply --recipe [recipe-name]
cd ../templates/skeleton
npm run typecheck && npm run build

# 11. If all good, you're done!
```

---

## Quick Reference Checklist

### Pre-Flight Checks
- [ ] Working from cookbook directory (`pwd` shows `/cookbook`)
- [ ] Skeleton is clean (`git status` in skeleton shows no changes)
- [ ] Know original patch count (`ls recipes/[name]/patches/*.patch | wc -l`)

### Fix Process Checklist

When a recipe breaks:

1. [ ] **Start in cookbook directory** - verify with `pwd`
2. [ ] **Test initial application** - note which patches fail
3. [ ] **Clean skeleton** - `git clean -fd && git checkout -- .`
4. [ ] **Copy ingredients correctly** - from `ingredients/templates/skeleton/*`
5. [ ] **Apply patches with -p3** - not -p1
6. [ ] **Skip import-only patches** - focus on functional changes
7. [ ] **Clean .rej/.orig files** - before and after manual edits
8. [ ] **Manually apply failed patches' intent** - not literal changes
9. [ ] **Validate with TypeScript and build** - catch errors early
10. [ ] **Regenerate with --onlyFiles** - preserve recipe.yaml
11. [ ] **Final test on clean skeleton** - ensure it works from scratch
12. [ ] **Commit with descriptive message** - document what was fixed

### React Router 7.8.x Migration Checklist

For each route file in the recipe:
- [ ] Replace `LoaderFunctionArgs` with `Route.LoaderArgs`
- [ ] Replace `ActionFunctionArgs` with `Route.ActionArgs`
- [ ] Replace `MetaFunction<typeof loader>` with `Route.MetaFunction`
- [ ] Replace `HeadersFunction` with `Route.HeadersFunction`
- [ ] Add `import type {Route} from './+types/[route-name]'`
- [ ] Remove imports from `@shopify/remix-oxygen` (except `data` if needed)
- [ ] Move `data` import to `react-router` if used
- [ ] Add `type` keyword to type-only imports (verbatimModuleSyntax)

### Missing Patch Recovery Checklist

When patches are missing after regeneration:
1. [ ] **Identify missing patches**: `git diff --name-only cookbook/recipes/[recipe]/patches/`
2. [ ] **Review each missing patch**: `git show HEAD:cookbook/recipes/[recipe]/patches/[patch-name]`
3. [ ] **Apply changes manually** to each missing file
4. [ ] **Verify git sees changes**: `git status templates/skeleton/`
5. [ ] **Regenerate again**: `npm run cookbook -- generate --recipe [recipe] --onlyFiles`
6. [ ] **Verify patch count restored**: Original count = New count ✅

### Final Validation Checklist
- [ ] TypeScript passes: `npm run typecheck`
- [ ] Build succeeds: `npm run build`
- [ ] Dev server starts: `npm run dev`
- [ ] Recipe validation passes: `npm run validate:recipe [name]`
- [ ] Patch count matches original
- [ ] All original functionality preserved

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