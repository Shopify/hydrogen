# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Git Commit Security

**NEVER use `git commit --no-verify` or any flags that bypass pre-commit hooks!**

Pre-commit hooks in this repository are CRITICAL for:
- Preventing secrets and sensitive data from being committed
- Ensuring code quality and formatting standards
- Running security checks
- Validating that tests pass

If a pre-commit hook fails:
1. Fix the issues identified by the hook (syntax errors, formatting, etc.)
2. Stage the fixes with `git add`
3. Try committing again WITHOUT --no-verify
4. If you cannot fix the issues, ask for help - DO NOT bypass the hooks

**Security is paramount. Bypassing pre-commit hooks could lead to leaked credentials, API keys, or other sensitive information being exposed in the repository history.**

## Hydrogen Release Process

### Overview
Hydrogen uses a sophisticated automated release system built on Changesets, GitHub Actions, and npm workspaces. Understanding this flow is critical for contributing effectively.

### Release Flow: From PR to Production

1. **Developer creates PR with changes**
   - If changes affect `packages/*/src/**` or `packages/*/package.json`, a changeset is required
   - Run `npm run changeset add` to create a changeset file **(MANUAL)**
   - Changeset specifies which packages are affected and version bump type (patch/minor/major)

2. **On merge to main, TWO parallel processes occur:**

   a) **Next Release (immediate)** **(AUTOMATIC)**
      - Every push to main (except release commits) triggers `next-release.yml`
      - Creates snapshot version: `0.0.0-next-{SHA}-{timestamp}`
      - ALL packages are published with `next` tag
      - Available immediately for testing latest changes

   b) **Version PR Creation (if changesets exist)** **(AUTOMATIC)**
      - `changesets.yml` workflow runs
      - If changesets are found, creates OR updates open CI release PR
      - PR title: `[ci] release 2025-05` (current latest branch)
      - **Important**: This PR accumulates ALL changesets from merged PRs
      - Multiple PRs can be merged before a release (e.g., 10 PRs = 10 changesets in one Version PR)
      - The Version PR automatically updates as new changesets are merged

3. **Production Release - Batched (manual step)**
   - **Releases are batched**: Maintainers decide when to release (could be after 1 PR or 10 PRs)
   - The Version PR accumulates all pending changesets since last release
   - Maintainer reviews accumulated changes and merges the Version PR when ready **(MANUAL)**
   - On merge, `changesets.yml` publishes to npm with `latest` tag **(AUTOMATIC)**
   - Only packages with changesets get new versions **(AUTOMATIC)**
   - Internal dependencies updated with patch versions **(AUTOMATIC)**
   - Post-release actions:
     - Compiles templates to `dist` branch **(AUTOMATIC)**
     - Sends Slack notification (if Hydrogen package included) **(AUTOMATIC)**

4. **Post-Release: Enabling Upgrades (manual step)**
   - After npm publication, `docs/changelog.json` must be updated **(MANUAL)**
   - This enables the `h2 upgrade` command to detect the new version
   - Without this step, developers cannot upgrade using the CLI
   - Process:
     - Update `docs/changelog.json` with release information **(MANUAL)**
     - Include version, dependencies, features, fixes, and upgrade steps **(MANUAL)**
     - Commit and push to main branch **(MANUAL)**
     - Changes are served via https://hydrogen.shopify.dev/changelog.json **(AUTOMATIC)**

   **How `h2 upgrade` works:**
   - Fetches changelog.json from hydrogen.shopify.dev (proxies to the raw content of this file on the `main` branch in the Hydrogen repo)
   - Compares user's current version against available versions
   - Shows features, fixes, and breaking changes for upgrade path
   - Generates local upgrade instructions file in `.hydrogen/` directory
   - Updates package.json dependencies based on changelog specifications

### Understanding Batched Releases

**Key Point**: Not every merged PR triggers a release!

- When you merge a PR with a changeset, it does NOT immediately release to npm
- Instead, your changeset is added to the open CI release PR
- This PR accumulates changesets from ALL merged PRs since the last release
- Maintainers decide when to merge this PR to trigger an actual release
- This allows batching multiple features/fixes into a single release

