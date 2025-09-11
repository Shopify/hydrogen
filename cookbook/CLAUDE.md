# Hydrogen Cookbook Technical Reference

## Executive Summary

The Hydrogen Cookbook is a system for creating, maintaining, and applying reproducible modifications ("recipes") to the Hydrogen skeleton template. The system uses Git patches and file copying to transform the skeleton template, enabling developers to quickly scaffold specific features like bundles, markets, or subscriptions.

**Current Issue**: The cookbook recipes are broken due to the React Router 7.8.x migration in the skeleton template. The patches were created against the pre-migration codebase and now fail to apply because the underlying files have changed significantly (different imports, type definitions, and file structures).

## Architecture Overview

### Core Components

```
cookbook/
├── src/                    # CLI implementation
│   ├── commands/          # CLI command handlers
│   │   ├── apply.ts       # Apply recipe to skeleton
│   │   ├── generate.ts    # Generate recipe from changes
│   │   ├── validate.ts    # Validate recipe works
│   │   ├── render.ts      # Render recipe to Markdown
│   │   ├── regenerate.ts  # Regenerate existing recipe
│   │   └── update.ts      # Update recipe for new skeleton
│   ├── lib/               # Core functionality
│   │   ├── recipe.ts      # Recipe data structures
│   │   ├── apply.ts       # Apply logic
│   │   ├── generate.ts    # Generation logic
│   │   └── constants.ts   # Path definitions
│   └── index.ts           # CLI entry point
├── recipes/               # Recipe definitions
│   ├── [recipe-name]/
│   │   ├── recipe.yaml    # Recipe manifest
│   │   ├── ingredients/   # New files to add
│   │   ├── patches/       # Git patches for existing files
│   │   └── README.md      # Human-readable docs
└── llms/                  # LLM prompts for recipes
```

### Recipe Structure

A recipe consists of:

1. **Manifest (`recipe.yaml`)**: Machine-readable definition containing:
   - `gid`: UUID for the recipe
   - `title`: Human-readable name
   - `summary`: Brief description
   - `description`: Full documentation
   - `requirements`: External dependencies needed
   - `ingredients`: New files to be added
   - `steps`: Ordered modifications to apply
   - `deletedFiles`: Files to remove
   - `commit`: Git commit hash the recipe was generated from

2. **Ingredients (`ingredients/`)**: Complete new files that the recipe adds to the skeleton. These are copied as-is, preserving directory structure.

3. **Patches (`patches/`)**: Git diff patches for modifying existing skeleton files. Named with pattern: `{filename}.{hash}.patch`

4. **Documentation (`README.md`)**: Human-readable version rendered from the manifest.

## Complete CLI Commands Reference

### 1. APPLY Command - Apply Recipe to Skeleton

Applies a recipe's changes (new files, patches, deletions) to the skeleton template.

#### Options Table

| Option | Type | Required | Default | Description | Effect on Execution |
|--------|------|----------|---------|-------------|-------------------|
| `--recipe` | string | Yes | - | Recipe name to apply | Determines which recipe folder to load from `cookbook/recipes/` |
| `--help` | boolean | No | false | Show help text | Displays usage information and exits |
| `--version` | boolean | No | false | Show version | Displays cookbook version and exits |

#### Command Examples with Use Cases

```bash
# BASIC: Apply a single recipe to add bundle functionality
npm run cookbook -- apply --recipe bundles
# Result: Copies bundle components, patches product pages for bundle support

# TESTING: Apply markets recipe to test internationalization
npm run cookbook -- apply --recipe markets
# Result: Adds locale routes, country selector, i18n configuration

# FEATURE: Add subscription support to your store
npm run cookbook -- apply --recipe subscriptions
# Result: Adds selling plan selector, subscription routes, customer portal integration

# HELP: See all available options
npm run cookbook -- apply --help
# Result: Displays usage information
```

#### What Happens During Apply

