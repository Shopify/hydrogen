# Cookbook Command Improvements - Future Work

This document captures analysis and proposed improvements to the cookbook command structure. A future LLM agent or developer can use this as context to implement the changes.

## Background: The Problem Discovered

When bumping React Router from 7.9.2 to 7.12.0 in the skeleton template, recipe patches failed to apply because their **context lines** referenced the old version:

```diff
# Existing patch (won't apply - context doesn't match)
@@ -20,6 +20,7 @@
     "react": "18.3.1",
     "react-dom": "18.3.1",
+    "react-intersection-observer": "^8.34.0",
     "react-router": "7.9.2",       # ← OLD context
     "react-router-dom": "7.9.2"    # ← OLD context
```

The skeleton now has `7.12.0`, so the patch context doesn't match and `patch` fails.

## Analysis of Existing Commands

### `generate`
- **What it does:** Creates a recipe from uncommitted changes to the skeleton
- **Limitation:** Requires uncommitted changes. If changes are already committed, `git diff` returns nothing.
- **The `--filePath` flag:** Already exists for single-file operations, but still requires uncommitted changes.

### `update`
- **What it does:** Updates a recipe to work with a different branch (default: `origin/main`)
- **Process:**
  1. Checkout recipe's original commit
  2. Apply recipe (including `deletedFiles`!)
  3. Merge target branch
  4. Regenerate recipe
- **Problem:** If you're ON the branch with changes (not merging FROM main), this creates merge conflicts. Also, the `deletedFiles` step deletes files before patches are applied.

### `regenerate`
- **What it does:** Apply recipe → re-generate → render README
- **Use case:** When cookbook tooling changes (patch format, README rendering)
- **Problem:** Requires recipe to apply cleanly first. If patches have drifted, it fails at step 1.

## The Workflow Gap

**Scenario:** You change the skeleton on a branch, CI fails because recipe patches have old context, and you need to fix patches IN THE SAME PR.

**Current options (all bad):**
1. Soft reset → make uncommitted changes → generate → recommit (tedious)
2. Manually edit patches with sed (works but not "proper")
3. Merge with failed CI, then update (defeats CI purpose)

**No existing command handles:** "I have committed skeleton changes, and I need to update recipe patches to have correct context."

## Proposed New Commands

### 1. `refresh-patch`

**Purpose:** Fix a single patch that has drifted from skeleton changes.

**How it works:**
1. Check for uncommitted changes to target file (abort if found)
2. Apply existing patch with `--fuzz=3` (allows context drift)
3. Run `git diff` to capture changes with new context
4. Write new patch file
5. Revert temporary changes

**Usage:**
```bash
npm run cookbook -- refresh-patch --recipe infinite-scroll --file package.json
```

**Implementation location:** New file `cookbook/src/commands/refresh-patch.ts`

**Key code:**
```typescript
// GUARD: Check for uncommitted changes
const gitStatus = execSync(`git status --porcelain '${absoluteFilePath}'`, { encoding: 'utf-8' });
if (gitStatus.trim()) {
  throw new Error(`Cannot proceed: ${file} has uncommitted changes.`);
}

// Apply existing patch with fuzz
execSync(`patch --fuzz=3 '${targetFile}' '${existingPatchPath}'`, { stdio: 'pipe' });

try {
  // Generate new patch from uncommitted changes
  const diff = execSync(`git diff '${targetFile}'`, { encoding: 'utf-8' });
  // ... write to patch file
} finally {
  // Always revert
  execSync(`git checkout -- '${targetFile}'`);
}
```

### 2. `update-format` (rename of `regenerate`)

**Purpose:** Re-process recipe through current tooling pipeline. Used when cookbook tooling itself changes (not when skeleton changes).

**Current name:** `regenerate`
**Proposed name:** `update-format`

**Why rename:**
- "regenerate" sounds like it would fix broken things
- "update-format" makes clear it's about formatting/structure, not content
- The recipe's CONTENT stays the same, only the FORMAT of output files changes

**Note:** This creates some confusion with the existing `update` command. May need further naming iteration.

## Naming Considerations

Current command names and their issues:

| Command | Current Purpose | Naming Issue |
|---|---|---|
| `generate` | Create recipe from uncommitted changes | OK, but `--filePath` mode is confusing |
| `update` | Sync recipe with a branch (merge-based) | Confusing with proposed `update-format` |
| `regenerate` | Re-process through tooling pipeline | Sounds like it fixes things (it doesn't) |
| `apply` | Apply recipe to skeleton | Clear |
| `validate` | Validate recipe | Clear |
| `render` | Render README | Clear |

**Future consideration:** May want to rename `update` to something like `sync-branch` or `merge-update` to differentiate from `update-format`.

## Patch File Naming

The SHA in patch filenames (e.g., `package.json.f30b0a.patch`) is a hash of the **file path**, not a git commit:

```typescript
const sha = createHash('sha256').update(fullPath).digest('hex');
const patchFilename = `${path.basename(fullPath)}.${sha.slice(0, 6)}.patch`;
```

This means:
- Same file path always produces same filename
- Git rebases don't affect it
- Regenerating a patch overwrites the existing file (same name)

## Files to Modify for Implementation

1. **New file:** `cookbook/src/commands/refresh-patch.ts` - The new command
2. **Modify:** `cookbook/src/index.ts` - Register the new command
3. **Rename:** `cookbook/src/commands/regenerate.ts` → `cookbook/src/commands/update-format.ts`
4. **Modify:** `cookbook/README.md` - Document new command, update regenerate docs

## Testing the Implementation

After implementing `refresh-patch`:

```bash
# Test with a recipe that has drifted patches
npm run cookbook -- refresh-patch --recipe infinite-scroll --file package.json
npm run cookbook -- refresh-patch --recipe metaobjects --file package.json
npm run cookbook -- refresh-patch --recipe express --file package.json

# Validate the recipes work
npm run cookbook -- validate --recipe infinite-scroll
npm run cookbook -- validate --recipe metaobjects
npm run cookbook -- validate --recipe express
```

## Workaround Used (Current PR)

Until `refresh-patch` is implemented, the workaround is:

```bash
# Soft reset the commit (keep changes staged)
git reset --soft HEAD~1

# For each recipe, manually add the recipe's deps to package.json, then:
npm run cookbook -- generate --recipe {name} --filePath templates/skeleton/package.json

# Revert package.json between recipes
git checkout templates/skeleton/package.json

# Recommit
git commit -m "your message"
```

Or use sed for simple version bumps:
```bash
sed -i '' 's/7\.9\.2/7.12.0/g' cookbook/recipes/*/patches/package.json.*.patch
```

## Summary

The cookbook needs a `refresh-patch` command for the common workflow: "I changed the skeleton, now I need to fix recipe patches in the same PR." The existing commands don't handle this case without awkward workarounds.

