# CalVer Release Integration Guide

## 🎯 Current Implementation Status

The CalVer system is now **fully integrated** into the Hydrogen release workflow. The script automatically runs changeset internally, captures original versions, and applies quarterly alignment for major versions while preserving minor/patch semantics.

## 📊 Integrated Release Process with CalVer

```
CURRENT INTEGRATED CALVER FLOW
═══════════════════════════════════════════════════════════════════

1. Developer Workflow
   └─ Create PR with changes
   └─ Run: npm run changeset add
   └─ Select version type: major/minor/patch
   └─ Commit: .changeset/random-name.md
   └─ PR gets merged to main

2. GitHub Actions - Version PR Creation
   └─ Changesets workflow detects new changesets
   └─ Creates/Updates Version PR "[ci] release 2025-05"
   └─ Runs: npm run version
       └─ node scripts/apply-calver-versioning.js
           ├─ Saves original versions (before changeset)
           ├─ Runs: npx changeset version internally
           ├─ Detects version changes
           ├─ Applies CalVer transformation if needed
           └─ Updates package.json, dependencies, CHANGELOGs
       └─ npm run version:post
       └─ npm run format

3. Manual Release Trigger
   └─ Maintainer reviews Version PR (with CalVer versions)
   └─ Maintainer merges Version PR
   └─ Changesets workflow publishes to npm
```

## 🔄 Version Handling by Type

### 📦 MINOR VERSION RELEASES
```
Scenario: Adding new features without breaking changes
Current: @shopify/hydrogen @ 2025.7.0

1. Developer creates changeset
   └─ Type: minor
   └─ Description: "Add new analytics hooks"

2. CalVer Process
   ├─ Original: 2025.7.0
   ├─ Changeset applies: 2025.7.1
   ├─ CalVer detects: minor bump
   └─ Result: KEEPS 2025.7.1 (no quarterly alignment)

3. Published: 2025.7.1 ✅
```

### 🔧 PATCH VERSION RELEASES
```
Scenario: Bug fixes and small improvements
Current: @shopify/hydrogen @ 2025.7.1

1. Developer creates changeset
   └─ Type: patch
   └─ Description: "Fix hydration issue"

2. CalVer Process
   ├─ Original: 2025.7.1
   ├─ Changeset applies: 2025.7.2
   ├─ CalVer detects: patch bump
   └─ Result: KEEPS 2025.7.2 (no quarterly alignment)

3. Published: 2025.7.2 ✅
```

### 🚀 MAJOR VERSION RELEASES
```
Scenario: Breaking changes or quarterly releases
Current: @shopify/hydrogen @ 2025.5.0

1. Developer creates changeset
   └─ Type: major
   └─ Description: "Update to Storefront API 2025-07"

2. CalVer Process
   ├─ Original: 2025.5.0
   ├─ Changeset applies: 2026.0.0 (year bump)
   ├─ CalVer detects: major bump
   └─ Result: TRANSFORMS to 2025.7.0 (next quarter)

3. Published: 2025.7.0 ✅

Quarterly Progression:
- From 2025.1.x → 2025.4.0 (Q1 to Q2)
- From 2025.4.x → 2025.7.0 (Q2 to Q3)
- From 2025.7.x → 2025.10.0 (Q3 to Q4)
- From 2025.10.x → 2026.1.0 (Q4 to next year Q1)
```

## 🔍 How the Script Works

### Core Logic Flow
```javascript
// scripts/apply-calver-versioning.js

1. Save original versions BEFORE changeset runs
   const originalVersions = {
     '@shopify/hydrogen': '2025.5.0',
     '@shopify/hydrogen-react': '2025.5.0'
   }

2. Run changeset version internally
   execSync('npx changeset version')
   // Updates packages to 2026.0.0 for major

3. Calculate version adjustments
   - Detect bump type: major/minor/patch
   - For major: Apply quarterly transformation
   - For minor/patch: Keep as-is

4. Apply CalVer versions
   - Update all package.json files
   - Update internal dependencies
   - Update CHANGELOG.md files
```

## 🛡️ Built-in Safeguards

