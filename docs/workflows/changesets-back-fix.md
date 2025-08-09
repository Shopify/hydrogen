# Changesets Back-fix Workflow

## Overview
The `changesets-back-fix.yml` workflow handles back-fix releases for specific version branches in the Hydrogen monorepo. This workflow enables releasing patches and fixes to previous calendar-versioned (calver) branches without affecting the main branch.

## Trigger Conditions
- **Event**: Push to specified calver branches
- **Branches**: Currently configured for `2025-01` branch
- **Note**: The current calver branch should NOT be added to the trigger list

## Concurrency Control
- **Group**: `changeset-${{ github.head_ref }}`
- **Behavior**: Cancels in-progress runs when a new push occurs to the same branch

## Job Details

### Job: changelog
- **Runs on**: `ubuntu-latest`
- **Condition**: Only runs if the repository owner is 'shopify'
- **Purpose**: Creates back-fix changelog PR or publishes the release

#### Permissions Required
- `contents: write` - For creating commits and tags
- `pull-requests: write` - For creating/updating pull requests
- `id-token: write` - For npm provenance

#### Steps

1. **Checkout Code**
   - Uses: `actions/checkout@v4.2.2`
   - Fetches full Git history (fetch-depth: 0) for accurate changelog generation

2. **Setup Node.js**
   - Uses: `actions/setup-node@v4.4.0`
   - Node version: Defined in `.nvmrc` file
   - Caches npm dependencies

3. **Install Dependencies**
   - Command: `npm ci --legacy-peer-deps`
   - Ensures consistent dependency installation

4. **Format Code**
   - Command: `npm run format`
   - Applies Prettier formatting to ensure consistent code style

5. **Build Distribution**
   - Command: `npm run build`
   - Builds all packages in the monorepo

6. **Create Release PR or Publish**
   - Uses: `changesets/action@v1.4.10`
   - Two possible outcomes:
     - Creates a "Version Packages" PR if there are pending changesets
     - Publishes packages to npm if the version PR is merged
   - Configuration:
     - Version command: `npm run version`
     - Publish command: `npm run changeset -- publish --tag ${{ github.ref_name }}`
     - Commit message: `[ci] back-fix release ${{ github.ref_name }}`
     - PR title: `[ci] back-fix release ${{ github.ref_name }}`
   - NPM packages are published with a tag matching the branch name (e.g., `2025-01`)
   - Enables npm provenance for supply chain security

## Environment Variables
- `GITHUB_TOKEN`: Uses `SHOPIFY_GH_ACCESS_TOKEN` for elevated permissions
- `NPM_TOKEN`: For publishing packages to npm
- `NPM_CONFIG_PROVENANCE`: Set to `true` for npm provenance

## Release Process
1. Developers create changesets on the calver branch for fixes
2. When pushed, this workflow runs
3. If changesets exist, it creates a "Version Packages" PR
4. When the PR is merged, packages are published with the branch name as the npm tag
5. This allows users to install specific back-fix versions using `npm install @shopify/hydrogen@2025-01`

## Key Features
- Enables maintenance of previous releases without affecting main branch
- Uses calendar versioning (calver) for release branches
- Automatically tags npm releases with the branch name
- Ensures all packages are built and formatted before release
- Provides supply chain security through npm provenance