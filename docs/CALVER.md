# Hydrogen CalVer (Calendar Versioning) Documentation

## Overview

Hydrogen uses Calendar Versioning (CalVer) for its core packages, following the format **YYYY.MAJOR.MINOR** where:
- **YYYY**: Current year
- **MAJOR**: Quarter-aligned (1, 4, 7, 10) for Q1, Q2, Q3, Q4
- **MINOR**: Incremental releases within a quarter (features and fixes)

This versioning aligns with Shopify's quarterly Storefront API releases, ensuring predictable breaking change windows for merchants.

## Automated Branch Detection System

As of 2025, Hydrogen's release system features **fully automated branch detection**, eliminating manual quarterly updates that were previously required.

### What Changed

```
┌─────────────────────────────────────────────────────────────────┐
│                      BEFORE (Manual)                           │
├─────────────────────────────────────────────────────────────────┤
│ Every Quarter:                                                 │
│ • Edit .github/workflows/changesets.yml line 32                │
│ • Update: echo "latestBranch=2025-05" → "2025-07"              │
│ • Commit & Push                                                │
│                                                                 │
│ Problems:                                                       │
│ • Easy to forget (4x/year)                                     │
│ • Blocks releases                                              │
│ • Wrong PR titles                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       NOW (Automated)                          │
├─────────────────────────────────────────────────────────────────┤
│ Every Push to Main:                                            │
│ • Detects current version                                      │
│ • Checks for major changesets                                  │
│ • Checks for open release PRs                                  │
│ • Sets branch automatically                                    │
│                                                                 │
│ Benefits:                                                       │
│ • Zero manual intervention                                     │
│ • Never blocks releases                                        │
│ • Always correct PR titles                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Code Changes

**Before** (changesets.yml line 32):
```yaml
# IMPORTANT: Update this latestBranch whenever we move to a new major version:
echo "latestBranch=2025-05" >> $GITHUB_ENV  # ← Manual update required
```

**Now** (automated):
```yaml
# Automatically detect the latest branch based on current version and changesets
echo "latestBranch=$(node .changeset/get-calver-version-branch.js)" >> $GITHUB_ENV
```

### How It Works

The `scripts/get-latest-branch.js` script:
1. Reads the current Hydrogen package version
2. Checks for major changesets in `.changeset/` directory
3. If major changesets exist → returns next quarter branch (e.g., `2025-07`)
4. If no major changesets → returns current branch (e.g., `2025-05`)

## Architecture

### Core Scripts

#### 1. Shared Utilities (`scripts/calver-shared.js`)
Central module providing reusable CalVer logic:
- `parseVersion()` - Parse CalVer version strings
- `getNextVersion()` - Calculate next CalVer version
- `getBumpType()` - Detect bump type between versions
- `hasMajorChangesets()` - Check for major changesets
- CLI interface for bash script integration

#### 2. Branch Detection (`scripts/get-latest-branch.js`)
Automatic branch detection for CI/CD:
```javascript
// Detects current branch (no major changesets)
node scripts/get-latest-branch.js  // → "2025-05"

// Detects next quarter (with major changesets)
node scripts/get-latest-branch.js  // → "2025-07"
```

#### 3. CalVer Enforcement
- **`enforce-calver-ci.js`** - Production CI script (runs in GitHub Actions)
- **`enforce-calver-local.js`** - Local testing with dry-run support

### CI/CD Integration

The release workflow now operates with zero manual intervention:

```
┌─────────────────┐
│  Push to main   │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│  Checkout code & Install deps   │
└────────┬────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────────┐
│  Run: get-calver-version-branch.js          │
│  • Check for open release PRs               │
│  • Read current package version             │
│  • Analyze changesets                       │
└────────┬─────────────────────────────────────┘
         │
         ↓
    ┌────────────────────────────────────┐
    │  Decision Logic                    │
    ├────────────────────────────────────┤
    │  Open PR exists?      ──Yes──→ Stay│
    │         ↓ No                       │
    │  Major changesets?    ──Yes──→ Next│
    │         ↓ No                       │
    │  Use current branch                │
    └────────┬───────────────────────────┘
             │
             ↓