1. **Pre-checks**: Ensures skeleton has no uncommitted changes
2. **File Deletion**: Removes files listed in recipe's `deletedFiles`
3. **Ingredient Copy**: Copies all new files from `ingredients/` to skeleton
4. **Patch Application**: Applies Git patches to modify existing files
5. **Completion**: Skeleton now has recipe changes applied

#### Common Apply Scenarios

| Scenario | Command | Expected Outcome |
|----------|---------|------------------|
| Add bundle support | `apply --recipe bundles` | Bundle badge component, variant grouping, GraphQL updates |
| Enable multi-market | `apply --recipe markets` | Locale-based routing, country selector, i18n utilities |
| Add subscriptions | `apply --recipe subscriptions` | Selling plans, subscription management, customer portal |
| Combined listings | `apply --recipe combined-listings` | Product grouping utilities, redirect logic, collection updates |

---

### 2. GENERATE Command - Create Recipe from Changes

Creates a new recipe from current modifications to the skeleton template.

#### Options Table

| Option | Type | Required | Default | Description | Effect on Execution |
|--------|------|----------|---------|-------------|-------------------|
| `--recipe` | string | Yes | - | Name for the new recipe | Creates folder `cookbook/recipes/{name}` |
| `--onlyFiles` | boolean | No | false | Skip recipe.yaml generation | Only updates patches/ingredients, preserves existing manifest |
| `--referenceBranch` | string | No | `origin/main` | Base branch for comparison | Determines what changes to capture in recipe |
| `--recipeManifestFormat` | string | No | `yaml` | Format for manifest file | Creates either `recipe.yaml` or `recipe.json` |
| `--filePath` | string | No | - | Update single file only | Regenerates patch for one specific file |

#### Command Examples with Use Cases

```bash
# CREATE NEW: Generate recipe from all current skeleton changes
npm run cookbook -- generate --recipe my-custom-feature
# Result: Creates new recipe with all modified/new files since origin/main

# UPDATE PATCHES: Regenerate patches without touching manifest
npm run cookbook -- generate --recipe bundles --onlyFiles
# Result: Updates patches in existing recipe, preserves documentation

# CUSTOM BASE: Generate against different branch
npm run cookbook -- generate --recipe feature-x --referenceBranch origin/release-2024
# Result: Captures changes relative to release-2024 branch

# JSON FORMAT: Create recipe with JSON manifest
npm run cookbook -- generate --recipe api-integration --recipeManifestFormat json
# Result: Creates recipe.json instead of recipe.yaml

# SINGLE FILE: Update just one patch in existing recipe
npm run cookbook -- generate --recipe markets --filePath templates/skeleton/app/routes/_index.tsx
# Result: Regenerates only the _index.tsx patch file

# COMBINE: Update files against custom branch
npm run cookbook -- generate --recipe advanced --onlyFiles --referenceBranch origin/v2
# Result: Updates patches comparing to v2 branch, keeps existing manifest
```

#### Generation Workflow Examples

| Use Case | Command | What Gets Generated |
|----------|---------|-------------------|
| New feature from scratch | `generate --recipe new-feature` | Complete recipe with manifest, ingredients, patches |
| Fix broken patches only | `generate --recipe existing --onlyFiles` | Updated patch files, original manifest preserved |
| Capture experimental changes | `generate --recipe experiment --referenceBranch origin/experimental` | Recipe with changes from experimental branch |
| Update single broken patch | `generate --recipe bundles --filePath app/routes/products.$handle.tsx` | Just the products.$handle patch |
| Machine-readable format | `generate --recipe api --recipeManifestFormat json` | recipe.json instead of recipe.yaml |

---

### 3. VALIDATE Command - Test Recipe Application

Validates that recipes can be applied successfully and the resulting code compiles.

#### Options Table

| Option | Type | Required | Default | Description | Effect on Execution |
|--------|------|----------|---------|-------------|-------------------|
| `--recipe` | string | No | - | Specific recipe to validate | If omitted, validates ALL recipes |
| `--hydrogenPackagesVersion` | string | No | latest | Hydrogen version to test against | Uses specific version for dependency installation |

#### Command Examples with Use Cases