**Example Timeline**:
- Monday: 3 PRs merged with changesets → Version PR has 3 changesets
- Tuesday: 2 more PRs merged → Version PR now has 5 changesets
- Wednesday: 4 more PRs merged → Version PR now has 9 changesets
- Thursday: Maintainer merges Version PR → All 9 changes released together

### Multi-Package Releases
- Each package versions independently (no fixed/linked packages in changesets config)
- Single changeset can specify multiple packages
- Example: PR changes both `@shopify/hydrogen` and `@shopify/cli-hydrogen`
  - Both packages listed in changeset
  - Each gets appropriate version bump
  - Published together when Version PR merged

### Other Release Types

**Snapshot Testing (`/snapit`)**
- Comment `/snapit` on any PR
- Creates snapshot version for testing
- Publishes specific packages for PR validation

**Back-fix Releases**
- Push to calver branches (e.g., `2025-01`)
- Publishes with branch name as npm tag
- Used for patching previous versions

### Manual vs Automatic Steps

#### Manual Steps (Human Intervention Required)

1. **Developer Actions**
   - **Create changesets**: Run `npm run changeset add` for any PR with code changes
   - **Skeleton changes**: MUST include `@shopify/cli-hydrogen` in the changeset
     - This ensures the CLI bundles the latest skeleton template
     - Without this, new projects will scaffold with outdated templates
   - **Write PR descriptions**: Include clear explanations of changes
   - **Request snapshot builds**: Comment `/snapit` on PR to test changes

2. **Maintainer Actions - Regular Releases**
   - **Merge Version PR**: Review and merge the auto-generated open CI release PR to trigger npm publication
   - **Update changelog.json**: After npm release, manually update this file to enable `h2 upgrade` command
   - **Monitor releases**: Verify packages published correctly and Slack notifications sent

3. **Maintainer Actions - CLI Releases**
   - When cli-hydrogen has updates, create a PR in the Shopify CLI repo and coordinate with Shopify CLI team to request patch release
   - **Update skeleton after CLI release**: Once @shopify/cli releases, update skeleton's package.json
   - **Second cli-hydrogen release**: Often required to bundle the updated skeleton

4. **Maintainer Actions - Major Version Changes**
   - **Update latestBranch**: Edit `.github/workflows/changesets.yml` line 32 when moving to new major version
     - Example: Change `echo "latestBranch=2025-01"` to `echo "latestBranch=2025-05"`
     - Required quarterly with new Storefront API versions
   - **Configure back-fix branches**: Add old calver branches to `.github/workflows/changesets-back-fix.yml`
     - Enables continued patches to previous versions
     - Never add the current calver branch

#### Automatic Steps (CI/CD Handles)

1. **On Every Push to Main**
   - Next release publishes immediately with tag `next`
   - Version: `0.0.0-next-{SHA}-{timestamp}`
   - All packages published regardless of changesets

2. **When Changesets Exist on Main**
   - Version PR automatically created
   - Title: `[ci] release {latestBranch}`
   - Contains version bumps and CHANGELOG updates

3. **When Version PR is Merged**
   - Packages publish to npm with `latest` tag
   - Only packages with changesets get new versions
   - Templates compile and push to `dist` branch
   - Slack notification sent (if Hydrogen package included)
   - GitHub releases created with changelogs

4. **When `/snapit` is Commented**
   - Snapshot version created for PR
   - Packages published with unique tag
   - PR comment updated with installation instructions

5. **On Push to Calver Branches**
   - Back-fix version PR created
   - Publishes with branch name as npm tag when merged

### Version Strategy
- Hydrogen versions follow calendar versioning (calver)
- Format: `YYYY.MAJOR.MINOR/PATCH`
- Example: `2025.5.0` means:
  - `2025` - year
  - `5` - major release cycle (tied to Storefront API versions)
  - `0` - minor/patch number
