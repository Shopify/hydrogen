# Test Upgrade Flow Workflow

## Overview
The `test-upgrade-flow.yml` workflow specifically tests the upgrade flow functionality when the `changelog.json` file is modified. This ensures that the CLI's upgrade mechanism correctly detects and handles version changes from the changelog.

## Trigger Conditions
The workflow runs on three events:

1. **Push Events**
   - When `docs/changelog.json` is modified

2. **Pull Request Events**
   - When `docs/changelog.json` is modified in a PR

3. **Manual Trigger**
   - Via `workflow_dispatch` for on-demand testing

## Purpose
- Validate CLI upgrade functionality
- Ensure version detection from changelog works
- Test upgrade flow with local changelog source
- Prevent breaking changes to upgrade mechanism

## Job Details

### Job: test-upgrade-flow
- **Runs on**: `ubuntu-latest`
- **Purpose**: Run specific tests for the upgrade flow feature

#### Steps

1. **Checkout Code**
   - Uses: `actions/checkout@v4`
   - Gets the latest code including changelog changes

2. **Setup Node.js**
   - Uses: `actions/setup-node@v4`
   - Node version: 18
   - Caches npm dependencies

3. **Install Dependencies**
   - Command: `npm ci`
   - Installs all monorepo dependencies

4. **Build Packages**
   - Command: `npm run build:pkg`
   - Builds all packages required for testing

5. **Run Upgrade Flow Tests**
   - Working directory: `packages/cli`
   - Command: `npm test upgrade-flow.test.ts`
   - Environment variables:
     - `FORCE_CHANGELOG_SOURCE: local` - Forces local changelog usage
     - `SHOPIFY_HYDROGEN_FLAG_FORCE: 1` - Enables force flag

6. **Report Results**
   - Condition: Always runs (`if: always()`)
   - Outputs success message
   - Explains test purpose

## Test Focus

### What It Tests
The `upgrade-flow.test.ts` file specifically validates:
- Dynamic version detection from `changelog.json`
- Upgrade path calculations
- Version compatibility checks
- Changelog parsing and interpretation

### Environment Configuration
- **FORCE_CHANGELOG_SOURCE=local**: 
  - Bypasses remote changelog fetching
  - Uses local `docs/changelog.json` file
  - Ensures tests run against current changes

- **SHOPIFY_HYDROGEN_FLAG_FORCE=1**:
  - Enables forced upgrade behavior
  - Bypasses certain safety checks
  - Allows testing edge cases

## Integration with Changelog

### Changelog Structure
The `docs/changelog.json` file contains:
- Version history
- Breaking changes
- Upgrade paths
- Migration instructions

### Test Validation
Tests ensure:
- Changelog format is valid
- Version detection works correctly
- Upgrade recommendations are accurate
- Breaking changes are properly flagged

## Use Cases

### Automated Testing
- Runs automatically when changelog updates
- Catches issues before merge
- Validates upgrade flow integrity

### Manual Testing
- Developers can trigger via GitHub UI
- Useful for debugging upgrade issues
- Allows testing without changelog changes

## Benefits

1. **Early Detection**: Catches upgrade flow issues immediately
2. **Changelog Validation**: Ensures changelog changes don't break CLI
3. **Focused Testing**: Only runs relevant tests
4. **Fast Feedback**: Quick validation of changes

## Troubleshooting

### Common Issues
1. **Test Failures**:
   - Check changelog.json format
   - Verify version entries are valid
   - Ensure upgrade paths are defined

2. **Build Errors**:
   - Packages must build successfully
   - Check for TypeScript errors

3. **Environment Issues**:
   - Verify environment variables are set
   - Check Node.js version compatibility

## Development Workflow

When modifying upgrade functionality:
1. Update `docs/changelog.json` with changes
2. Push changes to trigger workflow
3. Monitor test results
4. Fix any failing tests
5. Ensure backward compatibility

## Relationship to Other Workflows
- Independent of release workflows
- Complements CI testing
- Specific to upgrade functionality
- Does not affect deployments or releases