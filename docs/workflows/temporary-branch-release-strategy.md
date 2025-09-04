# Detailed Plan: Temporary Branch Strategy for Single Changeset Release

## Overview
This plan involves creating a temporary branch from a point before unwanted changesets, cherry-picking only the desired changes, temporarily modifying the workflow to release from this branch, then reverting back to normal.

## Pre-requisites Checklist
- [ ] Identify the exact changeset file you want to release
- [ ] Identify the commit SHA containing this changeset
- [ ] Identify the last release tag/commit before unwanted changesets
- [ ] Ensure you have admin access to modify workflows
- [ ] Coordinate with team to avoid conflicts during execution

## Step-by-Step Execution Plan

### Phase 1: Investigation and Preparation

#### Step 1.1: Identify Current State
```bash
# Check current branch
git branch --show-current
# Expected output: main

# List all changeset files
ls -la .changeset/*.md | grep -v README.md
# Expected output: List of pending changeset files
# Example:
# -rw-r--r--  1 user  staff  245 Jan 15 10:00 .changeset/brave-foxes-jump.md
# -rw-r--r--  1 user  staff  189 Jan 16 11:30 .changeset/silly-cats-dance.md
# -rw-r--r--  1 user  staff  201 Jan 17 09:15 .changeset/happy-dogs-run.md

# View the specific changeset you want to release
cat .changeset/[YOUR-CHANGESET-FILE].md
# Expected output: Changeset content showing packages and changes
```

#### Step 1.2: Find the Last Release Point
```bash
# Check recent tags
git tag -l --sort=-v:refname | head -10
# Expected output: Recent version tags
# Example:
# @shopify/hydrogen@2024.1.5
# @shopify/cli-hydrogen@8.0.3
# ...

# Find the commit for the last release
git log --oneline --grep="\[ci\] release" -10
# Expected output: Recent release commits
# Example:
# abc1234 [ci] release 2025-01
# def5678 [ci] release 2025-01
```

#### Step 1.3: Identify Changeset Commits
```bash
# Find commits that added changesets
git log --oneline -- .changeset/*.md | head -20
# Expected output: Commits that modified changesets
# Example:
# 123abcd Add changeset for cart fix
# 456defg Add changeset for performance improvement
# 789ghij Add changeset for new feature
```

### Phase 2: Create Temporary Release Branch

#### Step 2.1: Create Branch from Last Release
```bash
# Create and checkout new branch from last release
git checkout -b temp-release/single-changeset [LAST-RELEASE-COMMIT-SHA]
# Expected output:
# Switched to a new branch 'temp-release/single-changeset'

# Verify you're at the right point
git log --oneline -5
# Expected output: Should show the release commit at HEAD
```

#### Step 2.2: Cherry-pick Desired Changes
```bash
# Cherry-pick the commit with your changeset
git cherry-pick [COMMIT-SHA-WITH-YOUR-CHANGESET]
# Expected output:
# [temp-release/single-changeset abc1234] Your commit message
#  2 files changed, 50 insertions(+), 10 deletions(-)

# If the changeset was added separately from code changes, 
# also cherry-pick the code changes
git cherry-pick [COMMIT-SHA-WITH-CODE-CHANGES]

# Verify the changeset is present
ls -la .changeset/*.md | grep -v README.md
# Expected output: Should show only your desired changeset file
```

#### Step 2.3: Verify Branch State
```bash
# Check that only desired changes are present
git diff [LAST-RELEASE-COMMIT-SHA]..HEAD --name-only
# Expected output: Only files related to your change

# Verify changeset content
cat .changeset/*.md | grep -v README
# Expected output: Only your desired changeset content
```

### Phase 3: Modify Release Workflow

#### Step 3.1: Update Changesets Workflow
```bash
# First, create a backup branch for the workflow
git checkout main
git checkout -b workflow-backup
git checkout temp-release/single-changeset

# Edit the workflow file
# Modify .github/workflows/changesets.yml
```

Changes needed in `.github/workflows/changesets.yml`:
```yaml
# Change line 5-6 from:
on:
  push:
    branches:
      - main

# To:
on:
  push:
    branches:
      - main
      - temp-release/single-changeset
```

