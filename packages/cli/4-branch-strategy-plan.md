# Technical Plan: 4-Branch Strategy for React Router 7.8.x Migration

## Current State Analysis

**Current Branch:** `feat/skeleton-rr-7.8`
- Contains React Router 7.8.x skeleton migration
- Has commit `d8aa6792f` that disables examples/recipes from CI (needs to be moved)
- Based on `feat/hydrogen-core-rr-7.8`

**Clean Branch Reference:** `hydrogen-react-router-7.8.2-clean`
- Has complete solution with standalone examples
- Contains diff removal (commit `97493ed3c`)
- Contains auto-link features (commits `a600b0497`, `3beb46ea4`)
- Contains standalone examples conversion (commit `e2b78b100`)

## Branch Architecture

```
feat/hydrogen-core-rr-7.8 (existing base)
    │
    ├──> Branch 1: feat/cli-diff-removal
    │    (diff removal + examples CI disable)
    │    
    └──> Branch 2: feat/skeleton-rr-7.8-clean
         (current skeleton minus examples commit)
         │
         ├──> Branch 3: feat/cli-autolink
         │    (auto-link functionality only)
         │
         └──> Branch 4: feat/examples-standalone
              (convert examples to standalone)
```

## Detailed Implementation Plan

### Branch 1: `feat/cli-diff-removal`
**Base:** `feat/hydrogen-core-rr-7.8`
**Purpose:** Remove diff system and disable examples in CI

**Required Commits:**
1. Cherry-pick `97493ed3c` from clean branch (diff removal)
2. Cherry-pick `d8aa6792f` from current skeleton (examples CI disable)

**Files Modified (from diff removal):**
- `packages/cli/src/commands/hydrogen/build.ts` - Remove diff flag
- `packages/cli/src/commands/hydrogen/dev.ts` - Remove diff flag  
- `packages/cli/src/commands/hydrogen/preview.ts` - Remove diff flag
- `packages/cli/src/commands/hydrogen/codegen.ts` - Remove diff flag
- `packages/cli/src/lib/flags.ts` - Remove diffFlag export
- `packages/cli/src/lib/template-diff.ts` - DELETE entire file
- `packages/cli/oclif.manifest.json` - Update manifest

**Files Modified (from examples disable):**
- `package.json` - Remove examples from workspaces array
- `.github/workflows/ci.yml` - Update step names

**Expected CI Impact:**
- ✅ CLI tests should pass (diff removal fixes compatibility)
- ✅ No examples/recipes failures (disabled from CI)
- ⚠️ create-hydrogen may still fail until Branch 4

### Branch 2: `feat/skeleton-rr-7.8-clean`
**Base:** `feat/cli-diff-removal` (Branch 1)
**Purpose:** Current skeleton work without examples commit

**Implementation Steps:**
1. Create new branch from current skeleton
2. Reset to remove commit `d8aa6792f`
3. Rebase onto `feat/cli-diff-removal`

**Commands:**
```bash
git checkout feat/skeleton-rr-7.8
git checkout -b feat/skeleton-rr-7.8-clean
git reset --hard HEAD~1  # Remove d8aa6792f
git rebase feat/cli-diff-removal
```

**Result:**
- Clean skeleton changes without CI workarounds
- Examples CI handling inherited from Branch 1

### Branch 3: `feat/cli-autolink`
**Base:** `feat/skeleton-rr-7.8-clean` (Branch 2)
**Purpose:** Add monorepo auto-linking only

**Required Commits:**
1. `a600b0497` - CLI auto-linking implementation
2. `3beb46ea4` - Runtime monorepo detection

**New Files Added:**
- `packages/cli/src/lib/plugin-autolinker.ts` (458 lines)
- `packages/cli/src/lib/plugin-autolinker.test.ts` (485 lines)
- `packages/cli/src/hooks/init.ts` (modified)

**Modified Files:**
- `packages/cli/src/lib/build.ts` (87 lines added for monorepo detection)

**Features Provided:**
- Auto-detects monorepo context
- Links plugin automatically during development
- Supports `--path` flag for external projects
- CI-compatible with graceful failures

### Branch 4: `feat/examples-standalone`
**Base:** `feat/skeleton-rr-7.8-clean` (Branch 2)
**Purpose:** Convert examples to standalone applications

**Required Commits:**
1. `e2b78b100` - Massive standalone conversion

**Scope of Changes:**
- 9 examples converted to standalone
- Each example gets full application structure
- Re-enables examples in CI

**Modified Files:**
- `package.json` - Re-add examples to workspaces
- Each example gets ~100+ new files

**Expected Result:**
- ✅ All CI tests pass
- ✅ create-hydrogen works
- ✅ Examples build independently

## Implementation Commands

```bash
# Branch 1: CLI Diff Removal
git checkout feat/hydrogen-core-rr-7.8
git checkout -b feat/cli-diff-removal
git cherry-pick 97493ed3c  # diff removal from clean branch
git cherry-pick d8aa6792f   # examples disable from current skeleton

# Branch 2: Skeleton Clean
git checkout feat/skeleton-rr-7.8
git checkout -b feat/skeleton-rr-7.8-clean
git reset --hard HEAD~1     # Remove examples commit
git rebase feat/cli-diff-removal

# Branch 3: CLI Auto-link
git checkout feat/skeleton-rr-7.8-clean
git checkout -b feat/cli-autolink
git cherry-pick a600b0497 3beb46ea4  # auto-link commits

# Branch 4: Examples Standalone
git checkout feat/skeleton-rr-7.8-clean
git checkout -b feat/examples-standalone
git cherry-pick e2b78b100   # standalone conversion
# Manual: Re-enable examples in package.json workspaces
```

## Risk Assessment & Mitigation

### Low Risk
- **Branch 1**: Isolated CLI changes, well-tested in clean branch
- **Branch 2**: Simple rebase operation

### Medium Risk
- **Branch 3**: Auto-link may have hidden dependencies
  - *Mitigation*: Test with `HYDROGEN_DISABLE_AUTOLINK=true` if issues
- **Branch 4**: Large changeset, potential conflicts
  - *Mitigation*: May need manual conflict resolution

### CI Validation Checkpoints

After each branch creation:
1. Push branch and verify CI status
2. Test key commands locally:
   - `npm run build` 
   - `npm run test:ci`
3. For Branch 4, specifically test:
   - `npm create @shopify/hydrogen@latest`
   - Example builds: `cd examples/b2b && npm run build`

## Success Criteria

Each branch must achieve:

**Branch 1:**
- CLI tests pass
- No examples/recipes CI failures
- Diff system completely removed

**Branch 2:**
- Skeleton tests pass
- Clean rebase without conflicts
- All React Router 7.8.x features working

**Branch 3:**
- Auto-link works in monorepo
- External project support via --path
- CI compatibility maintained

**Branch 4:**
- All examples build successfully
- create-hydrogen command works
- Full CI green status