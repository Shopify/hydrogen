# Cookbook System

The Hydrogen Cookbook transforms the skeleton template into specific scenarios through reproducible recipes.

**IMPORTANT: This file provides quick reference and common patterns. For comprehensive command documentation, implementation details, and additional context, read `cookbook/README.md`.**

## Quick Reference

```bash
npm run cookbook -- validate                    # Validate all recipes
npm run cookbook -- validate --recipe {name}    # Validate one recipe
npm run cookbook -- apply --recipe {name}       # Apply recipe to skeleton
npm run cookbook -- generate --recipe {name}    # Generate recipe from changes
npm run cookbook -- render                      # Render all documentation
```

## IMPORTANT: Critical Rules

**YOU MUST validate before committing:**
```bash
npm run cookbook -- validate --recipe {name}
```

**Recipe requirements:**
- Step numbers are numeric: `step: 1` not `step: "1"`
- Every step has a description (non-null, non-empty)
- Step names are unique within the same step number
- All referenced patch/ingredient files exist
- README.md exists and is up-to-date
- LLM prompt file exists at `llms/{recipe-name}.prompt.md`

**After modifying recipe.yaml, regenerate docs:**
```bash
npm run cookbook -- render --recipe {name}
```

## Common Errors

### String Step Numbers
```
❌ recipe.yaml:52  steps.0.step  RecipeSchema: Expected number, received string (actual value: "1")
```
**Fix**: Remove quotes from step numbers:
```diff
- step: "1"
+ step: 1
```

### Outdated README
```
❌ README.md  validateReadmeExists: README.md not found
```
**Fix**: Regenerate documentation:
```bash
npm run cookbook -- render --recipe {name}
```

### Orphaned Files
```
❌ patches/old-file.patch  validatePatchFiles: Orphaned patch file not referenced in recipe
```
**Fix**: Remove file or add reference to recipe.yaml

### Null Descriptions
```
❌ recipe.yaml:65  steps.2.description  validateStepDescriptions: Step 2 has null description
```
**Fix**: Add description to step in recipe.yaml

## Code Style

- Step numbers: Numeric values only (`step: 1`)
- Step names: Unique within same step number, kebab-case for file paths
- Descriptions: Non-null, non-empty strings explaining what the step does
- Comments: Use `@description` in code to explain why, not what
- Naming: Follow existing recipe patterns (kebab-case)

## Testing

```bash
# Run all cookbook tests
npm test

# Run validation tests only
npm test -- validate.test.ts

# Full validation pipeline (what CI runs)
npm run cookbook -- validate --recipe {name}
```

## Architecture

**Four key concepts:**
- **Recipe**: Reproducible sequence of steps applied to skeleton template
- **Ingredients**: New files introduced by the recipe
- **Patches**: Modifications to existing skeleton files
- **LLM Prompts**: AI-assisted coding prompts paired with recipes

**File structure:**
```
cookbook/
├── src/
│   ├── commands/          # Command implementations
│   ├── lib/               # Core functionality (validate.ts, generate.ts, etc.)
│   └── index.ts           # CLI entry point
├── recipes/{recipe-name}/
│   ├── recipe.yaml        # Machine-readable definition
│   ├── ingredients/       # New files to add
│   ├── patches/           # File modifications
│   └── README.md          # Generated documentation
├── llms/{recipe-name}.prompt.md  # LLM prompts
└── recipe.schema.json     # JSON schema for validation
```

## Commands

### apply

Apply recipe to skeleton template.

```bash
npm run cookbook -- apply --recipe infinite-scroll
```

**Options:**
- `--recipe` (required): Recipe name

**Result**: Skeleton template modified with all recipe changes

---

### generate

Generate recipe from skeleton template changes.

```bash
# Generate from all changes
npm run cookbook -- generate --recipe my-feature

# Generate from specific file only
npm run cookbook -- generate --recipe my-feature --filePath app/routes/products.tsx

# Generate against different branch
npm run cookbook -- generate --recipe hotfix --referenceBranch origin/2025-01
```

**Options:**
- `--recipe` (required): Recipe name
- `--filePath`: Generate patch for single file only
- `--onlyFiles`: Skip recipe.yaml generation
- `--referenceBranch`: Branch to compare against (default: "origin/main")
- `--recipeManifestFormat`: yaml or json (default: "yaml")

**Result**: Recipe folder with recipe.yaml, ingredients/, patches/, README.md

**Process:**
1. Detects changes vs reference branch
2. New files → ingredients/
3. Modified files → patches/
4. Deleted files → marked for deletion
5. Extracts dependencies from package.json
6. Validates generated recipe

---

### validate

Validate recipe integrity and functionality.

```bash
# Validate all recipes
npm run cookbook -- validate

# Validate single recipe
npm run cookbook -- validate --recipe infinite-scroll

# Validate against specific Hydrogen version
npm run cookbook -- validate --recipe my-recipe --hydrogenPackagesVersion 2025.1.0
```

