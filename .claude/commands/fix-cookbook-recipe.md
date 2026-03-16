# Fix Cookbook Recipe Validation Failures

You are a cookbook recipe maintenance assistant for the Hydrogen project. Your task is to fix recipe validation failures caused by skeleton template changes (e.g., line number drift in patches). You must NOT modify the skeleton template — only update recipe patches and ingredients.

## Arguments

- `$ARGUMENTS`: Recipe name(s) to fix. Can be a single recipe (e.g., `b2b`), multiple space-separated recipes (e.g., `b2b bundles`), or `all` to fix every recipe in `cookbook/recipes/`.

## Context

The cookbook system applies patches to the skeleton template (`templates/skeleton/`) to create specific scenarios. When the skeleton template changes (new features, refactoring, line number shifts), patches can become stale and fail validation. The most common failure is **patch offset/fuzz** — the patch content is correct but line numbers no longer match.

**Key paths:**
- Cookbook CLI: `cookbook/src/index.ts` (run from `cookbook/` directory)
- Recipes: `cookbook/recipes/{name}/`
- Skeleton template: `templates/skeleton/`
- Patch files: `cookbook/recipes/{name}/patches/*.patch`
- Ingredient files: `cookbook/recipes/{name}/ingredients/`

## Phase 1: Validate and Identify Failures

### 1. Run validation for the target recipe(s)

```bash
cd cookbook
SHOPIFY_HYDROGEN_FLAG_LOCKFILE_CHECK=false npx ts-node src/index.ts validate --recipe {name}
```

If `$ARGUMENTS` is `all`, run without `--recipe` to validate everything:
```bash
SHOPIFY_HYDROGEN_FLAG_LOCKFILE_CHECK=false npx ts-node src/index.ts validate
```

### 2. Classify the validation output

Check the output for these failure categories:

**Category A — Patch offset/fuzz (.orig files created):**
```
⚠️  Backup file created: somefile.orig
❌ PATCH CONFLICTS DETECTED!
```
This means the patch applied successfully but with line number offsets. The fix is to regenerate the patch with correct line numbers. This is the most common issue.

**Category B — Patch rejection (.rej files created):**
```
⚠️  Rejected hunks file created: somefile.rej
```
This means the patch content no longer matches the skeleton file. The fix requires manually applying the intended changes and regenerating the patch. Read the `.rej` file and the current skeleton file to understand what changed.

**Category C — Schema/structural errors:**
```
❌ recipe.yaml:52  steps.0.step  RecipeSchema: Expected number, received string
```
These are recipe.yaml issues (string step numbers, missing descriptions, etc.). Fix directly in `recipe.yaml`.

**Category D — npm install / typecheck / build failures:**
These occur after patches apply. They may indicate the recipe's code changes are incompatible with the current skeleton. Requires deeper investigation of the recipe's intended changes.

**Category E — Missing files:**
```
❌ README.md  validateReadmeExists: README.md not found
❌ LLM prompt  validateLlmPromptExists: LLM prompt not found
```
Fix by running `npm run cookbook -- render --recipe {name}` for README, or creating the LLM prompt file.

### 3. If validation passes with no errors, skip to Phase 4

## Phase 2: Fix Patch Conflicts (Categories A and B)

This is the core fix workflow. The strategy: let patches apply (even with offsets), then regenerate from `git diff`.

### 1. Ensure skeleton is clean

```bash
cd templates/skeleton
git checkout -- .
# Remove any leftover ingredient files from previous runs
rm -f {any ingredient files listed in recipe.yaml}
```

### 2. Apply the recipe (ignore the error)

```bash
cd cookbook
npx ts-node src/index.ts apply --recipe {name} 2>&1
```

The command will fail with "PATCH CONFLICTS DETECTED" if there are `.orig` files, but the patches DO apply (just with offsets). That's exactly what we want.

**If patches create `.rej` files** (Category B): The patch could not be applied at all. You must:
1. Read the `.rej` file to see the intended changes
2. Read the current skeleton file
3. Manually apply the intended changes to the skeleton file
4. Continue with step 3 below

### 3. Remove .orig and .rej files

```bash
cd templates/skeleton
rm -f **/*.orig **/*.rej
```

### 4. Regenerate patches from git diff

For each file that had a conflicting patch (showed `.orig` or `.rej`):

```bash
cd /path/to/hydrogen/root
git diff templates/skeleton/{file-path}
```

### 5. Write the regenerated patches

Take the `git diff` output (starting with `index ...`) and write it to the corresponding patch file in `cookbook/recipes/{name}/patches/`. The patch filename is referenced in `recipe.yaml` — match the existing filename exactly.

**Important**: The patch file format starts with the `index` line, NOT `diff --git`. Strip the `diff --git a/... b/...` line from the git diff output.

### 6. Reset the skeleton

```bash
cd templates/skeleton
git checkout -- .
rm -f {any ingredient files copied during apply}
```

### 7. Handle multiple conflicting patches

If multiple patches had conflicts, regenerate ALL of them before resetting. Run all `git diff` commands while the recipe is still applied, then write all patches, then reset once.

## Phase 3: Fix Other Issues

### Schema errors (Category C)
Edit `recipe.yaml` directly:
- Step numbers must be numeric: `step: 1` not `step: "1"`
- Every step needs a non-null `description`
- Step names must be unique within the same step number

### Build/typecheck failures (Category D)
1. Apply the recipe and examine the error output
2. Check if ingredient files need updates for new skeleton APIs
3. Check if GraphQL fragments changed in the skeleton
4. Update ingredients or patches as needed

### Missing files (Category E)
```bash
# Regenerate README
cd cookbook
npx ts-node src/index.ts render --recipe {name}

# For missing LLM prompts, check if other recipes have them as reference
ls llms/
```

## Phase 4: Re-validate

Run validation again to confirm the fix:

```bash
cd cookbook
SHOPIFY_HYDROGEN_FLAG_LOCKFILE_CHECK=false npx ts-node src/index.ts validate --recipe {name}
```

**Expected success output:**
```
✅ Recipe '{name}' is valid (XXXXms)
😋 All recipes are valid
```

If validation still fails, repeat from Phase 2 for remaining issues.

## Phase 5: Handle Multiple Recipes

When `$ARGUMENTS` contains multiple recipes or `all`:

1. Run validation for all target recipes first to get a complete picture
2. Fix recipes one at a time, in order
3. Always reset the skeleton between recipes
4. Re-validate each recipe individually after fixing
5. Do a final full validation pass at the end

## Exit Conditions

Stop and ask the user if:
- A patch `.rej` file shows the recipe's intended changes fundamentally conflict with the current skeleton (not just line offsets)
- Build/typecheck failures suggest the recipe needs architectural changes
- The recipe depends on Storefront API fields that may have changed

## DO/DON'T Rules

### DO:
- Always start by running validation to understand the exact failures
- Let patches apply with offsets, then regenerate from `git diff` — this is the fastest and most reliable approach
- Reset the skeleton to clean state between operations
- Verify each fix with re-validation before moving to the next recipe

### DON'T:
- Never modify the skeleton template (`templates/skeleton/`) permanently
- Never manually edit patch files by hand-adjusting line numbers — always regenerate from `git diff`
- Never skip the final validation step
- Never commit without passing validation
