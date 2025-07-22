# Changesets Reminder Workflow

## Overview
The `changesets-reminder.yml` workflow automatically reminds contributors to add changesets when they make user-facing changes to packages. This helps ensure that all significant changes are properly documented in the changelog.

## Trigger Conditions
- **Events**: 
  - Pull request opened
  - Pull request synchronized (new commits pushed)
  - Pull request reopened
  - Pull request marked as ready for review
- **Path Filters**: Triggers only when changes are made to:
  - `packages/*/src/**` - Source code changes
  - `packages/*/package.json` - Package configuration changes
  - Excludes: `*.test.*` files and `*.md` files
- **Draft PR Exclusion**: Does not run on draft pull requests

## Job Details

### Job: remind
- **Name**: Changeset Reminder
- **Runs on**: `ubuntu-latest`
- **Condition**: `${{ !github.event.pull_request.draft }}` - Skips draft PRs

#### Steps

1. **Checkout Code**
   - Uses: `actions/checkout@v4.2.2`
   - Required for the action to analyze the changes

2. **Changelog Reminder**
   - Uses: `mskelton/changelog-reminder-action@v2.0.0`
   - Configuration:
     - `changelogRegex`: `"\\.changeset"` - Looks for files in the `.changeset` directory
     - `message`: Custom reminder message (see below)

## Reminder Message
When changes are detected in package source or configuration but no changeset is found, the workflow posts this comment:

```
We detected some changes in `packages/*/package.json` or `packages/*/src`, and there are no updates in the `.changeset`.
If the changes are user-facing and should cause a version bump, run `npm run changeset add` to track your changes and include them in the next release CHANGELOG.
If you are making simple updates to examples or documentation, you do not need to add a changeset.
```

## Purpose
This workflow serves several important functions:

1. **Changelog Consistency**: Ensures user-facing changes are documented
2. **Version Management**: Helps maintain proper semantic versioning
3. **Developer Education**: Reminds contributors about the changeset process
4. **Flexibility**: Acknowledges that not all changes require changesets (e.g., documentation)

## How It Works
1. Monitors PR changes to detect modifications in package source code or package.json files
2. Checks if a corresponding changeset file exists
3. If no changeset is found and changes are in watched paths, posts a reminder comment
4. The action is smart enough to:
   - Ignore test files (files matching `*.test.*`)
   - Ignore markdown documentation files
   - Skip draft PRs to avoid premature reminders

## Developer Workflow
When this reminder appears:

1. **For user-facing changes**: Run `npm run changeset add` and follow the prompts
2. **For internal changes**: No action needed if changes don't affect users
3. **For documentation/examples**: No changeset required

## Integration Benefits
- Automates changelog maintenance
- Reduces manual review burden
- Ensures releases have comprehensive changelogs
- Helps maintain professional release notes
- Provides clear guidance to contributors