- Tied to Shopify Storefront API versions
- Breaking changes possible every 3 months with API updates
- Hydrogen releases a new "major" version with **every** Storefront API version update, regardless of whether or not there are breaking changes between the Storefront API versions


### CLI Dependency Graph
The Hydrogen CLI system works through a plugin architecture:

```
Developer's Project (e.g., skeleton template)
    ├── package.json
    │   └── devDependencies
    │       └── @shopify/cli (~3.80.4)
    │
    └── npm scripts
        └── "shopify hydrogen dev" commands
                    ↓
            @shopify/cli (main CLI)
                    ↓
            @shopify/cli-hydrogen (plugin)
                    ↓
            Hydrogen commands available
```

**How it works:**
- **@shopify/cli**: The main Shopify CLI installed in project's devDependencies
- **@shopify/cli-hydrogen**: Plugin package that adds `hydrogen` subcommands
- When `@shopify/cli` detects `@shopify/cli-hydrogen` in dependencies, it loads the plugin
- This enables commands like `shopify hydrogen dev`, `shopify hydrogen build`, etc.
- The plugin uses oclif framework for command structure and hooks

**Example flow:**
1. Developer runs `npm run dev` in their project
2. This executes `shopify hydrogen dev --codegen`
3. `@shopify/cli` receives the command and delegates to `@shopify/cli-hydrogen`
4. The hydrogen plugin executes the dev server with MiniOxygen

## Skeleton Template and Project Scaffolding

### Skeleton Template Location
The skeleton template is the default starter template for new Hydrogen projects:
- Located at `templates/skeleton/` in the Hydrogen repo
- Serves as the foundation for `npm create @shopify/hydrogen@latest`
- Includes both TypeScript configuration (default) and can be transpiled to JavaScript

### How Project Scaffolding Works

When developers run `npm create @shopify/hydrogen@latest`:

1. **Package Resolution**
   - npm resolves `@shopify/create-hydrogen` package
   - This package calls the `hydrogen init` command from `@shopify/cli-hydrogen`

2. **Template Fetching**
   - Downloads the latest Hydrogen release tarball from GitHub
   - Uses GitHub API: `https://api.github.com/repos/shopify/hydrogen/releases/latest`
   - Extracts the skeleton template from the tarball
   - Falls back to local template if running within Hydrogen monorepo

3. **Template Compilation** (during release)
   - On production releases, templates are compiled to the `dist` branch
   - Creates both TypeScript (`skeleton-ts`) and JavaScript (`skeleton-js`) versions
   - The `dist` branch serves as a stable source for templates

### Critical: Skeleton Changes Require CLI Updates

**When modifying the skeleton template, you MUST**:
1. Create a changeset that includes BOTH:
   - The skeleton template changes
   - A version bump for `@shopify/cli-hydrogen`
2. This ensures the CLI contains a snapshot of the latest skeleton in its `dist/assets/templates` directory
3. Without this, newly scaffolded projects will use an outdated skeleton template

**Why this matters**: The `@shopify/cli-hydrogen` package bundles the skeleton template. If you don't bump its version when changing the skeleton, the CLI will continue distributing the old template version.

### CLI Release Coordination (Circular Dependency)

The CLI system has an inherent circular dependency that requires careful coordination:

**The Circular Dependency Problem**:
```
@shopify/cli-hydrogen (bundles skeleton)
    ↓ is included in
@shopify/cli (main Shopify CLI)
    ↓ is used by
skeleton template's devDependencies
    ↓ which is bundled in
@shopify/cli-hydrogen (circular!)
```

**Release Process to Handle This**:

1. **First Release**:
   - Release `@shopify/cli-hydrogen` with new features/fixes
   - Trigger `@shopify/cli` release to include updated `cli-hydrogen`
   - Problem: The skeleton bundled in `cli-hydrogen` still references the OLD `@shopify/cli` version

2. **Second Release Required**:
   - Update skeleton's `package.json` to use new `@shopify/cli` version
   - Create another changeset bumping `@shopify/cli-hydrogen`
   - Release again so future `cli-hydrogen` bundles the updated skeleton

