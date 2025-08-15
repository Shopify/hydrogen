# Hydrogen CalVer (Calendar Versioning) Documentation

## Overview

The CalVer enforcement system ensures Hydrogen packages follow a CalVer versioning scheme (YYYY.MAJOR.MINOR) while maintaining compatibility with changesets for release management.

Two scripts handle CalVer enforcement:
- **`enforce-calver-ci.js`** - Lean production script for CI releases (177 lines)
- **`enforce-calver-local.js`** - Local testing script with dry-run features (250 lines)

## Integration with NPM Version Script

The CI script is part of the `npm run version` command in the root package.json:

```json
"version": "npm run version:changeset && node scripts/enforce-calver-ci.js && npm run version:post && npm run format"
```

### Execution Order

1. **`version:changeset`** - Runs `changeset version` to bump packages based on changesets

   - Reads .changeset/\*.md files
   - Applies semver bumps (major/minor/patch) to packages
   - Updates package.json files with new versions
   - Generates/updates CHANGELOG.md files

2. **`enforce-calver-ci.js`** - Transforms versions to CalVer format

   - Reads the versions that changesets just wrote
   - Determines bump type by comparing old vs new versions
   - Transforms to CalVer format (YYYY.MAJOR.MINOR)
   - Updates package.json files with CalVer versions
   - Updates internal dependencies
   - Updates CHANGELOG.md headers

3. **`version:post`** - Updates generated files

   - `version:hydrogen` - Updates src/version.ts with new version
   - `version:cli` - Regenerates CLI manifest

4. **`format`** - Runs prettier on all modified files

## Why This Two-Step Process?

We leverage changesets for its powerful features:

- Changeset file management and validation
- Dependency resolution and bumping
- CHANGELOG generation with proper grouping
- GitHub integration and release notes
- Linked package coordination (major bumps only)

But changesets doesn't natively support CalVer, so we:

1. Let changesets do the heavy lifting (dependency graph, changelogs, etc.)
2. Transform the resulting versions to CalVer format
3. Preserve all the work changesets did (CHANGELOGs, dependencies, etc.)

## Versioning Strategy

### CalVer Packages

These packages use CalVer format (YYYY.MAJOR.MINOR):

- `@shopify/hydrogen`
- `@shopify/hydrogen-react`
- `skeleton`

Format explanation:

- **YYYY**: Current year
- **MAJOR**: Quarter-aligned (1, 4, 7, 10) for Q1, Q2, Q3, Q4
- **MINOR**: Feature releases within a quarter
- **PATCH**: Bug fixes (adds 4th segment: YYYY.MAJOR.MINOR.PATCH)

### Semver Packages

These packages use standard semver (X.Y.Z):

- `@shopify/cli-hydrogen`
- `@shopify/mini-oxygen`
- Other non-CalVer packages

## Coordination with Changesets

In `.changeset/config.json`, we use "linked" packages:

```json
{
  "linked": [["@shopify/hydrogen", "@shopify/hydrogen-react", "skeleton"]]
}
```

This means:

- **Major bumps**: ALL linked packages get the same major version
  → Then we transform to the same quarter (e.g., all become 2025.7.0)
- **Minor/patch bumps**: Each package can bump independently
  → Each gets its own minor/patch increment

## Quarterly Release Alignment

Major versions MUST align with quarters:

- **Q1**: January (month 1) - e.g., 2025.1.0
- **Q2**: April (month 4) - e.g., 2025.4.0
- **Q3**: July (month 7) - e.g., 2025.7.0
- **Q4**: October (month 10) - e.g., 2025.10.0

This matches Shopify's Storefront API release schedule and ensures predictable breaking change windows for merchants.

## Safety Features

1. **CI script runs without safeguards** (designed for production releases only)
2. **Local script defaults to dry-run** (requires `--apply` flag to modify files)
3. **Version regression checks** (prevents going backwards)
4. **Quarter alignment validation** for major bumps
5. **Format validation** for CalVer versions

## Usage

### In CI (Production)

The `enforce-calver-ci.js` script runs automatically as part of the version process:

```bash
# Runs as part of npm version script in CI
node scripts/enforce-calver-ci.js
```

### Local Development

Use `enforce-calver-local.js` for testing. It defaults to dry-run mode:

```bash
# Preview changes without modifying files (default)
node scripts/enforce-calver-local.js

# Actually apply changes to files
node scripts/enforce-calver-local.js --apply

# Skip running changesets (use existing versions)
node scripts/enforce-calver-local.js --skip-changesets

# Show help
node scripts/enforce-calver-local.js --help
```

## Testing

Use the comparison test script to verify CalVer behavior:

```bash
npm run test:calver
# or
./scripts/test-calver-comparison.sh
```

This script compares standard changeset versioning vs CalVer enforcement and shows the differences.