```bash
# SINGLE: Validate one recipe works correctly
npm run cookbook -- validate --recipe bundles
# Result: Applies recipe, installs deps, runs typecheck and build

# ALL: Validate every recipe in the cookbook
npm run cookbook -- validate
# Result: Tests all recipes sequentially, reports failures

# VERSION TEST: Validate against specific Hydrogen version
npm run cookbook -- validate --recipe markets --hydrogenPackagesVersion 2024.10.0
# Result: Tests recipe with Hydrogen 2024.10.0 dependencies

# CI PIPELINE: Validate all recipes with current version
npm run cookbook -- validate
# Exit code: 0 if all pass, 1 if any fail (useful for CI)

# DEBUG: Validate problematic recipe
npm run cookbook -- validate --recipe subscriptions
# Result: Shows exactly where/why recipe fails
```

#### Validation Process Stages

| Stage | What Happens | Failure Means |
|-------|--------------|---------------|
| 1. Recipe Load | Loads and parses recipe.yaml | Malformed manifest |
| 2. Apply Recipe | Copies ingredients, applies patches | Patches don't match current skeleton |
| 3. Install Deps | Runs npm install in skeleton | Missing or incompatible dependencies |
| 4. TypeCheck | Runs TypeScript compiler | Type errors in generated code |
| 5. Build | Builds the skeleton app | Runtime or compilation errors |

#### Common Validation Scenarios

| Scenario | Command | Success Criteria |
|----------|---------|------------------|
| Pre-release check | `validate` | All recipes pass all stages |
| Post-migration test | `validate --recipe bundles` | Recipe works with new skeleton structure |
| Version compatibility | `validate --hydrogenPackagesVersion 2024.7.0` | Recipe works with older Hydrogen |
| CI/CD pipeline | `validate` | Exit code 0 for deployment |

---

### 4. RENDER Command - Generate Documentation

Converts recipe manifest into human-readable documentation.

#### Options Table

| Option | Type | Required | Default | Description | Effect on Execution |
|--------|------|----------|---------|-------------|-------------------|
| `--recipe` | string | Yes | - | Recipe to document | Selects which recipe to render |
| `--format` | string | Yes | - | Output format (`github` or `shopify.dev`) | Changes markdown syntax and formatting |

#### Command Examples with Use Cases

```bash
# GITHUB: Generate GitHub-flavored markdown
npm run cookbook -- render --recipe bundles --format github
# Result: Creates README.md with GitHub syntax, collapsible sections

# SHOPIFY DOCS: Generate for shopify.dev
npm run cookbook -- render --recipe markets --format shopify.dev
# Result: Creates README.md with Shopify documentation standards

# UPDATE DOCS: Regenerate after manifest changes
npm run cookbook -- render --recipe subscriptions --format github
# Result: Overwrites README.md with latest manifest content

# BATCH RENDER: Document all recipes (use with shell loop)
for recipe in bundles markets subscriptions; do
  npm run cookbook -- render --recipe $recipe --format github
done
# Result: Updates documentation for multiple recipes
```

#### Format Differences

| Feature | GitHub Format | Shopify.dev Format |
|---------|--------------|-------------------|
| Code blocks | ` ```typescript ` | `{% codeblock language="typescript" %}` |
| Collapsible sections | `<details><summary>` | Custom components |
| Links | Standard markdown | Shopify doc links |
| Images | GitHub URLs | Shopify CDN URLs |
| Syntax highlighting | GitHub native | Prism.js compatible |

---

### 5. REGENERATE Command - Full Recipe Refresh

Applies recipe, regenerates from changes, and renders documentation in one command.

#### Options Table

| Option | Type | Required | Default | Description | Effect on Execution |
|--------|------|----------|---------|-------------|-------------------|
| `--recipe` | string | No | - | Specific recipe to regenerate | If omitted, regenerates ALL recipes |
| `--onlyFiles` | boolean | No | false | Skip manifest regeneration | Preserves recipe.yaml, updates patches only |
| `--format` | string | Yes | - | Documentation format | `github` or `shopify.dev` for README |
| `--referenceBranch` | string | No | `origin/main` | Base branch for patches | Changes comparison point |

#### Command Examples with Use Cases

```bash
# SINGLE FULL: Complete regeneration of one recipe
npm run cookbook -- regenerate --recipe bundles --format github
# Result: Applies, regenerates patches/manifest, creates README

