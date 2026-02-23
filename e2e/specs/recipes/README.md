# Recipe E2E Tests

This directory contains end-to-end tests for Hydrogen cookbook recipes.

## Overview

Recipe tests validate that recipes:
- Apply cleanly to the skeleton template
- Build and type-check successfully
- Provide the expected functionality to end users
- Maintain compatibility with current Hydrogen versions

## Writing Recipe Tests

### Basic Structure

```typescript
import {test, expect, setRecipeFixture} from '../../fixtures';

// Apply the recipe before running tests
await setRecipeFixture({
  recipeName: 'my-recipe',
  storeKey: 'hydrogenPreviewStorefront',
});

test.describe('My Recipe', () => {
  test('implements expected feature', async ({page, storefront}) => {
    await storefront.goto('/');
    // Your test assertions
  });
});
```

### The `setRecipeFixture` Helper

`setRecipeFixture` handles the entire recipe setup:

1. **Applies recipe** using `npm run cookbook -- apply` (mutates `templates/skeleton` in-place)
2. **Copies modified skeleton** to `.tmp/recipe-fixtures/{recipe-name}/`
3. **Reverts skeleton** to clean state (always, even on failure)
4. **Installs dependencies** and **builds** the fixture
5. **Starts dev server** pointing to the fixture
6. **Caches fixture** for subsequent runs (configurable)

#### Options

```typescript
type RecipeFixtureOptions = {
  recipeName: string;
  storeKey?: 'hydrogenPreviewStorefront' | `https://${string}`;
  useCache?: boolean;
};
```

- **`recipeName`** (required): Name of the recipe (must exist in `cookbook/recipes/`)
- **`storeKey`** (optional): Which test store to use. Defaults to `'hydrogenPreviewStorefront'`
- **`useCache`** (optional): Whether to reuse existing fixture if found. Defaults to `true`

#### Caching Behavior

By default, fixtures are cached in `.tmp/recipe-fixtures/` to speed up test runs:

- **First run**: Generates fixture (~30-60s depending on recipe)
- **Subsequent runs**: Reuses cached fixture (~5s startup)
- **Force regenerate**: Set `useCache: false`

The `.tmp/` directory is gitignored and safe to delete.

## Running Recipe Tests

### All Recipe Tests
```bash
npx playwright test --project=recipes
```

### Single Recipe Test
```bash
npx playwright test --project=recipes markets
```

### Force Regenerate Fixtures
```bash
# Delete cached fixtures
rm -rf .tmp/recipe-fixtures

# Run tests (will regenerate)
npx playwright test --project=recipes
```

## Test Organization

Each recipe should have its own test file:

```
e2e/specs/recipes/
├── README.md (this file)
├── markets.spec.ts
└── ...
```

## Best Practices

### 1. Test User-Facing Behavior

Focus on what users experience, not implementation details:

```typescript
// GOOD: Test visible outcome
test('displays subscription pricing', async ({page}) => {
  const price = page.getByRole('region', {name: /price/i});
  await expect(price).toContainText('Subscribe');
});

// AVOID: Test internal state
test('calls subscription API', async ({page}) => {
  await page.waitForResponse(r => r.url().includes('/subscriptions'));
});
```

### 2. Use Semantic Selectors

Follow the E2E testing guidelines in `e2e/CLAUDE.md`:

```typescript
// GOOD: Role-based selectors
page.getByRole('button', {name: /load more/i})

// AVOID: CSS classes
page.locator('.load-more-button')
```

### 3. Test Core Recipe Features

Prioritize testing what makes the recipe unique:

- **Markets**: Do localized URLs work? Currency correct?
- **Subscriptions**: Can users select subscription options?

### 4. Keep Tests Fast

- Minimize navigation between pages
- Use `beforeEach` for common setup
- Test critical paths, not every edge case

### 5. Consider Recipe Dependencies

Some recipes modify shared code. If a recipe changes core components:

```typescript
test.describe('Component still works in base skeleton', () => {
  // Validate recipe didn't break existing functionality
});
```

## Maintenance

### When to Update Recipe Tests

- **Recipe changes**: Update tests to match new functionality
- **Skeleton changes**: Verify recipes still apply cleanly
- **API changes**: Update selectors if Shopify APIs evolve
- **Test failures**: Investigate if recipe is broken or test needs update

### Debugging Failed Tests

1. **Check the fixture**: Inspect `.tmp/recipe-fixtures/{recipe-name}/`
2. **Validate recipe**: Run `npm run cookbook -- validate --recipe {name}`
3. **Force regenerate**: Delete `.tmp/` and re-run tests
4. **Use trace viewer**: `npx playwright show-trace test-results/.../*.zip`

## Architecture Notes

### Why On-Demand Application?

We chose on-demand recipe application over pre-baked fixtures because:

- ✅ **Flexibility**: Test any recipe without committing fixtures
- ✅ **Maintainability**: No 13+ fixture directories to keep in sync
- ✅ **Accuracy**: Always tests current recipe state
- ✅ **Performance**: Caching provides speed when needed

### How It Works

```
Test starts
    ↓
setRecipeFixture() called
    ↓
Check .tmp/recipe-fixtures/{recipe}/
    ↓
Not found? ────────→ Apply recipe to skeleton
                     Copy modified skeleton to .tmp/
                     Revert skeleton (always)
                     Install deps + build
    ↓
Start DevServer pointing to fixture
    ↓
Tests run against live server
    ↓
Server stops (fixture remains cached)
```

## Contributing

When adding a new recipe:

1. Create `{recipe-name}.spec.ts` in this directory
2. Use `setRecipeFixture()` to apply the recipe
3. Write tests for core recipe functionality
4. Run `npx playwright test --project=recipes {recipe-name}` to validate
5. Commit only the test file (fixtures are gitignored)