┌──────────────────────────────────┐
│  Create/Update Version PR        │
│  Title: [ci] release YYYY-MM     │
└──────────────────────────────────┘
```

## CalVer vs Semver Packages

### CalVer Packages (YYYY.M.P format)
- `@shopify/hydrogen`
- `@shopify/hydrogen-react`  
- `skeleton` (template)

### Semver Packages (X.Y.Z format)
- `@shopify/cli-hydrogen`
- `@shopify/mini-oxygen`
- `@shopify/remix-oxygen`
- All other packages

## Version Transformation Process

The CalVer system integrates with changesets through a two-step process:

1. **Changesets Phase**: Standard semver bumping
   ```
   changesets version → 2025.5.0 becomes 2025.6.0 (major bump)
   ```

2. **CalVer Transform**: Quarter alignment
   ```
   enforce-calver-ci.js → 2025.6.0 becomes 2025.7.0 (Q3 alignment)
   ```

### Integration Points

The transformation happens in the npm version script:
```json
"version": "npm run version:changeset && node .changeset/enforce-calver-ci.js && npm run version:post && npm run format"
```

Execution order:
1. `version:changeset` - Changesets applies semver bumps
2. `enforce-calver-ci.js` - Transforms to CalVer format
3. `version:post` - Updates generated files
4. `format` - Prettifies all changes

## Quarterly Release Schedule

Major releases align with Shopify's API calendar:

| Quarter | Month | CalVer Major | Example Version |
|---------|-------|--------------|-----------------|
| Q1      | January | 1 | 2025.1.0 |
| Q2      | April | 4 | 2025.4.0 |
| Q3      | July | 7 | 2025.7.0 |
| Q4      | October | 10 | 2025.10.0 |

## Testing

### Unit Testing
```bash
# Test CalVer comparison
npm run test:calver

# Test with dry-run (reads actual changesets)
npm run test:calver:dry

# Test branch detection
npm run test:calver:branch
```

### CI Testing
The `.github/workflows/test-calver.yml` workflow validates:
- Script syntax and Linux compatibility
- Patch version bumps (2025.5.0 → 2025.5.1)
- Major version quarter alignment (2025.5.0 → 2025.7.0)
- Mixed CalVer/semver package handling
- Automated branch detection
- Shared utilities CLI interface

### Local Development Testing

```bash
# Preview CalVer changes without modification
node .changeset/enforce-calver-local.js --dry-run

# Apply CalVer changes locally
node .changeset/enforce-calver-local.js --apply

# Skip changesets phase (use existing versions)
node .changeset/enforce-calver-local.js --skip-changesets

# Test branch detection with current changesets
node scripts/get-latest-branch.js
```

## Release Workflows

### 1. Regular Release (main branch)
- **Trigger**: Merge to main with changesets
- **Workflow**: `.github/workflows/changesets.yml`
- **Branch Detection**: Automatic via `get-latest-branch.js`
- **Version PR Title**: `[ci] release YYYY-MM` (automated)
- **npm tag**: `latest`

### 2. Back-fix Release (CalVer branches)
- **Trigger**: Push to CalVer branch (e.g., `2025-01`)
- **Workflow**: `.github/workflows/changesets-back-fix.yml`
- **Branch**: Uses branch name directly
- **Version PR Title**: `[ci] back-fix release YYYY-MM`
- **npm tag**: Branch name (e.g., `2025-01`)

### 3. Next Release (continuous)
- **Trigger**: Every push to main
- **Workflow**: `.github/workflows/next-release.yml`
- **Version Format**: `0.0.0-next-{SHA}-{timestamp}`
- **npm tag**: `next`
- **Purpose**: Immediate testing of latest changes

## Major Version Protection

### Overview
The Major Version Protection system prevents major changesets from being merged when there's a pending patch/minor release. This ensures users can get critical bug fixes without being forced to upgrade to a new major version with potential breaking changes.

### How It Works

The protection is enforced by `.github/workflows/major-protection.yml`:

1. **On every PR**: Checks if major changesets exist for protected packages
2. **Protected packages**: `@shopify/hydrogen`, `@shopify/hydrogen-react`, `skeleton`
3. **Blocks merge if**: Release PR exists with only patch/minor changes AND current PR has major changes
4. **Bypass mechanism**: Maintainers can comment `/bypass-major-safeguard` in exceptional cases

### Protection Flow

```
┌─────────────────────────┐
│      PR Created         │
└────────┬────────────────┘
         │
         ↓
┌─────────────────────────┐
│  Check bypass label?    │──Yes──→ Allow
└────────┬────────────────┘
         │ No
         ↓
┌─────────────────────────┐
│  Release PR exists?     │──No───→ Allow
└────────┬────────────────┘
         │ Yes
         ↓
┌─────────────────────────┐
│  Release has majors?    │──Yes──→ Allow
└────────┬────────────────┘
         │ No
         ↓
┌─────────────────────────┐
│  Current PR has majors? │──No───→ Allow
└────────┬────────────────┘
         │ Yes
         ↓
┌─────────────────────────┐
│       🚫 BLOCK PR       │
└─────────────────────────┘
```

### Bypass Command

In exceptional circumstances (e.g., correcting version issues), maintainers can bypass:

1. **Comment**: `/bypass-major-safeguard` on the PR
2. **System verifies**: Maintainer permissions (admin/maintain only)
3. **Actions taken**:
   - Closes pending release PR
   - Adds `major-bypass-active` label
   - Allows PR to merge with major changes

### Example Scenarios

```
Scenario A: Normal Protection
┌────────────────────────────────────────────────────────────┐
│ State:    Release PR #100 with bug fixes → 2025.5.1       │
│ Action:   PR #101 tries to merge major API changes        │
│ Result:   ❌ BLOCKED - Bug fixes must release first        │
│ Solution: Merge #100 first, then #101 → 2025.7.0          │
└────────────────────────────────────────────────────────────┘

