# CLA (Contributor License Agreement) Workflow

## Overview
The `cla.yml` workflow manages the Contributor License Agreement process for the Hydrogen repository. It ensures that all contributors have signed Shopify's CLA before their contributions can be merged.

## Trigger Conditions
The workflow triggers on two events:

1. **Pull Request Events**:
   - When a PR is opened
   - When a PR is synchronized (new commits pushed)

2. **Issue Comments**:
   - When a comment is created on an issue
   - Specifically looks for comments containing the word "signed"

## Job Details

### Job: cla
- **Runs on**: `ubuntu-latest`
- **Purpose**: Verifies CLA signature status

#### Execution Conditions
The job runs only when specific conditions are met:

**For Issue Comments**:
- The issue must have an associated pull request
- The pull request must not be merged
- The comment must contain the word "signed"

**For Pull Requests**:
- The pull request must not be merged
- The commits must not contain release messages:
  - `[ci] release`
  - `[ci] Update package-lock.json`

#### Steps

1. **CLA Verification**
   - Uses: `Shopify/shopify-cla-action@v1`
   - Tokens:
     - `github-token`: Standard GitHub token for API access
     - `cla-token`: Special token for CLA verification service

## How It Works

### Initial PR Submission
1. When a contributor opens a PR, the workflow checks their CLA status
2. If unsigned, the action posts a comment with instructions to sign
3. The PR is marked with a status check that blocks merging

### Signing Process
1. Contributors follow the link in the comment to sign the CLA
2. After signing, they comment "signed" on the PR
3. This triggers the workflow to re-verify their status
4. If successful, the status check turns green

### Automated Verification
- The action maintains a list of users who have signed
- Subsequent PRs from signed contributors pass automatically
- Organization members may be exempt based on configuration

## Special Cases

### Excluded Commits
The workflow skips verification for:
- Release commits (`[ci] release`)
- Package lock updates (`[ci] Update package-lock.json`)

These are typically automated commits that don't require CLA verification.

### Re-triggering Verification
Contributors can re-trigger CLA verification by:
- Commenting "signed" on their PR
- Pushing new commits to the PR

## Integration with PR Process
- **Blocking**: Unsigned CLAs block PR merging
- **Non-invasive**: Only comments when action is needed
- **Persistent**: Status persists across commits once signed

## Benefits
1. **Legal Compliance**: Ensures all contributions are properly licensed
2. **Automation**: Reduces manual verification burden
3. **Transparency**: Clear status and instructions for contributors
4. **Persistence**: One-time signing covers all future contributions

## Troubleshooting
If a contributor has issues:
1. Ensure they're signed in to GitHub when signing
2. Check that the email matches their commit email
3. Comment "signed" after completing the process
4. Contact maintainers if problems persist

## Security Considerations
- Uses `pull_request_target` for forks to access secrets safely
- CLA token is kept secure and separate from general GitHub token
- Action only has read access to PR data and write access to comments/status