# Snapit Workflow

## Overview
The `snapit.yml` workflow enables on-demand snapshot releases from pull requests. Contributors and maintainers can trigger a snapshot build by commenting `/snapit` on a PR, allowing for easy testing of changes before merging.

## Trigger Conditions
- **Event**: Issue comment creation
- **Command**: `/snapit` (exact match)
- **Context**: Must be on a pull request (not a regular issue)

## Purpose
- Test PR changes without merging
- Share preview versions with stakeholders
- Validate fixes before release
- Enable QA testing of specific changes

## Job Details

### Job: snapit
- **Name**: Snapit
- **Runs on**: `ubuntu-latest`
- **Condition**: PR comment must be exactly `/snapit`

#### Permissions
- `contents: write` - For creating changeset files
- `pull-requests: write` - For commenting on PRs
- `id-token: write` - For npm provenance

#### Security Note
"This action can be executed by users with write permission to this repo"

#### Steps

1. **Checkout Current Branch**
   - Uses: `actions/checkout@v4.2.2`
   - Checks out the PR branch

2. **Force Snapshot Changeset**
   - Creates a temporary changeset file
   - Path: `.changeset/force-snapshot-build.md`
   - Content:
     ```yaml
     ---
     '@shopify/hydrogen': patch
     '@shopify/remix-oxygen': patch
     '@shopify/cli-hydrogen': patch
     '@shopify/create-hydrogen': patch
     ---
     
     Force snapshot build.
     ```
   - Forces all main packages to be included in snapshot

3. **Create Snapshot Version**
   - Uses: `Shopify/snapit@[pinned-commit]`
   - Configuration:
     - **Included packages**: 
       - `@shopify/hydrogen`
       - `@shopify/cli-hydrogen`
       - `@shopify/hydrogen-codegen`
       - `@shopify/mini-oxygen`
       - `@shopify/remix-oxygen`
     - **Build script**: `npm run build`
     - **Custom message**: Instructions for using the snapshot

## Output

### GitHub Comment
The workflow posts a comment on the PR with:
1. List of published packages and versions
2. Installation instructions
3. Custom usage message:
   ```
   Create a new project with all the released packages running `npm create @shopify/hydrogen@<snapshot_version>`
   To try a new CLI plugin version, add `@shopify/cli-hydrogen` as a dependency to your project using the snapshot version.
   ```

### Version Format
Snapshot versions follow the pattern:
```
[current-version]-snapshot-[pr-number]-[timestamp]
```
Example: `2024.1.0-snapshot-1234-20240115120000`

## Usage Flow

1. **Developer creates PR** with changes
2. **Someone comments** `/snapit` on the PR
3. **Workflow triggers** and builds packages
4. **Packages publish** to npm with snapshot tag
5. **Comment posted** with version details
6. **Testing begins** using snapshot versions

## Key Features

### Force Changeset Strategy
- Creates artificial changeset for all main packages
- Ensures consistent versioning across packages
- Marks all changes as "patch" level

### Package Selection
- Includes all core Hydrogen packages
- Ensures ecosystem compatibility
- Allows full stack testing

### npm Publishing
- Publishes with unique snapshot tags
- Enables provenance for security
- Available immediately on npm

## Benefits

1. **Pre-merge Testing**: Test changes without merging
2. **Stakeholder Review**: Share working versions easily
3. **Integration Testing**: Test with real projects
4. **Risk Reduction**: Validate before official release

## Example Usage

### Creating a New Project
```bash
npm create @shopify/hydrogen@0.0.0-snapshot-1234-20240115120000
```

### Adding CLI to Existing Project
```bash
npm install @shopify/cli-hydrogen@0.0.0-snapshot-1234-20240115120000
```

## Security Considerations

### Access Control
- Only users with write permission can trigger
- Prevents arbitrary code execution by external users
- PR must exist (not just any issue)

### Package Safety
- Snapshot versions are clearly marked
- Won't be installed by default
- Temporary testing versions only

## Troubleshooting

### Common Issues
1. **No Response**: Check exact command spelling
2. **Permission Denied**: User needs write access
3. **Build Failures**: Check PR has valid code

### Debugging
- Check Actions tab for workflow logs
- Verify all packages build successfully
- Ensure npm tokens are valid

## Best Practices

1. **Clean Up**: Remove snapshot versions after testing
2. **Communication**: Note which snapshot version was tested
3. **Documentation**: Include test results in PR
4. **Scope**: Only test what's needed

## Integration with Release Process
- Complements next releases (commit-based)
- Independent of main release cycle
- Allows PR-specific testing
- No impact on version numbers