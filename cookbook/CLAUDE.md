# Cookbook System

The Hydrogen Cookbook transforms the skeleton template into specific scenarios through reproducible recipes.

**IMPORTANT: This file provides quick reference and common patterns. For comprehensive command documentation, implementation details, and additional context, read `cookbook/README.md`.**

## Quick Reference

```bash
pnpm run cookbook -- validate                    # Validate all recipes
pnpm run cookbook -- validate --recipe {name}    # Validate one recipe
pnpm run cookbook -- apply --recipe {name}       # Apply recipe to skeleton
pnpm run cookbook -- generate --recipe {name}    # Generate recipe from changes
pnpm run cookbook -- render                      # Render all documentation
```

## IMPORTANT: Critical Rules

**YOU MUST validate before committing:**
```bash
pnpm run cookbook -- validate --recipe {name}
```

**Recipe requirements:**
- Step values are quoted strings: `step: "1"` not `step: 1` (YAML coerces unquoted integers to numbers, but the Zod schema expects strings)
- Every step has a description (non-null, non-empty)
- Step names are unique within the same step number
- All referenced patch/ingredient files exist
- README.md exists and is up-to-date
- LLM prompt file exists at `llms/{recipe-name}.prompt.md`

**After modifying recipe.yaml, regenerate docs:**
```bash
pnpm run cookbook -- render --recipe {name}
```

## Common Errors

### Unquoted Step Numbers
```
❌ recipe.yaml:52  steps.0.step  RecipeSchema: Invalid input: expected string, received number (actual value: 1)
```
**Fix**: Quote step numbers so YAML preserves them as strings:
```diff
- step: 1
+ step: "1"
```

### Outdated README
```
❌ README.md  validateReadmeExists: README.md not found
```
**Fix**: Regenerate documentation:
```bash
pnpm run cookbook -- render --recipe {name}
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

- Step values: Quoted strings (`step: "1"`) — unquoted integers fail Zod validation
- Step names: Unique within same step number, kebab-case for file paths
- Descriptions: Non-null, non-empty strings explaining what the step does
- Comments: Use `@description` in code to explain why, not what
- Naming: Follow existing recipe patterns (kebab-case)

## Testing

```bash
# Run all cookbook tests
pnpm test

# Run validation tests only
pnpm test -- validate.test.ts

# Full validation pipeline (what CI runs)
pnpm run cookbook -- validate --recipe {name}
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
pnpm run cookbook -- apply --recipe infinite-scroll
```

**Options:**
- `--recipe` (required): Recipe name

**Result**: Skeleton template modified with all recipe changes

---

### generate

Generate recipe from skeleton template changes.

```bash
# Generate from all changes
pnpm run cookbook -- generate --recipe my-feature

# Generate from specific file only
pnpm run cookbook -- generate --recipe my-feature --filePath app/routes/products.tsx

# Generate against different branch
pnpm run cookbook -- generate --recipe hotfix --referenceBranch origin/2025-01
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
pnpm run cookbook -- validate

# Validate single recipe
pnpm run cookbook -- validate --recipe infinite-scroll

# Validate against specific Hydrogen version
pnpm run cookbook -- validate --recipe my-recipe --hydrogenPackagesVersion 2025.1.0
```

**Options:**
- `--recipe`: Recipe name (validates all if omitted)
- `--hydrogenPackagesVersion`: Specific version to test against

**Pipeline:**
1. Schema validation → Verifies recipe.yaml
2. Recipe application → Applies to skeleton
3. Dependency installation → pnpm install
4. TypeScript check → Verifies types
5. Build → Ensures project builds
6. Cleanup → Resets skeleton

**Error format:**
```
❌ Recipe 'gtm' - 5 error(s):

recipe.yaml:52      steps.0.step                  RecipeSchema: Invalid input: expected string, received number (actual value: 1)
                    README.md                     validateReadmeExists: README.md not found. Run: pnpm run cookbook render gtm
```

---

### render

Generate README documentation from recipe.yaml.

```bash
# Render all recipes (GitHub format)
pnpm run cookbook -- render

# Render single recipe for shopify.dev
pnpm run cookbook -- render --recipe infinite-scroll --format shopify.dev
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
pnpm run cookbook -- regenerate --recipe infinite-scroll --format github

# Regenerate all recipes
pnpm run cookbook -- regenerate --format github

# Regenerate files only (preserve manual recipe.yaml edits)
pnpm run cookbook -- regenerate --recipe my-recipe --onlyFiles --format github
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
pnpm run cookbook -- update --recipe infinite-scroll

# Update against specific branch
pnpm run cookbook -- update --recipe legacy-feature --referenceBranch origin/2024-12
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
pnpm run cookbook -- schema
```

**Result**: Updated recipe.schema.json

---

## Common Workflows

```bash
# New recipe development
pnpm run cookbook -- generate --recipe my-feature
pnpm run cookbook -- validate --recipe my-feature
pnpm run cookbook -- render --recipe my-feature

# Recipe maintenance
pnpm run cookbook -- update --recipe existing-feature
pnpm run cookbook -- validate --recipe existing-feature

# Bulk operations
pnpm run cookbook -- validate
pnpm run cookbook -- render
pnpm run cookbook -- regenerate --format github
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
  - step: "1"  # IMPORTANT: Quoted string, not bare integer
    type: PATCH
    name: 'app/root.tsx'
    description: 'What this step does'  # IMPORTANT: Required, non-null
    diffs:
      - file: 'app/root.tsx'
        patchFile: 'root.tsx.abc123.patch'
```

## Repository Etiquette

**Before committing recipes:**
1. Run validation: `pnpm run cookbook -- validate --recipe {name}`
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
