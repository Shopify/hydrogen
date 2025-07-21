# Hydrogen Upgrade Command Changelog Update - GitHub Copilot Format

## Task: Generate Hydrogen CLI Upgrade Changelog Entry

You will analyze CI release PR(s) and generate a changelog entry for the Hydrogen CLI upgrade command. This JSON entry helps users migrate between Hydrogen versions.

## Step 1: Identify All Related CI Release PRs

**CRITICAL: Multiple PRs can share the same Hydrogen version**

Find all CI release PRs with matching `@shopify/hydrogen` version:
- Check: `templates/skeleton/package.json` in each CI release commit
- If versions match: Combine ALL changes into single entry
- Use chronologically LATEST PR for dependency versions

## Step 2: Analyze Version Pattern

- **Major Releases (X.Y.0)**: Breaking changes, new features, framework updates
- **Minor Releases (X.Y.1+)**: Bug fixes, maintenance, no breaking changes

## Step 3: Extract Consumed Changesets

**Only analyze changesets that were REMOVED in CI release commits:**
```bash
git show COMMIT_HASH --name-only | grep -E "\.changeset/.*\.md$"
```
**Ignore current `.changeset/` directory contents**

## Step 4: Classify Changes

### FIXES (existing functionality):
- Keywords: "Fix", "Fixing", "Bump", "Update", "Deprecate"
- Usually no skeleton code changes beyond package.json
- Examples: "Bumping the cli to 3.80.4"

### FEATURES (new functionality):
- Keywords: "Add", "Enable", "Support", "Migrating", "Remove/Drop"
- Often include skeleton template code changes
- Examples: "Migrating to React Router 7"

**Check skeleton changes:**
```bash
git show COMMIT_HASH --name-only | grep templates/skeleton | grep -v "CHANGELOG.md\|package.json"
```
- Output exists = Usually Feature
- No output = Usually Fix

## Step 5: Generate JSON Entry

**Use LATEST PR's skeleton package.json for all dependency versions**

```json
{
  "title": "Combined description of major changes from all PRs",
  "version": "hydrogen version from LATEST PR templates/skeleton/package.json", 
  "hash": "LATEST PR merge commit hash",
  "commit": "https://github.com/Shopify/hydrogen/pull/LATEST_PR_NUMBER/commits/hash",
  "dependencies": {
    // Complete dependencies from LATEST PR skeleton package.json
  },
  "devDependencies": {
    // Complete devDependencies from LATEST PR skeleton package.json
  },
  "dependenciesMeta": {
    "@shopify/cli": { "required": true },
    "@remix-run/dev": { "required": true },
    "@shopify/mini-oxygen": { "required": true },
    "@shopify/remix-oxygen": { "required": true },
    "@remix-run/fs-routes": { "required": true },
    "@remix-run/route-config": { "required": true }
  }
}
```

## Critical Requirements

✅ **Multi-PR Detection**: Find all CI releases for this hydrogen version
✅ **Latest Dependencies**: Use chronologically last PR's skeleton package.json  
✅ **All Changesets**: Include consumed changesets from all related PRs
✅ **Accurate Classification**: Apply skeleton template rule for fix vs feature
✅ **Version Source**: Use package.json version, not PR title version

## Common Mistakes to Avoid

❌ Analyzing only single PR when multiple exist
❌ Using first PR's dependencies instead of latest
❌ Including current .changeset/ files instead of consumed ones
❌ Using PR title version instead of package.json version

When uncertain about fix vs feature classification, ask for clarification.