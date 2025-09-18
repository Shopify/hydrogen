# Next Release Workflow

## Overview
The `next-release.yml` workflow creates pre-release versions of packages for early testing. These "next" releases allow developers to test upcoming features before they're officially released. The workflow creates snapshot releases with unique identifiers based on commit SHAs.

## Trigger Conditions
- **Event**: Push to `main` branch
- **Exclusion**: Skips commits starting with `[ci] release` (to avoid conflicts with the main release workflow)
- **Repository**: Only runs for the 'shopify' repository owner

## Purpose
- Provides early access to latest changes
- Enables testing before official releases
- Creates unique versions for each commit
- Publishes to npm with "next" tag

## Job Details

### Job: next-release
- **Name**: ⏭️ Next Release
- **Runs on**: `ubuntu-latest`
- **Condition**: `!startsWith(github.event.head_commit.message, '[ci] release')`

#### Permissions
- `contents: write` - For creating branches and commits
- `pull-requests: write` - For potential PR operations
- `id-token: write` - For npm provenance

#### Outputs
- `NEXT_VERSION`: The generated version identifier (e.g., `next-1686a75`)

#### Steps

1. **Checkout Repository**
   - Fetches full Git history (`fetch-depth: 0`)
   - Required for changeset operations

2. **Setup Node.js**
   - Uses version from `.nvmrc`
   - Caches npm dependencies

3. **Install Dependencies**
   - Command: `npm ci`

4. **Format Code**
   - Command: `npm run format`
   - Ensures consistent formatting

5. **Generate Version Identifier**
   - Gets latest commit SHA
   - Takes first 7 characters
   - Creates version: `next-[SHORT_SHA]`
   - Example: `next-1686a75`

6. **Build CLI** (conditional)
   - Only runs if version was generated
   - Command: `npm run build`

7. **Update Versions**
   - Creates new branch: `next/[VERSION]`
   - Configures Git with bot credentials
   - Runs version scripts:
     - `npm run version:next` - Pre-version setup
     - `npm run changeset -- version --snapshot` - Creates snapshot versions
     - `npm run version:post` - Post-version cleanup
   - Version format: `0.0.0-next-[SHA]-[TIMESTAMP]`
   - Example: `0.0.0-next-1686a75-20230313113149`

8. **Build Packages**
   - Rebuilds with updated versions
   - Ensures packages are ready for publishing

9. **Setup npm Authentication**
   - Configures npm registry
   - Sets authentication token

10. **Publish to npm**
    - Command: `npm run changeset -- publish --tag next`
    - Publishes all packages with "next" tag
    - Enables npm provenance for security

## Version Format
The snapshot version follows this pattern:
```
0.0.0-[tag]-[timestamp]
```
Where:
- `0.0.0` - Base version for snapshots
- `[tag]` - The generated tag (e.g., `next-1686a75`)
- `[timestamp]` - Publication timestamp

## Usage by Developers
Developers can install next releases:
```bash
npm install @shopify/hydrogen@next
```

This installs the latest "next" tagged version.

## Key Features

### Automatic Snapshot Creation
- Every commit to main gets a snapshot
- Unique identifiers prevent conflicts
- Timestamps ensure ordering

### npm Tag Strategy
- Uses "next" tag instead of "latest"
- Prevents accidental installation by users
- Clear separation from stable releases

### Provenance
- `NPM_CONFIG_PROVENANCE: true`
- Links packages to source code
- Enhances supply chain security

## Integration with Release Process

### Coordination with Main Release
- Checks commit message to avoid conflicts
- Main release commits contain `[ci] release`
- Ensures only one release type per commit

### Branch Strategy
- Creates temporary branches for versioning
- Branch name: `next/[VERSION]`
- Not pushed to remote (local only)

## Benefits

1. **Early Testing**: Features available immediately
2. **Unique Versions**: Every commit is installable
3. **Safe Testing**: Won't affect production users
4. **Traceability**: Versions tied to specific commits

## Troubleshooting

### Common Issues
1. **npm Authentication**: Verify `NPM_TOKEN` secret
2. **Build Failures**: Check that packages build cleanly
3. **Version Conflicts**: Ensure no `[ci] release` in message

### Version Lookup
To find the commit for a next version:
- Extract SHA from version string
- Example: `0.0.0-next-1686a75-...` → commit `1686a75`

## Security
- Bot credentials for Git operations
- npm token stored as secret
- Provenance ensures package authenticity