**Example Timeline**:
- Day 1: Release `@shopify/cli-hydrogen@8.1.0` with new command
- Day 2: `@shopify/cli@3.80.0` released with updated hydrogen plugin
- Day 3: Update skeleton to use `@shopify/cli@~3.80.0`
- Day 4: Release `@shopify/cli-hydrogen@8.1.1` with updated skeleton
- Result: New projects now have access to the new command

**Key Takeaways**:
- This process often requires TWO cli-hydrogen releases for complete updates
- The circular dependency makes the process complex but is currently unavoidable
- Always check that skeleton's CLI version matches the features available in cli-hydrogen

## Code Review and Debugging Checklist

**IMPORTANT**: When reviewing PRs, examining code, or debugging issues, ALWAYS systematically check the following areas for potential problems. These checks have caught critical issues in production code.

### Dependency Version Resolution Issues

**CRITICAL**: NPM version range operators (^, ~, >=, etc.) have undefined behavior with non-semver versioning schemes!

When reviewing dependencies, ALWAYS:

1. **Check package.json vs package-lock.json resolution**:
   - Compare the version specified in `package.json` with what's actually resolved in `package-lock.json`
   - Pay special attention to packages that don't follow standard semver (e.g., date-based versions like `4.20250617.1`)
   - Example of a CRITICAL BUG we've encountered:
     ```json
     // package.json shows:
     "miniflare": "^4.20250617.1"

     // But package-lock.json resolved to:
     "miniflare": "3.20250310.1"  // WRONG MAJOR VERSION!
     ```
   - This happens because `^` with non-semver versions can resolve unpredictably

2. **For non-semver packages, use exact versions**:
   - ❌ WRONG: `"miniflare": "^4.20250617.1"`
   - ✅ CORRECT: `"miniflare": "4.20250617.1"` (no ^ or ~)

3. **Verify resolution commands to run**:
   ```bash
   # Check what version is actually installed
   npm ls [package-name]

   # Compare package.json spec with lock file
   grep -A 2 '"[package-name]"' package.json
   grep -A 5 '"node_modules/[package-name]"' package-lock.json

   # For workspace packages, check all occurrences
   find . -name package.json -exec grep -l '[package-name]' {} \;
   ```

### Workspace Dependency Consistency

When working in a monorepo with workspaces:

1. **Check for version mismatches across packages**:
   - Same dependency should generally use the same version across all workspace packages
   - Exception: When there's a documented reason for version differences

2. **Verify internal package references**:
   - Workspace packages referencing each other should use `workspace:*` protocol or exact versions
   - Check that internal references match the actual package versions

### Common Dependency Red Flags to Check

1. **Mixed version range operators**: If most deps use `^` but some use `~` or exact, investigate why
2. **Outdated lock files**: Check if package-lock.json is in sync with package.json changes
3. **Duplicate packages**: Multiple versions of the same package can cause subtle bugs
4. **Peer dependency conflicts**: Ensure peer deps are satisfied and consistent
5. **Security vulnerabilities**: Run `npm audit` to check for known vulnerabilities

### Debugging Process When Issues Arise

If you encounter unexpected behavior during debugging:

1. **IMMEDIATELY check dependencies**:
   - Verify the actual installed versions match expectations
   - Check for version resolution issues as described above
   - Look for recent dependency updates that might have introduced the issue

2. **Document your findings**:
   - When you find a dependency issue, clearly state:
     - What version was expected
     - What version was actually resolved
     - Why the mismatch occurred
     - The fix applied

### Example Code Review Checklist Usage

When asked to review a PR or debug an issue, follow this systematic approach:

```
1. Check all modified package.json files
2. For each dependency change:
   - Verify the version in package-lock.json matches intent
   - Check if the package follows semver
   - If non-semver, ensure exact version is used
3. Run npm ls to verify actual installed versions
4. Check for any npm audit warnings
5. Verify peer dependencies are satisfied
```

**Remember**: A mismatch between package.json and package-lock.json is often the root cause of "works on my machine" bugs!