**Options:**
- `--recipe`: Recipe name (validates all if omitted)
- `--hydrogenPackagesVersion`: Specific version to test against

**Pipeline:**
1. Schema validation → Verifies recipe.yaml
2. Recipe application → Applies to skeleton
3. Dependency installation → npm install
4. TypeScript check → Verifies types
5. Build → Ensures project builds
6. Cleanup → Resets skeleton

**Error format:**
```
❌ Recipe 'gtm' - 5 error(s):

recipe.yaml:52      steps.0.step                  RecipeSchema: Expected number, received string (actual value: "1")
                    README.md                     validateReadmeExists: README.md not found. Run: npm run cookbook render gtm
```

---

### render

Generate README documentation from recipe.yaml.

```bash
# Render all recipes (GitHub format)
npm run cookbook -- render

# Render single recipe for shopify.dev
npm run cookbook -- render --recipe infinite-scroll --format shopify.dev
```

**Options:**
- `--recipe`: Recipe name (renders all if omitted)
- `--format`: "github" or "shopify.dev" (default: "github")

**Result**: README.md or README.shopify.md in recipe folders

**Formats:**
- **github**: Collapsible sections, emoji, GitHub-flavored Markdown
- **shopify.dev**: Platform-specific syntax and formatting

---

### regenerate

Complete refresh: apply → generate → render.

```bash
# Regenerate single recipe
npm run cookbook -- regenerate --recipe infinite-scroll --format github

# Regenerate all recipes
npm run cookbook -- regenerate --format github

# Regenerate files only (preserve manual recipe.yaml edits)
npm run cookbook -- regenerate --recipe my-recipe --onlyFiles --format github
```

**Options:**
- `--recipe`: Recipe name (regenerates all if omitted)
- `--format` (required): Documentation format
- `--onlyFiles`: Regenerate ingredients/patches only
- `--referenceBranch`: Reference for generation (default: "origin/main")

**Use when**: Cookbook tooling updates or skeleton template changes

---

### update

Update recipe to remain compatible with latest main branch.

```bash
# Update recipe to latest main
npm run cookbook -- update --recipe infinite-scroll

# Update against specific branch
npm run cookbook -- update --recipe legacy-feature --referenceBranch origin/2024-12
```

**Options:**
- `--recipe` (required): Recipe name
- `--referenceBranch`: Target branch (default: "origin/main")
- `--recipeManifestFormat`: yaml or json (default: "yaml")

**Process:**
1. Checkout recipe's original commit
2. Apply recipe to historical state
3. Create temporary update branch
4. Merge target branch (interactive if conflicts)
5. Regenerate recipe from merged state
6. Cleanup temporary branches

**Conflict resolution**: Process pauses if merge fails. Resolve conflicts in your editor, confirm when prompted, then process continues.

---

### schema

Generate JSON schema from Zod definitions for recipe.yaml validation and IDE support.

```bash
npm run cookbook -- schema
```

**Result**: Updated recipe.schema.json

---

## Common Workflows

```bash
# New recipe development
npm run cookbook -- generate --recipe my-feature
npm run cookbook -- validate --recipe my-feature
npm run cookbook -- render --recipe my-feature

# Recipe maintenance
npm run cookbook -- update --recipe existing-feature
npm run cookbook -- validate --recipe existing-feature

# Bulk operations
npm run cookbook -- validate
npm run cookbook -- render
npm run cookbook -- regenerate --format github
```

## Recipe YAML Structure

```yaml
gid: 'uuid-v4-identifier'
title: 'Recipe Display Name'
summary: 'Brief description'
description: 'Detailed explanation'
commit: 'git-sha-hash'
ingredients:
  - path: 'templates/skeleton/app/components/NewFile.tsx'
    description: 'Component description'
steps:
  - step: 1  # IMPORTANT: Numeric, not string
    type: PATCH
    name: 'app/root.tsx'
    description: 'What this step does'  # IMPORTANT: Required, non-null
    diffs:
      - file: 'app/root.tsx'
        patchFile: 'root.tsx.abc123.patch'
```

## Repository Etiquette

**Before committing recipes:**
1. Run validation: `npm run cookbook -- validate --recipe {name}`
2. Fix all errors before pushing
3. Include recipe changes in PR descriptions
4. Update LLM prompts when recipe logic changes

**Commit messages:**
- Format: `feat(cookbook): add {recipe-name} recipe`
- Include what the recipe does and why it's useful

## Integration Notes

- Recipes guide development in any Hydrogen project
- Template scaffolding: Apply recipes to skeleton for new projects
- Feature implementation: Use recipes as implementation guides
- Pattern reference: Demonstrate best practices for specific scenarios
- Update recipes when skeleton template changes significantly
- New Hydrogen features need new recipes
- Recipe validation ensures compatibility with current Hydrogen versions
