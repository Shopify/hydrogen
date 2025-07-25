# Changesets Linter Workflow

## Overview
The `changesets-linter.yml` workflow validates changeset files in pull requests to ensure they follow the correct format and don't include ignored packages. This is a quality control mechanism to maintain consistency in the changelog generation process.

## Trigger Conditions
- **Event**: All pull requests
- **Branches**: Runs on all branches when a PR is opened, synchronized, or reopened

## Job Details

### Job: lint
- **Name**: Lint Changelog
- **Runs on**: `ubuntu-latest`
- **Purpose**: Validates changeset files for format compliance

#### Steps

1. **Checkout Code**
   - Uses: `actions/checkout@v4.2.2`
   - Fetches the PR code for analysis

2. **Lint Changesets**
   - Command: `node scripts/lint-changesets.mjs`
   - Runs a custom linting script to validate changesets

## Linting Rules

The `lint-changesets.mjs` script enforces two main rules:

### 1. Ignored Package Detection
- Reads the list of ignored packages from `.changeset/config.json`
- Scans all `.md` files in the `.changeset` directory
- Checks if any ignored packages are referenced in the changeset frontmatter
- **Failure**: If an ignored package is found, the workflow fails with an error message
- **Rationale**: This addresses a known issue with changesets ([#436](https://github.com/changesets/changesets/issues/436)) where ignored packages can still appear in changelogs

### 2. Markdown Header Validation
- Ensures the first line of changeset content (after frontmatter) is NOT a markdown header
- **Requirement**: Changesets must begin with plain text
- **Allowed**: Markdown headers can be used later in the body
- **Failure**: If the first line starts with `#`, the workflow fails
- **Rationale**: Ensures consistent formatting for changelog generation

## Error Messages

When validation fails, the workflow provides specific error messages:

1. **Ignored Package Error**:
   ```
   The changeset [filepath] contains an ignored package: [package-name]. 
   Please remove it from the changeset. If it is the only package in the changeset, 
   remove the changeset entirely.
   ```

2. **Header Error**:
   ```
   The first line of changeset [filepath] begins with a header: 
   [header-content]
   
   Changesets must begin with plain text. Please replace the header in the first line with a plain string. 
   You may use markdown headers later in the body if desired.
   ```

## Success Messages
- `✅ No ignored packages found in changeset [filepath].`
- `✅ First line begins with plain text in changeset [filepath].`
- `✅ No changeset issues detected.`

## Purpose
This workflow ensures:
1. Changesets don't accidentally include packages that should be ignored
2. Changesets follow a consistent format for proper changelog generation
3. Early detection of formatting issues before merge
4. Maintains the quality of release notes and changelogs

## Integration with PR Process
- Runs automatically on every PR
- Blocks merge if validation fails
- Provides clear feedback for contributors to fix issues
- Lightweight and fast execution