# PATCHES ONLY: Update patches keeping documentation
npm run cookbook -- regenerate --recipe markets --onlyFiles --format github
# Result: New patches, original manifest, updated README

# ALL RECIPES: Regenerate entire cookbook
npm run cookbook -- regenerate --format github
# Result: All recipes updated with current skeleton

# CUSTOM BASE: Regenerate against different branch
npm run cookbook -- regenerate --recipe subscriptions --format shopify.dev --referenceBranch origin/stable
# Result: Patches relative to stable branch

# MIGRATION: Update all after skeleton changes
npm run cookbook -- regenerate --format github --referenceBranch origin/pre-migration
# Result: All recipes updated for post-migration skeleton
```

#### Regenerate Workflow Stages

| Stage | Action | Options Affecting |
|-------|--------|------------------|
| 1. Apply | Applies recipe to skeleton | `--recipe` |
| 2. Generate | Creates new patches/manifest | `--onlyFiles`, `--referenceBranch` |
| 3. Render | Produces documentation | `--format` |
| 4. Cleanup | Resets skeleton state | Automatic |

#### Common Regeneration Scenarios

| Scenario | Command | Purpose |
|----------|---------|---------|
| Post-skeleton update | `regenerate --format github` | Fix all recipes after skeleton changes |
| Single recipe refresh | `regenerate --recipe bundles --format github` | Update one broken recipe |
| Patch-only update | `regenerate --onlyFiles --format github` | Fix patches, keep documentation |
| Documentation update | `regenerate --recipe markets --format shopify.dev` | Switch documentation format |
| Branch migration | `regenerate --referenceBranch origin/v2 --format github` | Move recipes to new base |

---

### 6. UPDATE Command - Interactive Recipe Fixing

Updates recipes when skeleton changes cause conflicts, with interactive resolution.

#### Options Table

| Option | Type | Required | Default | Description | Effect on Execution |
|--------|------|----------|---------|-------------|-------------------|
| `--recipe` | string | Yes | - | Recipe to update | Selects which recipe to fix |
| `--referenceBranch` | string | No | `origin/main` | New base for patches | Determines target state |

#### Command Examples with Use Cases

```bash
# BASIC UPDATE: Fix recipe after skeleton changes
npm run cookbook -- update --recipe bundles
# Result: Attempts apply, prompts for conflict resolution, regenerates

# BRANCH MIGRATION: Update recipe for new base
npm run cookbook -- update --recipe markets --referenceBranch origin/v2025
# Result: Migrates recipe to work with v2025 branch

# CONFLICT RESOLUTION: Handle merge conflicts
npm run cookbook -- update --recipe subscriptions
# Interactive: Shows conflicts, asks for resolution strategy

# POST-MIGRATION: Fix after React Router update
npm run cookbook -- update --recipe combined-listings
# Result: Updates imports, types, and patterns for new structure
```

#### Update Process Flow

| Step | What Happens | User Action Required |
|------|--------------|---------------------|
| 1. Attempt Apply | Tries to apply current patches | None |
| 2. Conflict Detection | Identifies failing patches | None |
| 3. Interactive Resolution | Shows conflicts | Choose resolution strategy |
| 4. Manual Fix | Opens editor if needed | Fix conflicts manually |
| 5. Regenerate | Creates new patches | Confirm changes |
| 6. Validate | Tests updated recipe | None |

#### Conflict Resolution Options

| Option | When to Use | What Happens |
|--------|------------|--------------|
| Skip patch | Change no longer needed | Removes patch from recipe |
| Manual fix | Complex conflict | Opens editor for resolution |
| Auto-merge | Simple conflicts | Attempts 3-way merge |
| Abort | Too complex | Cancels update process |

---

### 7. SCHEMA Command - Regenerate JSON Schema

Regenerates the JSON schema for recipe validation from TypeScript types.

#### Options Table

| Option | Type | Required | Default | Description | Effect on Execution |
|--------|------|----------|---------|-------------|-------------------|
| `--help` | boolean | No | false | Show help | Displays usage |
| `--version` | boolean | No | false | Show version | Displays version |

#### Command Examples with Use Cases

```bash
# REGENERATE: Update schema after type changes
npm run cookbook -- schema
# Result: Creates/updates recipe.schema.json from TypeScript definitions