Scenario B: With Bypass
┌────────────────────────────────────────────────────────────┐
│ State:    Version 2025.5.0 exists (invalid quarter)       │
│ Action:   Need to skip to 2025.7.0                        │
│ Command:  /bypass-major-safeguard                         │
│ Result:   ✅ Closes patch PR, allows merge → 2025.7.0     │
└────────────────────────────────────────────────────────────┘
```

## Common Scenarios

### Visual Timeline

```
2025 Timeline:
├─ Q1 (Jan)──────┬─ Q2 (Apr)──────┬─ Q3 (Jul)──────┬─ Q4 (Oct)──────┤
│   2025.1.x     │   2025.4.x     │   2025.7.x     │   2025.10.x    │
└────────────────┴────────────────┴────────────────┴────────────────┘
                      ↑                   ↑
                 We are here      Major bump goes here
```

### Scenario 1: Regular Minor Release

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Version:     │       │ Merge PR     │       │ Version PR:  │
│ 2025.5.0     │  +    │ with minor   │  →    │ [ci] release │
│              │       │ changeset    │       │ 2025-05      │
│ Branch:      │       └──────────────┘       │              │
│ 2025-05      │                              │ New version: │
└──────────────┘                              │ 2025.5.1     │
                                              └──────────────┘
```

### Scenario 2: Quarterly Major Release

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Version:     │       │ Merge PR     │       │ Version PR:  │
│ 2025.5.0     │  +    │ with MAJOR   │  →    │ [ci] release │
│              │       │ changeset    │       │ 2025-07      │
│ Quarter: Q2  │       └──────────────┘       │              │
└──────────────┘                              │ New version: │
                                              │ 2025.7.0     │
                                              │ (Q3 aligned) │
                                              └──────────────┘
```

### Scenario 3: Year Transition

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Version:     │       │ Merge PR     │       │ Version PR:  │
│ 2025.10.5    │  +    │ with MAJOR   │  →    │ [ci] release │
│              │       │ changeset    │       │ 2026-01      │
│ Quarter: Q4  │       └──────────────┘       │              │
│ Year: 2025   │                              │ New version: │
└──────────────┘                              │ 2026.1.0     │
                                              │ (New Year!)  │
                                              └──────────────┘
```

## Safety Features

1. **Version Regression Protection**: Prevents versions from going backwards
2. **Quarter Alignment Validation**: Ensures majors use quarters (1,4,7,10)
3. **Format Validation**: Verifies CalVer format (YYYY.M.P)
4. **Dry-run by Default**: Local script requires `--apply` flag
5. **Changeset Analysis**: Reads actual changeset files, not assumptions
6. **Release PR Conflict Prevention**: Blocks quarter advancement if release PR is open
   - Checks for existing `changeset-release/main` PRs before advancing quarters
   - Prevents mixing changesets from different quarters in same PR
   - Ensures clean quarter boundaries for major releases
7. **Major Version Protection**: Prevents major changes from contaminating patch releases
   - Blocks PRs with major changesets when patch/minor release is pending
   - Ensures users can get bug fixes without forced major upgrades
   - Maintainer bypass available for exceptional cases

## Troubleshooting

### Issue: Branch detection shows wrong quarter
**Solution**: Check for stray major changesets in `.changeset/` directory
```bash
ls .changeset/*.md | xargs grep -l "major"
```

### Issue: CalVer transformation not applied
**Solution**: Ensure the script runs after changesets
```bash
# Correct order
npm run version:changeset && node .changeset/enforce-calver-ci.js
```

### Issue: Version regression error
**Solution**: Version went backwards, check current vs target version
```bash
# Check current versions
cat packages/hydrogen/package.json | grep version
cat packages/hydrogen-react/package.json | grep version
```

## Migration Notes

### For Maintainers
- **No more manual updates**: The `latestBranch` in changesets.yml updates automatically
- **Branch naming unchanged**: Still uses `YYYY-MM` format (e.g., `2025-05`)
- **Changeset process unchanged**: Continue using `npm run changeset add`

### For Contributors
- **No changes required**: Continue creating changesets as normal
- **Major changesets**: Will automatically trigger quarter advancement

## Future Improvements

Potential enhancements being considered:
- Automatic back-fix branch creation when needed
- Slack notifications for upcoming quarter transitions
- Dashboard for visualizing release calendar
- Automated changelog.json updates for `h2 upgrade` command

## Related Documentation

- [Hydrogen Release Process](../CLAUDE.md#hydrogen-release-process) - Complete release workflow
- [Major Protection Workflow](../.github/workflows/major-protection.yml) - Protection implementation
- [Protection Utilities](../.github/scripts/changeset-protection-utils.js) - Shared utilities
- [.changeset/README.md](../.changeset/README.md) - Changesets documentation