```
SAFEGUARDS ACTIVE IN PRODUCTION
═══════════════════════════════════════════════════════════════════

✅ Version Regression Protection
   Prevents: 2025.7.0 → 2025.4.0

✅ Quarter Alignment Validation
   Ensures: Major versions use 1,4,7,10

✅ Dry-Run by Default
   Local runs require --force flag

✅ CalVer Format Validation
   Validates: YYYY.MM.DD pattern

✅ Bump Type Detection
   Correctly identifies: major/minor/patch
```

## 📋 Configuration

### package.json
```json
{
  "scripts": {
    "version": "node scripts/apply-calver-versioning.js && npm run version:post && npm run format"
  }
}
```

The CalVer script now **internally runs changeset**, so we don't need `changeset version` in the npm script.

### Supported Packages
- `@shopify/hydrogen` - Quarterly CalVer enforced for majors
- `@shopify/hydrogen-react` - Quarterly CalVer enforced for majors
- `skeleton` - Standard versioning (no CalVer enforcement)

## 🧪 Testing

### Run Tests
```bash
# Run all CalVer tests
npx jest scripts/apply-calver-versioning.test.js

# Test in dry-run mode
node scripts/apply-calver-versioning.js --dry-run

# Force local execution (careful!)
node scripts/apply-calver-versioning.js --force
```

### Test Results
- 23 unit tests covering all scenarios
- Validates quarter progression
- Tests minor/patch preservation
- Ensures safeguards work

## 📊 Real-World Examples

### Example 1: Multiple Changesets in One Release
```
Changesets:
- fix-auth.md: hydrogen (patch)
- add-analytics.md: hydrogen (minor)
- breaking-api.md: hydrogen-react (major)

CalVer Results:
- hydrogen: 2025.7.0 → 2025.7.1 (minor wins over patch)
- hydrogen-react: 2025.7.0 → 2025.10.0 (major → next quarter)
```

### Example 2: Coordinated Major Release
```
Changesets:
- storefront-update.md: 
    hydrogen (major)
    hydrogen-react (major)

CalVer Results:
- Both packages: 2025.5.x → 2025.7.0 (aligned to Q3)
```

## ⚠️ Important Notes

### What Changes with CalVer

| Aspect | Before CalVer | With CalVer |
|--------|--------------|-------------|
| Major versions | 2025.5.0 → 2026.0.0 | 2025.5.0 → 2025.7.0 (quarterly) |
| Minor versions | 2025.7.0 → 2025.7.1 | 2025.7.0 → 2025.7.1 (unchanged) |
| Patch versions | 2025.7.1 → 2025.7.2 | 2025.7.1 → 2025.7.2 (unchanged) |
| Release timing | Any time | Any time (no date enforcement) |
| Changeset files | Required | Required (no change) |

### What Stays the Same
- Changeset workflow remains unchanged
- Version PR process unchanged
- npm publication unchanged
- GitHub releases unchanged
- Next releases unchanged
- Back-fix releases unchanged

## 🚨 Troubleshooting

### Issue: CalVer script not running
```bash
# Check package.json has correct script
grep "version" package.json
# Should show: "version": "node scripts/apply-calver-versioning.js ..."
```

### Issue: Versions not transforming
```bash
# Run with debug output
node scripts/apply-calver-versioning.js --dry-run
# Check "Calculating version adjustments" section
```

### Issue: Tests failing
```bash
# Run specific test
npx jest scripts/apply-calver-versioning.test.js -t "getNextQuarterlyVersion"
```

## 📈 Success Metrics

After implementing CalVer, we should see:

✅ **Major releases** always on quarters (1,4,7,10)
✅ **Minor/patch releases** increment normally
✅ **Dependencies** auto-updated to CalVer versions
✅ **CHANGELOGs** show correct CalVer versions
✅ **No manual intervention** required for version alignment

## 🔗 Related Files

- `scripts/apply-calver-versioning.js` - Main CalVer implementation
- `scripts/apply-calver-versioning.test.js` - Test suite
- `package.json` - Version script configuration
- `.changeset/config.json` - Changeset configuration

## 📝 Migration from Standard Versioning

If migrating from standard versioning:

1. **Current version**: 2025.5.0
2. **Next minor**: 2025.5.1 (no change needed)
3. **Next major**: 2025.7.0 (automatically aligned)

The system handles the transition seamlessly without manual intervention.

---

*Last updated: November 2024*
*CalVer system version: 1.0.0*