# VERIFY: Check schema generation works
npm run cookbook -- schema
# Success: New recipe.schema.json created
# Failure: TypeScript compilation errors
```

---

## Complete Option Combination Matrix

### Most Useful Command Combinations

| Goal | Command | Why This Combination |
|------|---------|---------------------|
| Create new recipe from current work | `generate --recipe feature-name` | Captures all changes with default settings |
| Fix broken recipe patches only | `generate --recipe name --onlyFiles` | Preserves documentation, updates patches |
| Test all recipes work | `validate` | Comprehensive test of entire cookbook |
| Update everything after skeleton change | `regenerate --format github` | Complete cookbook refresh |
| Fix one broken recipe interactively | `update --recipe name` | Guided conflict resolution |
| Update single file in recipe | `generate --recipe name --filePath path/to/file` | Surgical patch update |
| Test recipe with older Hydrogen | `validate --recipe name --hydrogenPackagesVersion 2024.7.0` | Version compatibility check |
| Migrate recipes to new branch | `regenerate --format github --referenceBranch origin/new-base` | Branch migration |
| Create machine-readable recipe | `generate --recipe name --recipeManifestFormat json` | For tooling integration |
| Document for Shopify.dev | `render --recipe name --format shopify.dev` | Official documentation |

---

## How Recipes Work

### 1. Generation Workflow (`npm run cookbook -- generate`)

**Purpose**: Create a recipe from current changes to the skeleton template.

**Process**:
1. Parse Git status to identify modified, new, and deleted files
2. Copy new files to `ingredients/` directory
3. Generate Git patches for modified files using `git diff`
4. Create patch files with hash-based naming
5. Build recipe manifest with steps and ingredients
6. Generate LLM prompt files

**Key Code** (`src/lib/generate.ts`):
```typescript
// Create patch from modified file
const diff = execSync(`git diff '${fullPath}'`, {encoding: 'utf-8'});
const changes = diff.toString().split('\n').slice(1).join('\n');
const sha = createHash('sha256').update(fullPath).digest('hex');
const patchFilename = `${path.basename(fullPath)}.${sha.slice(0, 6)}.patch`;
```

### 2. Application Workflow (`npm run cookbook -- apply`)

**Purpose**: Apply a recipe's changes to the skeleton template.

**Process**:
1. Load recipe manifest from `recipe.yaml`
2. Verify skeleton has no uncommitted changes
3. Delete files listed in `deletedFiles`
4. Copy all ingredients to skeleton preserving paths
5. Apply patches using system `patch` command
6. Result: Modified skeleton with recipe applied

**Key Code** (`src/lib/apply.ts`):
```typescript
// Apply patch to file
for (const diff of step.diffs) {
  const patchPath = path.join(recipeDir, 'patches', diff.patchFile);
  const destPath = path.join(TEMPLATE_PATH, diff.file);
  execSync(`patch '${destPath}' '${patchPath}'`, {stdio: 'inherit'});
}
```

### 3. Validation Workflow (`npm run cookbook -- validate`)

**Purpose**: Ensure a recipe can be successfully applied and builds.

**Process**:
1. Apply the recipe to skeleton
2. Install dependencies
3. Run TypeScript type checking
4. Build the template
5. Report success or failure

### 4. Update Workflow (`npm run cookbook -- update`)

**Purpose**: Update patches when skeleton template changes.

**Process**:
1. Attempt to apply existing patches
2. If conflicts occur, prompt for resolution
3. Regenerate patches from resolved state
4. Update recipe manifest

## Critical Implementation Details

### Path Management

The system uses absolute paths internally but stores relative paths in manifests:

```typescript
// Key path constants (src/lib/constants.ts)
REPO_ROOT = // Repository root
COOKBOOK_PATH = path.join(REPO_ROOT, 'cookbook')
TEMPLATE_PATH = path.join(REPO_ROOT, 'templates/skeleton')
TEMPLATE_DIRECTORY = 'templates/skeleton'
```

### Patch Format

Patches use standard Git diff format without the header:
```diff
index 543e76be..0e600164 100644
--- a/templates/skeleton/app/routes/_index.tsx
+++ b/templates/skeleton/app/routes/_index.tsx
@@ -1,5 +1,5 @@
-import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
+import {Await, useLoaderData} from 'react-router';
```

### Step Types

Recipes support three step types:

1. **INFO**: Documentation-only steps
2. **NEW_FILE**: Add new files from ingredients
3. **PATCH**: Apply patches to existing files

### Hash-Based Naming

Patch files use first 6 characters of SHA-256 hash of the file path to avoid collisions while keeping names readable.

## Why Recipes Break After Skeleton Changes

### Root Cause Analysis

1. **Import Changes**: React Router 7.8.x migration changed imports
   - Before: `import {type LoaderFunctionArgs} from '@shopify/remix-oxygen'`
   - After: `import type {Route} from './+types/_index'`

2. **Type Changes**: Function signatures changed
   - Before: `export async function loader(args: LoaderFunctionArgs)`
   - After: `export async function loader(args: Route.LoaderArgs)`

3. **Context Mismatch**: Patches expect specific surrounding lines that no longer exist

4. **Line Number Shifts**: Even small changes can cause patches to fail if line numbers don't align

### Failure Example

When running `npm run cookbook -- validate --recipe bundles`:
```
patching file '.../app/routes/_index.tsx'
1 out of 2 hunks failed--saving rejects to '.../app/routes/_index.tsx.rej'
```

The patch expects the old import structure but finds the new React Router 7.8.x imports.

## Recovery Strategies

### 1. Regenerate Recipes (Recommended)

1. Apply recipe changes manually to the new skeleton
2. Run `npm run cookbook -- generate --recipe {name}`
3. This creates new patches compatible with current skeleton

### 2. Update Existing Recipes

1. Run `npm run cookbook -- update --recipe {name}`
2. Resolve conflicts interactively
3. System regenerates patches

### 3. Batch Regeneration

For all recipes:
```bash
npm run cookbook -- regenerate --format github
```

## Workflow Best Practices

### Creating a New Recipe

1. Start with clean skeleton: `git status` shows no changes
2. Make desired modifications to skeleton
3. Add `@description` comments to explain changes
4. Generate recipe: `npm run cookbook -- generate --recipe my-feature`
5. Edit `recipe.yaml` to improve documentation
6. Validate: `npm run cookbook -- validate --recipe my-feature`
7. Render docs: `npm run cookbook -- render --recipe my-feature --format github`

### Maintaining Recipes After Skeleton Updates

1. After skeleton changes, validate all recipes:
   ```bash
   npm run cookbook -- validate
   ```

2. For each failing recipe:
   - Option A: Manually reapply changes and regenerate
   - Option B: Use update command to resolve conflicts

3. Test each updated recipe thoroughly

4. Commit updated patches and manifests

### Testing Recipe Changes

1. Always validate after generation
2. Test in fresh environment
3. Verify TypeScript compilation
4. Check build output
5. Test runtime behavior

## Troubleshooting Guide

### Common Issues

1. **"Template folder has uncommitted changes"**
   - Solution: Commit or stash skeleton changes before applying recipes

2. **"Ingredients do not match"**
   - Cause: Mismatch between manifest and actual files
   - Solution: Regenerate the recipe

3. **"X out of Y hunks failed"**
   - Cause: Skeleton changed, patches outdated
   - Solution: Update or regenerate recipe

4. **TypeScript errors after applying**
   - Cause: Recipe not updated for new types
   - Solution: Fix types manually, then regenerate

### Debugging Commands

```bash
# Check what changed in skeleton
git diff origin/main templates/skeleton/