Also update the version message (around line 31-32):
```yaml
# Add condition to use different branch name
- name: Flags
  id: flags
  run: |
    if [[ "${{ github.ref_name }}" == "temp-release/single-changeset" ]]; then
      echo "latestBranch=2025-01" >> $GITHUB_ENV
    else
      echo "latestBranch=2025-01" >> $GITHUB_ENV
    fi
    echo "latest=${{ github.ref_name == 'main' || github.ref_name == 'temp-release/single-changeset' }}" >> $GITHUB_ENV
```

#### Step 3.2: Commit Workflow Changes
```bash
# Add and commit the workflow change
git add .github/workflows/changesets.yml
git commit -m "Temporary: Enable release from temp-release/single-changeset branch"
# Expected output:
# [temp-release/single-changeset xyz9876] Temporary: Enable release from temp-release/single-changeset branch
#  1 file changed, 4 insertions(+), 2 deletions(-)
```

### Phase 4: Push and Trigger Release

#### Step 4.1: Push Temporary Branch
```bash
# Push the temporary branch
git push origin temp-release/single-changeset
# Expected output:
# Enumerating objects: ...
# To github.com:Shopify/hydrogen.git
#  * [new branch]      temp-release/single-changeset -> temp-release/single-changeset
```

#### Step 4.2: Monitor Workflow
```bash
# Check workflow status
gh workflow view "Changesets" --ref temp-release/single-changeset
# Expected output: Shows workflow running

# Or open in browser
gh workflow view "Changesets" --ref temp-release/single-changeset --web
```

#### Step 4.3: Handle Version PR
The workflow will create a "Version Packages" PR. You'll need to:
1. Review the PR (should only contain your single changeset)
2. Verify version bumps are correct
3. Merge the PR to trigger actual release

```bash
# List PRs
gh pr list --head temp-release/single-changeset
# Expected output:
# #1234  [ci] release 2025-01  temp-release/single-changeset

# View PR details
gh pr view [PR-NUMBER]
```

### Phase 5: Cleanup and Restore

#### Step 5.1: Revert Workflow Changes on Main
```bash
# Switch back to main
git checkout main

# Cherry-pick the workflow revert
git revert [WORKFLOW-CHANGE-COMMIT-SHA] --no-edit
# Or manually edit to remove the temporary branch

# Commit the revert
git add .github/workflows/changesets.yml
git commit -m "Revert: Remove temporary release branch from workflow"

# Push to main
git push origin main
```

#### Step 5.2: Verify Main Branch State
```bash
# Ensure changesets are still present on main
git checkout main
ls -la .changeset/*.md | grep -v README.md
# Expected output: Should show all pending changesets (minus the one you released)
```

#### Step 5.3: Clean Up Temporary Branch
```bash
# Delete local branch
git branch -D temp-release/single-changeset
# Expected output: Deleted branch temp-release/single-changeset

# Delete remote branch
git push origin --delete temp-release/single-changeset
# Expected output: To github.com:Shopify/hydrogen.git
#  - [deleted]         temp-release/single-changeset
```

### Phase 6: Verification

#### Step 6.1: Verify npm Release
```bash
# Check npm for the new version
npm view @shopify/hydrogen versions --json | tail -5
# Expected output: Should show your new version as latest

# Verify specific package if needed
npm view @shopify/hydrogen@latest version
# Expected output: The new version number
```

#### Step 6.2: Verify Remaining Changesets
```bash
# On main branch, verify other changesets remain
git checkout main
git pull origin main
ls -la .changeset/*.md | grep -v README.md
# Expected output: All changesets except the one you released
```

## Rollback Plan

If something goes wrong:

1. **Before Release:**
   ```bash
   # Delete the temporary branch
   git push origin --delete temp-release/single-changeset
   # Revert workflow changes on main
   ```

2. **After Release but Before Cleanup:**
   ```bash
   # Immediately revert workflow on main to prevent issues
   # The release is already done, so just clean up branches
   ```

3. **If Wrong Package Released:**
   ```bash
   # You'll need to do another release from main with a patch
   # npm deprecate can be used in extreme cases
   ```

## Important Notes

1. **Timing**: Execute during low-activity periods
2. **Communication**: Notify team before starting
3. **Monitoring**: Watch GitHub Actions throughout
4. **Version PR**: The created PR must be merged to actually release
5. **Latest Tag**: This will update the `latest` tag on npm

## Expected Timeline
- Investigation: 15 minutes
- Branch creation and setup: 10 minutes  
- Workflow modification: 5 minutes
- Waiting for Version PR: 5-10 minutes
- Merging and release: 5-10 minutes
- Cleanup: 10 minutes
- **Total**: ~1 hour