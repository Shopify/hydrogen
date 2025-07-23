# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
      - If changesets are found, creates OR updates "Version Packages" PR
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
- Instead, your changeset is added to the "Version Packages" PR
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
   - **Write PR descriptions**: Include clear explanations of changes
   - **Request snapshot builds**: Comment `/snapit` on PR to test changes

2. **Maintainer Actions - Regular Releases**
   - **Merge Version PR**: Review and merge the auto-generated "Version Packages" PR to trigger npm publication
   - **Update changelog.json**: After npm release, manually update this file to enable `h2 upgrade` command
   - **Monitor releases**: Verify packages published correctly and Slack notifications sent

3. **Maintainer Actions - Major Version Changes**
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

### CLI Version Coordination

**Critical Dependency Chain**:
```
@shopify/cli-hydrogen (in Hydrogen repo)
    ↓ used by
@shopify/cli (main Shopify CLI)
    ↓ installed in
skeleton template's devDependencies
```

**Version Update Process**:
1. When updating `@shopify/cli-hydrogen` with new features
2. Must coordinate a minor version release of `@shopify/cli`
3. Then update `skeleton/package.json` to use the new `@shopify/cli` version
4. This ensures new projects get CLI features that match their Hydrogen version

**Example**:
- Update hydrogen CLI with new command → Release `@shopify/cli-hydrogen` v11.1.0
- Shopify releases `@shopify/cli` v3.80.4 with updated hydrogen plugin
- Update skeleton template to use `"@shopify/cli": "~3.80.4"`
- New projects scaffolded will have access to the new command

**Important**: When releasing new Hydrogen CLI features, the skeleton template must be updated to use a version of `@shopify/cli` that includes those features. Otherwise, newly scaffolded projects won't have access to CLI commands that should be available for their Hydrogen version.