# See why patch fails
patch --dry-run templates/skeleton/[file] cookbook/recipes/[recipe]/patches/[patch]

# Compare recipe expectations
diff -u cookbook/recipes/[recipe]/ingredients/[file] templates/skeleton/[file]
```

## Migration Path for React Router 7.8.x

To fix all cookbook recipes for React Router 7.8.x:

1. **Inventory Impact**: List all files modified by migration
2. **Manual Application**: For each recipe:
   - Apply changes manually to new skeleton
   - Account for new import patterns
   - Update type definitions
3. **Regenerate**: Run generate command for each recipe
4. **Validate**: Ensure all recipes pass validation
5. **Document**: Update recipe descriptions for new patterns

### Specific Migration Commands

```bash
# Step 1: Test current state
npm run cookbook -- validate
# Note which recipes fail

# Step 2: For each broken recipe, update it
npm run cookbook -- update --recipe bundles
npm run cookbook -- update --recipe markets
npm run cookbook -- update --recipe subscriptions
npm run cookbook -- update --recipe combined-listings

# Step 3: Or regenerate all at once
npm run cookbook -- regenerate --format github

# Step 4: Validate everything works
npm run cookbook -- validate

# Step 5: Commit the updates
git add cookbook/recipes/
git commit -m "fix: update cookbook recipes for React Router 7.8.x"
```

## Architecture Decisions

### Why Git Patches?

- **Precision**: Exact line-by-line modifications
- **Versioning**: Clear history of changes
- **Conflict Detection**: Fails safely when context changes
- **Standard Format**: Uses Unix patch utility

### Why Separate Ingredients?

- **Clarity**: New files are complete and readable
- **Simplicity**: No need to patch from empty
- **Organization**: Clear separation of new vs modified

### Why Hash-Based Naming?

- **Uniqueness**: Avoids naming collisions
- **Traceability**: Can identify source file
- **Stability**: Name doesn't change with content

## Future Improvements

### Potential Enhancements

1. **Automated Migration**: Tool to update patches for skeleton changes
2. **Fuzzy Patching**: More tolerant of minor context changes
3. **Dependency Resolution**: Handle recipe dependencies
4. **Version Compatibility**: Support multiple skeleton versions
5. **Rollback Support**: Undo recipe application
6. **Composition**: Apply multiple recipes together

### Known Limitations

1. **Binary Files**: Limited support for images/assets
2. **Merge Conflicts**: No automatic resolution
3. **Order Dependency**: Some recipes may need specific order
4. **Partial Application**: All-or-nothing approach
5. **Testing**: No integrated test runner for recipes

## Quick Reference Card

### Most Common Commands

```bash
# Create new recipe
generate --recipe my-feature

# Fix broken recipe
update --recipe my-feature
# OR
generate --recipe my-feature --onlyFiles

# Test recipe
validate --recipe my-feature

# Test everything
validate

# Fix everything
regenerate --format github

# Update docs
render --recipe my-feature --format github
```

### Emergency Recovery

```bash
# When everything is broken after skeleton update:

# 1. Clean skeleton
git checkout -- templates/skeleton/
git clean -fd templates/skeleton/

# 2. Regenerate all recipes
npm run cookbook -- regenerate --format github

# 3. Validate
npm run cookbook -- validate

# 4. Commit fixes
git add cookbook/recipes/
git commit -m "fix: update recipes for skeleton changes"
```

## Conclusion

The Hydrogen Cookbook provides a powerful system for managing skeleton template modifications, but requires maintenance when the underlying skeleton changes significantly. The React Router 7.8.x migration broke existing recipes because patches are context-sensitive and the migration changed imports, types, and file structure throughout the skeleton.

Recovery requires regenerating recipes against the new skeleton structure. This document provides the complete technical foundation for understanding, maintaining, and extending the cookbook system, with comprehensive command examples for every use case.