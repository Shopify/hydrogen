# Create Shopify CLI PRs after releasing new version of @shopify/cli-hydrogen

## Context
You need to update the Shopify CLI to use a new version of @shopify/cli-hydrogen that was just released from the Hydrogen repository. This requires creating TWO pull requests in the Shopify CLI repository - one for the main branch and one for the stable branch.

## Pre-Requirements
Before starting, I need:
1. **Local path to Shopify CLI repository** (e.g., `/Users/username/github/cli`)
2. **New cli-hydrogen version number** (e.g., `10.2.0`)
3. **Current stable branch** (optional - I can detect it, format: `stable/3.XX`)

## PR Description Guidelines

When creating PRs, keep descriptions concise and factual:
- ✅ State what's being updated (version numbers)
- ✅ Include release notes from the source
- ✅ Let the changeset and release notes explain the "why"
- ❌ Don't add redundant urgency explanations
- ❌ Don't justify why stable branches need updates
- ❌ Don't repeat information already in the release notes

## What I Will Do

### Phase 1: Pre-Flight Validation ⚠️ CRITICAL

1. **Navigate to CLI repo and verify clean state**
   ```bash
   cd [CLI_REPO_PATH]
   git status --porcelain
   ```

2. **Validate npm package is published** (WILL EXIT if not found)
   ```bash
   shadowenv exec -- pnpm view @shopify/cli-hydrogen@[VERSION] version
   ```

3. **Test package installation** (WILL EXIT if fails)
   ```bash
   # Create temp directory and test installation with shadowenv
   ```

4. **Fetch GitHub release notes**
   ```bash
   curl -s "https://api.github.com/repos/Shopify/hydrogen/releases/tags/%40shopify%2Fcli-hydrogen%40[VERSION]"
   ```

5. **Update base dependencies if needed**
   - Check if `@shopify/cli-kit`, `@shopify/plugin-cloudflare`, or `@shopify/cli` need updates
   - This is required when cli-hydrogen has changes

### Phase 2: Create Main Branch PR

1. **Create feature branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b update-cli-hydrogen-[VERSION]
   ```

2. **Update package.json**
   - Edit `packages/cli/package.json` line ~119
   - Update `"@shopify/cli-hydrogen": "[NEW_VERSION]"`

3. **Update dependencies and generate files**
   ```bash
   shadowenv exec -- pnpm i
   shadowenv exec -- pnpm graphql-codegen:get-graphql-schemas
   shadowenv exec -- pnpm graphql-codegen
   shadowenv exec -- pnpm refresh-manifests
   shadowenv exec -- pnpm test:regenerate-snapshots
   shadowenv exec -- pnpm build-api-docs
   shadowenv exec -- pnpm build-dev-docs
   ```

4. **Create changeset**
   ```bash
   # Create .changeset/update-hydrogen-cli-[VERSION].md
   ```
   Content:
   ```markdown
   ---
   '@shopify/cli': patch
   ---

   Update cli-hydrogen [VERSION]
   ```

5. **Commit and push (with consent)**
   ```bash
   git add .
   git commit -m "Bump cli-hydrogen to [VERSION]"
   # Will ask for consent before pushing
   git push origin update-cli-hydrogen-[VERSION]
   ```

6. **Create PR with auto-fetched release notes**
   ```bash
   gh pr create --repo Shopify/cli \
     --title "hydrogen/Bump cli-hydrogen to [VERSION] (main)" \
     --body "[AUTO-GENERATED WITH RELEASE NOTES]" \
     --base main
   ```

   **Good PR Description Example**: https://github.com/Shopify/cli/pull/6188
   - Keep it concise: version update info + release notes
   - Avoid redundant explanations about why updates are needed
   - Let the release notes speak for themselves

### Phase 3: Create Stable Branch PR

1. **Create branch from stable**
   ```bash
   git checkout [STABLE_BRANCH]
   git pull origin [STABLE_BRANCH]
   git checkout -b [USERNAME]-update-cli-hydrogen-[VERSION]
   ```

2. **Repeat update process**
   - Same package.json update
   - Same pnpm commands (with shadowenv exec --)
   - **Different changeset filename** (e.g., `stable-update-hydrogen-cli-[VERSION].md`)

3. **Create PR to stable branch**
   ```bash
   gh pr create --repo Shopify/cli \
     --title "hydrogen/Bump cli-hydrogen to [VERSION]" \
     --body "[AUTO-GENERATED WITH RELEASE NOTES]" \
     --base [STABLE_BRANCH]
   ```

   **Note**: Use the same concise format as the main branch PR - no need for urgency explanations or justifications

### Phase 4: Post-PR Steps

1. **Ping for review**
   - Message `#develop-team-app-inner-loop` channel
   - Request patch release for stable branch

2. **Monitor for cli-kit version**
   - After release, cli-kit might be one version behind
   - Check cli-kit changelog for any critical updates

3. **Update Hydrogen's changelog.json**
   - Add new Shopify CLI version to enable upgrades
   - Do NOT retroactively update previous entries

## Dependency Chain Context

The release involves a complex circular dependency:
```
@shopify/cli-hydrogen (bundles skeleton)
    ↓ included in
@shopify/cli (main Shopify CLI)
    ↓ used by
skeleton template's devDependencies
    ↓ bundled in
@shopify/cli-hydrogen (circular!)
```

This may require a second cli-hydrogen release after the Shopify CLI is updated to bundle the correct skeleton version.

## Exit Conditions

I will EXIT immediately if:
- ❌ cli-hydrogen version is not published on npm
- ❌ Package installation fails (dependency conflicts)
- ❌ Repository has uncommitted changes
- ❌ Not in the correct repository

## Commands I'll Run

All commands that modify the repository will request explicit consent before execution. I will:
- ✅ Validate everything before making changes
- ✅ Show you what will be changed
- ✅ Ask for permission before pushing
- ✅ Create detailed PR descriptions with release notes

## Required Information

1. **Local CLI repository path**: ~/src/github.com/Shopify/cli
2. **cli-hydrogen version to update**: latest
3. **Stable branch** (optional, I can detect): the latest stable branch
