# Recipe E2E Test Status

**Last Updated:** March 5, 2026  
**Branch:** recipe-test-setup  
**Purpose:** Document which Hydrogen cookbook recipes validate cleanly for E2E testing

## Summary

Out of 8 recipes tested for E2E compatibility:

- ✅ **1 recipe validates cleanly** (12.5%)
- ❌ **7 recipes have patch conflicts** (87.5%)

## ✅ Working Recipes

These recipes validate cleanly and can have E2E tests created:

1. **gtm** - Google Tag Manager integration
   - Status: Validates successfully
   - Validation time: ~31s
   - Ready for E2E test creation

## ❌ Broken Recipes

These recipes have patch conflicts with the current skeleton template and need updating before E2E tests can be created:

### 1. bundles

- **Error:** Patch conflicts detected
- **Affected files:**
  - `app/routes/_index.tsx` (backup created)
  - `app/routes/products.$handle.tsx` (backup created)
  - `app/styles/app.css` (backup created)
- **Issue:** Patches applied with offset or fuzz, indicating skeleton structure changes
- **Action needed:** Recipe patches need regeneration against current skeleton

### 2. combined-listings

- **Error:** Patch conflicts detected with rejected hunks
- **Affected files:**
  - `app/routes/collections.all.tsx` (rejected)
  - `app/routes/_index.tsx` (rejected)
  - `app/routes/products.$handle.tsx` (backup created)
  - `app/styles/app.css` (backup created)
- **Rejected changes:** Import statement formatting conflicts
- **Action needed:** Recipe needs update to match current import style

### 3. custom-cart-method

- **Error:** Patch conflicts detected
- **Action needed:** Recipe patches need regeneration

### 4. metaobjects

- **Error:** Patch conflicts detected
- **Affected files:**
  - `app/routes/_index.tsx` (rejected)
- **Action needed:** Recipe patches need regeneration

### 5. partytown

- **Error:** Patch conflicts detected
- **Affected files:**
  - `package.json` (rejected)
- **Issue:** Package.json structure likely changed
- **Action needed:** Recipe needs update for current package.json format

### 6. subscriptions

- **Error:** Patch conflicts detected
- **Affected files:**
  - `app/routes/products.$handle.tsx` (rejected)
- **Action needed:** Recipe patches need regeneration

### 7. third-party-api

- **Error:** Patch conflicts detected
- **Affected files:**
  - `app/routes/_index.tsx` (rejected)
- **Action needed:** Recipe patches need regeneration

## Recipes Not Tested

These recipes were excluded from testing for specific reasons:

- **markets** - Already has E2E tests (e2e/specs/recipes/markets.spec.ts)
- **infinite-scroll** - Already has E2E tests (e2e/specs/recipes/infinite-scroll.spec.ts)
- **b2b** - Requires customer authentication (skipped)
- **multipass** - Requires customer authentication (skipped)
- **legacy-customer-account-flow** - Requires customer authentication (skipped)
- **express** - Requires non-standard server setup (skipped)

## Recommendations for Maintainers

### Immediate Actions

1. **Update broken recipes** - Use `npm run cookbook -- update --recipe {name}` to regenerate patches
2. **Prioritize by usage** - Focus on commonly used recipes first
3. **Test after updates** - Run `npm run cookbook -- validate --recipe {name}` after each update

### Long-term Improvements

1. **Automated validation in CI** - Add recipe validation to PR checks
2. **Recipe version tracking** - Track which skeleton version each recipe was last validated against
3. **Quarterly maintenance** - Schedule regular recipe updates with Storefront API version updates

### Common Causes of Conflicts

Based on the validation results, most conflicts stem from:

1. **Import statement formatting changes** - Several recipes expect multi-line imports that are now single-line
2. **File structure changes** - Skeleton template reorganization affects patch application
3. **Package.json evolution** - Dependency changes break partytown patches

## Testing Approach

For E2E testing, we will:

1. Create tests **only for recipes that validate cleanly** (gtm)
2. Document broken recipes in this file
3. Skip broken recipes until maintainers update them
4. Re-validate periodically to catch newly broken or fixed recipes

## Validation Command

To check recipe status yourself:

```bash
npm run cookbook --workspace=cookbook -- validate --recipe {recipe-name}
```

## Notes

- Recipe validation checks if patches apply cleanly to current skeleton
- Patches that apply "with offset or fuzz" indicate structural changes
- Rejected patches mean the recipe code is incompatible with current skeleton
- All validation was performed on the `recipe-test-setup` branch
