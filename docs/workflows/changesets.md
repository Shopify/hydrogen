# Changesets Main Release Workflow

## Overview
The `changesets.yml` workflow is the primary release automation for the Hydrogen monorepo. It handles creating release PRs, publishing packages to npm, compiling templates, and announcing releases. This is the main workflow that manages the release process when changes are merged to the main branch.

## Trigger Conditions
- **Event**: Push to `main` branch
- **Automatic**: Triggers on every commit to main, including merge commits

## Concurrency Control
- **Group**: `changeset-${{ github.head_ref }}`
- **Behavior**: Cancels in-progress runs when a new push occurs

## Jobs

### 1. Job: changelog
- **Purpose**: Creates release PRs or publishes packages
- **Runs on**: `ubuntu-latest`
- **Condition**: Only runs if repository owner is 'shopify'

#### Permissions
- `contents: write` - For creating commits and tags
- `pull-requests: write` - For creating/updating release PRs
- `id-token: write` - For npm provenance

#### Outputs
- `published`: Boolean indicating if packages were published
- `publishedPackages`: JSON array of published packages with names and versions
- `latest`: Boolean indicating if this is the latest release branch
- `latestBranch`: The current latest branch name (e.g., "2025-05")

#### Steps

1. **Set Flags**
   - Sets `latestBranch` to current calendar version (currently "2025-05")
   - Sets `latest` flag based on whether current branch is main
   - **Important**: The `latestBranch` must be updated when moving to a new major version

2. **Checkout Code**
   - Fetches full Git history for accurate changelog generation

3. **Setup Node.js**
   - Uses version from `.nvmrc`
   - Caches npm dependencies

4. **Install Dependencies**
   - Runs `npm ci --legacy-peer-deps`

5. **Build Packages**
   - Runs `npm run build` to ensure all packages are built

6. **Create Release PR or Publish**
   - Only runs if `latest == 'true'`
   - Uses changesets action to either:
     - Create a "Version Packages" PR if there are pending changesets
     - Publish packages to npm if the version PR is merged
   - Commit message: `[ci] release ${{ env.latestBranch }}`
   - Uses elevated GitHub token for creating PRs
   - Enables npm provenance for supply chain security

### 2. Job: compile
- **Purpose**: Compiles TypeScript templates after release
- **Depends on**: `changelog` job
- **Condition**: Only runs if packages were published and on latest branch

#### Steps

1. **Checkout Code**
2. **Install Dependencies** (with frozen lockfile)
3. **Build Distribution**
4. **Compile Templates**
   - Runs `compile-template-for-dist.mjs` for skeleton template
   - Creates package-lock files for both JS and TS skeleton templates
5. **Update dist Branch**
   - Commits compiled templates
   - Force pushes to `dist` branch
   - Uses "Hydrogen Bot" as committer

### 3. Job: slack_announcement
- **Purpose**: Announces Hydrogen releases to Slack
- **Depends on**: `changelog` job
- **Condition**: Only runs if packages were published and on latest branch

#### Steps

1. **Extract Hydrogen Version**
   - Parses published packages JSON
   - Extracts version specifically for `@shopify/hydrogen` package

2. **Post to Slack**
   - Only posts if Hydrogen was included in the release
   - Sends POST request to configured Slack webhook
   - Payload includes the released version number

### 4. Job: sync_latest (Commented Out)
- **Note**: This job is currently disabled but kept for potential future use
- **Purpose**: Would sync package-lock.json and push to version branches

## Release Process Flow

1. **Developer creates changesets** during development
2. **Changesets are merged** to main branch
3. **This workflow triggers** and creates a "Version Packages" PR
4. **The PR includes**:
   - Updated package versions
   - Compiled changelogs
   - Updated dependencies
5. **When PR is merged**:
   - Packages are published to npm
   - Templates are compiled and pushed to dist branch
   - Slack announcement is sent
6. **Commit message pattern** prevents triggering next-release workflow

## Key Features

- **Automated Versioning**: Uses changesets for semantic versioning
- **Template Compilation**: Automatically compiles TypeScript templates for distribution
- **Release Announcements**: Notifies team via Slack for Hydrogen releases
- **npm Provenance**: Ensures supply chain security for published packages
- **Branch Management**: Maintains a separate `dist` branch for compiled templates
- **Calendar Versioning**: Uses calendar-based version branches (e.g., 2025-05)

## Environment Variables & Secrets
- `SHOPIFY_GH_ACCESS_TOKEN`: GitHub token with elevated permissions
- `NPM_TOKEN`: For publishing to npm registry
- `SLACK_NOTIFICATION_URL`: Webhook URL for Slack announcements

## Important Notes
- The `latestBranch` variable must be manually updated when creating new major versions
- The workflow uses specific commit messages to coordinate with other workflows
- The dist branch is force-pushed, so it should not be used for development
- Only packages with changesets will be included in releases