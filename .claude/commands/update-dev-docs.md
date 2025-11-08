# Update Hydrogen Documentation on shopify.dev

Update the API reference documentation for Hydrogen and Hydrogen React packages on shopify.dev.

## Usage

```
/project:update-dev-docs [shopify-dev-path]
```

**Arguments:**
- `shopify-dev-path` (optional): Path to shopify-dev repo. Defaults to `../shopify-dev`

**Example:**
```
/project:update-dev-docs
/project:update-dev-docs ~/github/shopify-dev
```

## Process

Follow these steps in order. Stop immediately if any step fails.

### Step 1: Detect Version

1. Read `packages/hydrogen/src/version.ts` to extract the current version
2. Parse the version (format: `YYYY.M.P` e.g., `2025.7.0`)
3. Convert to calver directory format: `YYYY-MM` (zero-padded month from major version)
   - Example: `2025.7.0` → `2025-07`
   - Example: `2025.1.5` → `2025-01`
4. Store as `VERSION_DIR` for later use

### Step 2: Generate Documentation

1. From hydrogen repo root, run: `npm run docs:build`
2. Wait for completion
3. Check exit code - if non-zero, STOP and report the error

### Step 3: Verify Changes

1. Run: `git status`
2. Check if ANY of these files have been modified:
   - `packages/hydrogen/docs/generated/generated_docs_data.json`
   - `packages/hydrogen/docs/generated/generated_static_pages.json`
   - `packages/hydrogen-react/docs/generated/generated_docs_data.json`
   - `packages/hydrogen-react/docs/generated/generated_static_pages.json`
3. If NO files changed: Exit with message "No documentation changes detected"
4. If files changed: Note which packages were updated (hydrogen, hydrogen-react, or both)

### Step 4: Navigate to shopify-dev

1. Resolve shopify-dev path:
   - If `$ARGUMENTS` provided, use that path
   - Otherwise, use `../shopify-dev`
2. Verify the directory exists - if not, STOP with error: "shopify-dev not found at [path]"
3. Navigate to shopify-dev: `cd [shopify-dev-path]`
4. Verify you're in a git repo: `git rev-parse --git-dir`
5. Check for git lock file: If `.git/index.lock` exists, remove it: `rm .git/index.lock`
6. Update main branch: `git checkout main && git pull`

### Step 5: Verify Target Directory Structure

1. Check if version directory exists for each package:
   - `db/data/docs/templated_apis/hydrogen/[VERSION_DIR]`
   - `db/data/docs/templated_apis/hydrogen_react/[VERSION_DIR]`
2. If directory does NOT exist for a package that has changes, STOP and ask user:
   - "Version directory [VERSION_DIR] does not exist for [package]. Should I create it? (yes/no)"
   - If yes: Create the directory
   - If no: STOP
3. List existing version directories to confirm structure

### Step 6: Create Branch

1. Generate branch name: `update-hydrogen-docs-[VERSION_DIR]`
   - Example: `update-hydrogen-docs-2025-07`
2. Check if branch already exists: `git rev-parse --verify [branch-name]`
3. If branch exists, STOP with error: "Branch [branch-name] already exists. Please delete it or use a different version."
4. Create and checkout new branch: `git checkout -b [branch-name]`

### Step 7: Copy Documentation Files

For each package that has changes (hydrogen and/or hydrogen-react):

1. **For hydrogen package:**
   - Copy `packages/hydrogen/docs/generated/generated_docs_data.json`
     → `db/data/docs/templated_apis/hydrogen/[VERSION_DIR]/generated_docs_data.json`
   - Copy `packages/hydrogen/docs/generated/generated_static_pages.json`
     → `db/data/docs/templated_apis/hydrogen/[VERSION_DIR]/generated_static_pages.json`

2. **For hydrogen-react package:**
   - Copy `packages/hydrogen-react/docs/generated/generated_docs_data.json`
     → `db/data/docs/templated_apis/hydrogen_react/[VERSION_DIR]/generated_docs_data.json`
   - Copy `packages/hydrogen-react/docs/generated/generated_static_pages.json`
     → `db/data/docs/templated_apis/hydrogen_react/[VERSION_DIR]/generated_static_pages.json`

3. Verify all files were copied successfully

### Step 8: Install Dependencies (Optional)

1. Check if `dev` command is available: `which dev`
2. If available: Run `dev up` and wait for completion
3. If not available: Skip this step (dependencies likely already installed)
4. Note: This step is optional for JSON-only updates

### Step 9: Run Validation

1. Run: `yarn lint:mdx`
2. If it fails:
   - Display all errors
   - STOP with message: "MDX linting failed. Fix errors before proceeding."
3. If it passes, continue

### Step 10: Start Dev Server (Optional Verification)

1. Ask user: "Would you like to start the dev server to verify changes? (yes/no)"
2. If yes:
   - Run: `dev server` (in background if possible)
   - Provide instructions: "Navigate to the Hydrogen docs to verify the changes"
   - Wait for user confirmation: "Type 'continue' when ready to commit"
3. If no, skip to commit step

### Step 11: Commit Changes

1. Stage documentation files:
   - `git add db/data/docs/templated_apis/hydrogen/[VERSION_DIR]/`
   - `git add db/data/docs/templated_apis/hydrogen_react/[VERSION_DIR]/`
2. Verify staged files: `git diff --staged --name-only`
3. Generate commit message based on which packages were updated:
   - Both packages: "Update Hydrogen and Hydrogen React API docs for [VERSION_DIR]"
   - Hydrogen only: "Update Hydrogen API docs for [VERSION_DIR]"
   - Hydrogen React only: "Update Hydrogen React API docs for [VERSION_DIR]"
4. Commit: `git commit -m "[message]"`
5. Verify commit succeeded: Check exit code

### Step 12: Push Branch

1. Push branch: `git push -u origin [branch-name]`
2. If push fails, STOP and report the error
3. Display the branch name for PR creation

### Step 13: Create Pull Request

1. Read PR template: `.github/PULL_REQUEST_TEMPLATE.md`
2. Create PR using `gh pr create` with the following structure:
   - **Title**: "Update Hydrogen and Hydrogen React API docs for [VERSION_DIR]"
   - **Problem**: State this is a routine version update to [VERSION_DIR]
   - **Solution**:
     - List files added under `db/data/docs/templated_apis/`
     - Note documentation generated from Hydrogen monorepo
     - Mention version will auto-appear in dropdown once deployed
     - List affected pages (hydrogen and hydrogen-react API docs)
   - **Risk**:
     - Visibility: User-facing (adds new version to dropdown)
     - Impact: No impact on existing versions
     - Type: Minor update (routine version addition)
     - Unknowns: None
   - **Top-hatting**: Include standard instructions from template
3. Use concise, factual language (no emojis, hype, or marketing language)
4. Display PR URL when created

### Step 14: Final Summary

Display to user:
```
✓ Documentation updated successfully!

Branch: [branch-name]
PR: [pr-url]
Packages updated: [hydrogen, hydrogen-react, or both]
Version: [VERSION_DIR]

The version dropdown will automatically show "2025-XX latest" once deployed.
```

## Error Handling

At any point, if a command fails:
1. Display the full error output
2. Display which step failed
3. STOP execution
4. Provide guidance on how to fix or rollback

## Rollback Instructions

If something goes wrong after creating the branch:
1. Navigate to shopify-dev: `cd [shopify-dev-path]`
2. Checkout main: `git checkout main`
3. Delete branch: `git branch -D [branch-name]`
4. If already pushed: `git push origin --delete [branch-name]`

## Notes

- This process assumes you have proper access to the shopify-dev repository
- The `dev` command is optional (Shopify internal tooling) - process works without it
- Package names use underscores in shopify-dev: `hydrogen_react` not `hydrogen-react`
- Version format is `YYYY-MM` (zero-padded month)

## Important Context

**Version Dropdown Behavior:**
- The version dropdown is automatically generated from directory structure
- No configuration files need to be updated
- The system scans for directories matching `YYYY-MM` pattern
- The newest version is automatically tagged as "latest"
- This behavior is confirmed by examining git history of previous version updates

**What NOT to Update:**
- Do NOT update `config.json` files (version_scheme already set to "calver")
- Do NOT update content MD files (deprecation warnings were removed in refactor)
- Only the JSON documentation files in `db/data/docs/templated_apis/` need to be added

**Historical Pattern:**
- Previous version updates (2024-10, 2025-01, 2025-05) only added JSON files
- No other configuration or content files were modified
- This pattern has been consistent across multiple releases
