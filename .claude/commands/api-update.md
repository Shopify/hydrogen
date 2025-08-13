# API Version Update Guide for Hydrogen

## Task Overview
Update the Storefront API (SFAPI) and Customer Account API (CAAPI) versions across the Hydrogen repository to match the latest Shopify API release cycle. This guide is specifically for MAJOR version updates (e.g., 2025.1.0, 2025.4.0, 2025.7.0, 2025.10.0) that occur quarterly.

## Step 0: Initial Setup

### 1. Determine Target Version
**ASK USER**: "What major version is this PR for?"
- Check current version in `packages/hydrogen-react/codegen.ts` for `const SF_API_VERSION`
- Suggest the next quarterly version based on pattern: YYYY-01, YYYY-04, YYYY-07, or YYYY-10
- Example: If current is '2025-04', suggest '2025-07'

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Identified current API version and confirmed target version for update.

### 2. Create Feature Branch
**CONFIRM WITH USER**: "I will create a new branch named `{TARGET_VERSION}-sfapi-caapi-update` where TARGET_VERSION is the new API version (e.g., 2025-07). Is this correct?"
- Create branch: `git checkout -b {TARGET_VERSION}-sfapi-caapi-update`
- Example: `git checkout -b 2025-07-sfapi-caapi-update`

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Created feature branch for API update work.

## Critical Context
- **API Version Format**: `YYYY-MM` where MM is always 01, 04, 07, or 10 (quarterly releases)
- **Version Synchronization**: SFAPI and CAAPI versions MUST always match for a given update
- **Major Version Only**: This process results in major version bumps (breaking changes expected with each quarterly API release)
- **Type Safety**: Generated types ensure full type safety across Hydrogen components

## Prerequisites
Before starting, verify:
1. The new API version follows the quarterly pattern: `YYYY-01`, `YYYY-04`, `YYYY-07`, or `YYYY-10`
2. Both SFAPI and CAAPI will use the SAME version
3. You have network access to fetch schemas from Shopify's GraphQL endpoints

## Critical Files to Update

### 1. Version Constants (MUST UPDATE)

**IMPORTANT**: Read each file first before editing to ensure proper context.

1. **File**: `packages/hydrogen-react/src/storefront-api-constants.ts`
   - Read the file first
   - Update: `export const SFAPI_VERSION = 'YYYY-MM';`
   - Example: Change from `'2025-07'` to `'2025-10'`
  
2. **File**: `packages/hydrogen/src/customer/constants.ts`
   - Read the file first
   - Update: `export const DEFAULT_CUSTOMER_API_VERSION = 'YYYY-MM';`
   - Example: Change from `'2025-07'` to `'2025-10'`

3. **File**: `packages/hydrogen-react/codegen.ts`
   - Read the file first
   - Update both constants on consecutive lines:
     - `const SF_API_VERSION = 'YYYY-MM';`
     - `const CA_API_VERSION = 'YYYY-MM';`
   - Example: Change both from `'2025-07'` to `'2025-10'`

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Updated all version constants in 3 files to the new API version (both SFAPI and CAAPI).

### 2. Compatibility Date (CONDITIONAL)
- `packages/hydrogen/src/vite/compat-date.ts`
  - **ASK USER**: "Do you want to update the Cloudflare Workers compatibility date? If yes, what date should it be?"
  - This refers to Cloudflare Workers compatibility_date and may not always need updating
  - If updating, typically use: `const COMPAT_DATE = 'YYYY-MM-01';`

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Confirmed whether Cloudflare Workers compatibility date needs updating (often not required).

### 3. Type Generation and Build (CRITICAL SEQUENCE - REQUIRED)

**⚠️ CRITICAL**: The following steps MUST be done in exact order to ensure proper type resolution:

#### Step 3a: Generate New Types in hydrogen-react
1. Navigate to `packages/hydrogen-react/`
2. Run: `npm run graphql-types`
3. **IMPORTANT**: Return to the root directory: `cd ../..`
4. This will fetch the latest schemas and generate:
   - `src/storefront-api-types.d.ts` - TypeScript types for SFAPI
   - `src/customer-account-api-types.d.ts` - TypeScript types for CAAPI
   - `storefront.schema.json` - Full SFAPI schema
   - `customer-account.schema.json` - Full CAAPI schema

**Validation**: Verify these source files were updated:
```bash
ls -la packages/hydrogen-react/src/*-api-types.d.ts
ls -la packages/hydrogen-react/*.schema.json
```

#### Step 3b: Build hydrogen-react Package (REQUIRED)
**This step is critical for other packages to resolve types correctly:**
```bash
cd packages/hydrogen-react
npm run build
cd ../..
```

**Validation**: Verify the dist folder was created with types:
```bash
ls -la packages/hydrogen-react/dist/types/storefront-api-types.d.ts
# Should show the file exists with recent timestamp
```

#### Step 3c: Build All Packages
```bash
npm run build:pkg
```

**Validation**: Verify build completes without errors:
- Check that all packages in the build output show success
- No TypeScript resolution errors should appear

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Generated new API types, built hydrogen-react package (critical for type resolution), and built all packages.

### 4. Documentation Generation
Run the documentation build to update any auto-generated docs:
```bash
npm run build-docs --workspace=@shopify/hydrogen-react
```
This will update generated documentation based on component changes.

**Validation**: Verify this file was updated (check timestamp or git status):
- `packages/hydrogen/docs/generated/generated_docs_data.json`

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Built documentation to update auto-generated docs with new API version information.

### 5. Regenerate Skeleton Generated Types
After building packages, regenerate the skeleton template's GraphQL types:
```bash
cd templates/skeleton
npm run codegen
cd ../..
```
**Note**: This step MUST be done after `npm run build:pkg` as the skeleton depends on the built hydrogen-react types.

**Validation**: Verify these files were regenerated:
- `templates/skeleton/storefrontapi.generated.d.ts`
- `templates/skeleton/customer-accountapi.generated.d.ts`

**Common Issues**: 
- If you see errors about unknown types (e.g., `LanguageCode`), this indicates breaking changes in the API that need to be addressed
- The skeleton codegen depends on the built packages, so ensure `npm run build:pkg` completed successfully first

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Regenerated skeleton template's GraphQL types. Note any codegen errors that may indicate breaking API changes.

### 6. Documentation Files (Manual Updates)
Search and update API version references in:
- `**/*.doc.ts` files - Update example code blocks to use new API version
- `**/*.stories.tsx` files - Update Storybook examples
- `**/*.example.{js,jsx,ts,tsx}` files - Update example files
- Test files that reference specific API versions

Use grep to find all occurrences:
```bash
grep -r "YYYY-MM" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
```

**Validation**: After updating all references, run initial validation:
```bash
npm run typecheck
npm run lint
npm test
```
**Important**: Keep track of any errors that occur - these will be presented together with schema changes and changelog issues at the end.

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Updated all hardcoded API version references in documentation, examples, and stories. Noted any type/lint/test errors for final review.

### 7. Test Files
Update API version references to ensure tests work with new API versions:
- `packages/hydrogen-react/src/storefront-client.test.ts`
- `packages/hydrogen-react/src/ShopifyProvider.test.tsx`
- `packages/hydrogen/src/customer/customer-account-helper.test.ts`
- Any other test files that reference specific API versions

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Updated all test files with new API version references to ensure tests pass.

### 8. Package Versions (CHANGESET - REQUIRED)
Create a changeset file that includes version bumps for:
- `@shopify/hydrogen` - **major** (components depend on new API schemas)
- `@shopify/hydrogen-react` - **major** (direct API integration)
- `@shopify/cli-hydrogen` - **patch** (bundles updated skeleton, but CLI commands unchanged)
- `skeleton` - **major** (uses new Hydrogen version)

**Why cli-hydrogen only needs patch:**
- The CLI's public API (commands, flags, behavior) remains unchanged
- It only bundles an updated skeleton template with new dependencies
- This is similar to a data update rather than a functionality change
- Users creating new projects expect to get the latest template versions

Example changeset:
```
---
'@shopify/hydrogen': major
'@shopify/hydrogen-react': major
'@shopify/cli-hydrogen': patch
'skeleton': major
---

Update Storefront API and Customer Account API to version YYYY-MM
```

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Created changeset file with major version bumps for all affected packages.

## Critical Step: Analyze API Changes

### Fetch and Analyze API Changes
Analyze what's new in the API version:

```bash
curl --silent --request POST \
  --url https://changelog.shopify.com/graphql \
  --header 'content-type: application/json' \
  --data '{
  "query": "query GetStorefrontCustomerUpdates($apiVersion: String!) { developer { posts(first: 50, apiTypeFilter: \"storefront-graphql,customer-account-graphql\", apiVersionFilter: $apiVersion, scopeFilter: PUBLISHED) { pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { slug title excerpt content permalink postedAt effectiveAt effectiveApiVersion indicatesActionRequired primaryTag { handle displayName } secondaryTag { handle displayName } affectedApi { handle displayName } } } } }",
  "variables": {
    "apiVersion": "YYYY-MM"
  }
}' | jq -r '.data.developer.posts.nodes[] | "
## \(.title)
**API**: \(.affectedApi[].displayName // "N/A")  
**Type**: \(.secondaryTag.displayName // "N/A")  
**Action Required**: \(.indicatesActionRequired)  
**Excerpt**: \(.excerpt)
"'
```

For raw JSON output (useful for further processing):
```bash
curl --silent --request POST \
  --url https://changelog.shopify.com/graphql \
  --header 'content-type: application/json' \
  --data '{
  "query": "query GetStorefrontCustomerUpdates($apiVersion: String!) { developer { posts(first: 50, apiTypeFilter: \"storefront-graphql,customer-account-graphql\", apiVersionFilter: $apiVersion, scopeFilter: PUBLISHED) { pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { slug title excerpt content permalink postedAt effectiveAt effectiveApiVersion indicatesActionRequired primaryTag { handle displayName } secondaryTag { handle displayName } affectedApi { handle displayName } } } } }",
  "variables": {
    "apiVersion": "YYYY-MM"
  }
}' | jq '.data.developer.posts.nodes'
```

**Important**: Use the format `YYYY-MM` (e.g., `2025-07`), NOT `YYYY.MM.0` format.

**Validation**: Ensure the response contains at least one changelog entry for either:
- Storefront GraphQL API (`"handle":"storefront-graphql"`)
- Customer Account API (`"handle":"customer-account-graphql"`)

If no changes are found, verify the API version format is correct.

### Generate Detailed API Changes Report

Create a comprehensive report with the following format:

```markdown
# 📊 API Changes Report for Version YYYY-MM

## Executive Summary
- **Total Changes**: X changes across Storefront and Customer Account APIs
- **Breaking Changes**: Y breaking changes identified
- **Action Required**: Z changes require immediate attention

## Customer Account API Changes

### 1. [Feature Title from Changelog]
**Type**: New Feature / Breaking Change / Update
**Effective Date**: YYYY-MM-DD
**Action Required**: Yes/No
**Changelog**: [Link to changelog entry]

**Description**: 
[Full description from API changelog]

**Technical Impact**:
- Affected files/components in Hydrogen:
  - `packages/hydrogen/src/customer/*` - [specific files]
  - `templates/skeleton/app/graphql/customer-account/*` - [specific queries]
- New types/fields available:
  - `TypeName.fieldName` - Description
- Deprecated fields (if any):
  - `OldType.oldField` - Migration required to `NewType.newField`

**Implementation Opportunities**:
- [ ] Add support for [new feature] in [component]
- [ ] Update [query] to use new field
- [ ] Create helper function for [functionality]

**Example Usage**:
```graphql
# New query capability example
query CustomerWithNewField {
  customer {
    newField {
      subField
    }
  }
}
```

## Storefront API Changes

### 1. [Feature Title from Changelog]
[Same format as above]

## Breaking Changes Summary

### ⚠️ Critical Breaking Changes
1. **[Breaking Change Title]**
   - **Impact**: [What breaks]
   - **Migration Path**: [How to fix]
   - **Affected Areas**: [List of files/components]
   - **Priority**: P0 - Must fix before merge

## Implementation Checklist

### Required Updates (P0 - Blockers)
- [ ] Fix [breaking change] in [location]
- [ ] Update [component] to handle [new requirement]

### Recommended Enhancements (P1 - This PR)
- [ ] Implement [new feature] support in [component]
- [ ] Add [new field] to [query]

### Future Opportunities (P2 - Follow-up PRs)
- [ ] Create new component for [feature]
- [ ] Add example for [new capability]
```

### Review Required Actions
1. **Categorize each change** from the changelog data

2. **Generate implementation tasks** for each change

3. **Identify affected code areas** by searching for:
   - GraphQL queries that could use new fields
   - Components that could benefit from new features
   - Test files that need updates

4. **Create actionable tasks** with specific file paths

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Analyzed API changelog for breaking changes and new features. Identified any gaps that need addressing.

## Validation Steps

### 1. Run Type Generation
```bash
cd packages/hydrogen-react
npm run graphql-types
cd ../..
```
- Verify no errors occur
- Check that generated files have updated timestamps
- **IMPORTANT**: Remember to return to root directory after running commands

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Verified type generation runs without errors.

### 2. Build Documentation
```bash
npm run build-docs --workspace=@shopify/hydrogen-react
```

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Verified documentation builds successfully.

### 3. Search for Outdated References
Use these commands to find any missed updates:
```bash
# Search for old version patterns (adjust dates as needed)
grep -r "YYYY-MM" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
# Replace YYYY-MM with the OLD version being replaced
```

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Verified no old API version references remain in the codebase.

### 4. Run Type Validation (CRITICAL)
**Important**: Run typecheck to catch any type resolution issues early:

#### Step 4a: Test hydrogen-react types
```bash
cd packages/hydrogen-react
npm run typecheck
cd ../..
```

#### Step 4b: Test hydrogen package types
```bash
cd packages/hydrogen
npm run typecheck
cd ../..
```

**Common Issues and Solutions**:
- If you see `Cannot find module '@shopify/hydrogen-react/storefront-api-types'`:
  - Ensure you ran `npm run build` in `packages/hydrogen-react` first
  - Verify `packages/hydrogen-react/dist/types/storefront-api-types.d.ts` exists
- If typecheck fails with many errors, the packages may need rebuilding:
  ```bash
  cd packages/hydrogen-react
  npm run graphql-types
  npm run build
  cd ../..
  npm run build:pkg
  ```

#### Step 4c: Run Full Test Suite
```bash
npm test
npm run lint
```

**✅ CHECKPOINT**: Pause and ask the user to confirm before moving to the next task.
**Summary**: Verified type checking succeeds in all packages, tests pass, and linting has no errors.

## Common Pitfalls to Avoid

1. **Type Resolution Failures**: The hydrogen package depends on built types from hydrogen-react
   - **Problem**: `Cannot find module '@shopify/hydrogen-react/storefront-api-types'`
   - **Solution**: ALWAYS build hydrogen-react (`npm run build`) after generating types and before building other packages
   - **Order matters**: graphql-types → build hydrogen-react → build all packages

2. **Missing API feature implementations**: Always check the API changelog for new features that need implementation

3. **Forgetting to ask about compat-date**: Always ask user if Cloudflare Workers compatibility date should be updated

4. **Version consistency**: SFAPI and CAAPI versions MUST match for quarterly releases

5. **Generated files**: Never manually edit generated type files - always use `npm run graphql-types`

6. **Test updates**: Tests must be updated to work with new API versions

7. **Documentation examples**: Update ALL hardcoded version references in examples

8. **Build Order Issues**: 
   - Never skip the hydrogen-react build step
   - The dist/types folder must exist before other packages can build
   - If typecheck fails, rebuild hydrogen-react first

## Important Notes

### Why Major Version Bumps?
- Hydrogen components rely on SFAPI and CAAPI GraphQL queries
- API schemas can change between quarterly releases
- Major version ensures users explicitly upgrade to tested combinations
- Each Hydrogen major version is guaranteed to work with its corresponding API version

### The CLI Bundle Dependency
- `@shopify/cli-hydrogen` bundles the skeleton template
- When skeleton updates with new Hydrogen versions, CLI must also be bumped
- This ensures new projects scaffold with the latest, compatible versions

## Future Improvements (Not Part of This Process)
- **changelog.json updates**: Currently handled in separate PR after release
- **latestBranch updates**: Updated after CI Version PR is merged, before next changesets

## Final Issue Summary & Resolution Plan

After completing all steps, compile a detailed project plan with all issues found:

### Issue Report Format
For each issue discovered, provide:

```markdown
## Issue #X: [Brief Issue Title]

**Summary**: One-line description of the issue

**Details**: 
- Where the issue was discovered (file paths, commands)
- Error messages or symptoms
- Impact on the API update

**Root Cause Analysis**:
- Why this issue occurred
- Related API changes from changelog
- Dependencies affected

**Proposed Solutions**:
1. **Option A**: [Description]
   - Pros: 
   - Cons:
   - Effort: Low/Medium/High
   
2. **Option B**: [Description]
   - Pros:
   - Cons:
   - Effort: Low/Medium/High

**Recommended Approach**: Option X because...

**Implementation Tasks**:
- [ ] Task 1: Specific action needed
- [ ] Task 2: Follow-up action
- [ ] Task 3: Validation step

**Priority**: P0 (Blocker) / P1 (Required for PR) / P2 (Can be separate PR)
```

### Example Issue Report

```markdown
## Issue #1: LanguageCode Type Not Found in Customer Account API

**Summary**: Customer Account API queries fail with "Unknown type LanguageCode" error

**Details**: 
- Discovered during: `npm run codegen` in templates/skeleton
- Error locations: 
  - app/graphql/customer-account/CustomerAddressMutations.ts:6:16
  - app/graphql/customer-account/CustomerDetailsQuery.ts:2:36
- Impact: Skeleton template cannot build, blocking new project creation

**Root Cause Analysis**:
- LanguageCode enum was removed/renamed in CAAPI 2025-07
- Queries still reference the old type name
- May have been replaced with a different localization approach

**Proposed Solutions**:
1. **Option A**: Remove LanguageCode from queries
   - Pros: Quick fix, unblocks builds
   - Cons: Loses localization data
   - Effort: Low
   
2. **Option B**: Replace with new localization type
   - Pros: Maintains functionality
   - Cons: Requires research into new API
   - Effort: Medium

3. **Option C**: Make LanguageCode optional with fallback
   - Pros: Backward compatible
   - Cons: Technical debt
   - Effort: Medium

**Recommended Approach**: Option B - Research the new localization approach and update queries accordingly

**Implementation Tasks**:
- [ ] Search new CAAPI schema for replacement type
- [ ] Update all affected GraphQL queries
- [ ] Test with multiple locales
- [ ] Update any TypeScript interfaces using LanguageCode
- [ ] Verify customer account flows still work

**Priority**: P0 (Blocker) - Skeleton must build for release
```

### Categories to Investigate

#### 1. Schema Breaking Changes
- Skeleton codegen errors (e.g., unknown types)
- Type generation failures
- GraphQL query incompatibilities

**Investigation Steps**:
- Compare old vs new schema files
- Check GraphQL queries in `packages/hydrogen/src/` for incompatible fields
- Review Customer Account API queries in `templates/skeleton/app/graphql/`
- Identify if types were renamed, removed, or restructured

#### 2. Test/Build Failures
- Unit test failures after version updates
- TypeScript compilation errors
- Linting issues
- Build process failures

**Investigation Steps**:
- Run tests with verbose output to identify specific failures
- Check test fixtures for outdated mock data
- Review TypeScript errors for missing/changed types
- Validate import paths and type exports

#### 3. API Feature Gaps
- New API features not yet exposed in Hydrogen
- Missing type exports
- Unutilized API improvements

**Investigation Steps**:
- Cross-reference changelog features with Hydrogen components
- Search for TODOs or comments about missing features
- Check if new fields need to be added to fragments
- Identify opportunities to expose new capabilities

#### 4. Deprecations & Migrations
- Deprecated fields/types still in use
- Required migration paths
- Backward compatibility concerns

**Investigation Steps**:
- Search codebase for deprecated field usage
- Review migration guides from Shopify docs
- Assess impact on existing Hydrogen users
- Plan gradual migration strategy

### Project Plan Summary

After analyzing all issues, create:

1. **PR Blockers (P0)**: Must be fixed before this PR can merge
2. **PR Requirements (P1)**: Should be included in this PR for completeness
3. **Follow-up Work (P2)**: Can be addressed in separate PRs

**✅ FINAL CHECKPOINT**: 
1. Present the complete API Changes Report with all details
2. Offer deep technical investigation:
   ```
   "I can now perform a deep technical investigation for each API change to:
   - Search the entire codebase for affected areas
   - Identify specific components that could use new features
   - Find all GraphQL queries that could be enhanced
   - Create detailed implementation plans with exact file paths
   - Generate code examples for new API features
   
   Which API changes would you like me to investigate in detail?"
   ```
3. Create a prioritized task list based on investigation
4. Save the API Changes Report as `API_CHANGES_REPORT_YYYY-MM.md` in the root directory

## GitHub Issue Creation

### Create GitHub Issues for Actionable Changes

After generating the API Changes Report, create GitHub issues for each P0 and P1 change that requires implementation:

#### Issue Creation Process

1. **Identify Actionable Items**: From the API Changes Report, select all items marked as:
   - P0 (Blockers) - Must create issues
   - P1 (Recommended) - Should create issues
   - P2 (Future) - Optional, ask user if they want issues created

**When to Create Sub-Issues:**
- **Complex Breaking Changes**: Affects 3+ components
- **Cross-cutting Features**: Needs work in multiple packages
- **Large Implementations**: Would take >1 day for single developer
- **Parallel Work Needed**: Multiple developers can work simultaneously

**Keep as Single Issue:**
- **Simple Updates**: Affects 1-2 files
- **Quick Fixes**: Can be done in <2 hours
- **Isolated Changes**: No dependencies on other work

2. **Issue Title Format**:
   ```
   [YYYY-MM API UPDATE] <Brief description of the change>
   ```
   Example: `[2025-07 API UPDATE] Add support for subscription discount data in Customer Account API`

3. **Issue Body Template**:
   ```markdown
   ## Overview
   [One paragraph summary from the API Changes Report]
   
   ## API Version
   - **Version**: YYYY-MM
   - **API**: Storefront/Customer Account
   - **Type**: New Feature/Breaking Change/Update
   - **Changelog**: [Link to official changelog]
   
   ## Technical Details
   [Copy the Technical Impact section from the API Changes Report]
   
   ## Implementation Plan
   [Copy the Implementation Opportunities/Required Updates from the report]
   
   ## 📋 Implementation Sub-Tasks
   <!-- For complex issues, break down into sub-tasks -->
   <!-- GitHub can convert these to real issues via UI -->
   - [ ] **[Component/Area 1]**
     - Specific changes needed
     - File: `path/to/file.ts`
   - [ ] **[Component/Area 2]**  
     - Specific changes needed
     - File: `path/to/file.tsx`
   - [ ] **[Test Coverage]**
     - Test scenarios to cover
   - [ ] **[Documentation]**
     - Docs to update
   
   ## Acceptance Criteria
   - [ ] [Specific measurable outcome]
   - [ ] [Another measurable outcome]
   - [ ] Tests added/updated
   - [ ] Documentation updated if needed
   
   ## Example Usage
   ```graphql
   [Copy any GraphQL examples from the report]
   ```
   
   ## Files to Update
   - `path/to/file1.ts` - [What needs changing]
   - `path/to/file2.tsx` - [What needs changing]
   
   ## Testing Instructions
   1. [Step to verify the implementation]
   2. [Another verification step]
   
   ## Priority
   P0/P1/P2 - [Justification]
   
   ## Related to API Update PR
   This issue is part of the YYYY-MM API version update.
   PR: #[PR_NUMBER]
   
   ---
   *Note: For complex changes, consider converting sub-tasks to separate issues for better tracking.*
   ```

4. **Create Issues Using GitHub CLI**:
   ```bash
   # For each identified change, create an issue
   gh issue create \
     --title "[YYYY-MM API UPDATE] <Title>" \
     --body "$(cat <<'EOF'
   [Issue body content]
   EOF
   )"
   
   # Note: Only add --label flag if labels exist in the repo
   # Common labels: enhancement, bug, breaking-change
   # To check available labels: gh label list
   
   # Optional: Add assignee if needed
   # --assignee @me
   ```

5. **Track Created Issues (Temporary)**:
   ```bash
   # Create temporary tracking file (NOT for commit)
   ISSUE_TRACKING_FILE=".tmp_api_update_issues.txt"
   echo "# Temporary issue tracking - DO NOT COMMIT" > $ISSUE_TRACKING_FILE
   
   # After each issue creation, capture the URL
   ISSUE_URL=$(gh issue create --title "..." --body "..." | tail -1)
   echo "Issue Title|P0|Breaking Change|$ISSUE_URL" >> $ISSUE_TRACKING_FILE
   ```
   
   **Important**: This file is temporary and will be deleted after PR creation

**✅ CHECKPOINT**: Pause and confirm with user before creating issues.
**Summary**: Created GitHub issues for all actionable API changes requiring implementation.

## Create Comprehensive Pull Request

### Generate PR Summary with Issue Tracking Table

After creating all necessary GitHub issues, create a comprehensive PR:

### Enhanced PR Description Template

```markdown
# 🚀 API Version Update: YYYY-MM

## Executive Summary
Updated Storefront API and Customer Account API from version **XXXX-XX** to **YYYY-MM**, introducing X new features, Y improvements, and Z breaking changes.

## 📋 Changes Made
- ✅ Updated version constants in all packages
- ✅ Regenerated GraphQL types and schemas  
- ✅ Updated documentation and examples
- ✅ Updated test fixtures
- ✅ Created tracking issues for all actionable items
- ✅ Generated comprehensive API Changes Report

## 📊 API Changes Overview

| Change | Type | API | Priority | Issue | Status |
|--------|------|-----|----------|-------|--------|
| [Change Title 1] | New Feature | Customer Account | P0 | #[ISSUE_NUM] | 🔴 Not Started |
| [Change Title 2] | Breaking Change | Storefront | P0 | #[ISSUE_NUM] | 🟡 In Progress |
| [Change Title 3] | Update | Customer Account | P1 | #[ISSUE_NUM] | 🟢 Complete |
| [Change Title 4] | New Feature | Storefront | P1 | #[ISSUE_NUM] | 🔴 Not Started |
| [Change Title 5] | Enhancement | Both | P2 | #[ISSUE_NUM] | ⏸️ Future |

### Legend
- 🔴 **Not Started**: Issue created, work pending
- 🟡 **In Progress**: Active development
- 🟢 **Complete**: Implemented and tested
- ⏸️ **Future**: Planned for follow-up PR

## 🔧 Breaking Changes

### ⚠️ [Breaking Change Title]
**Impact**: [What breaks and why]
**Migration**: [How to fix]
**Issue**: #[ISSUE_NUM]

## 📝 Full API Changes Report
See [`API_CHANGES_REPORT_YYYY-MM.md`](./API_CHANGES_REPORT_YYYY-MM.md) for complete details including:
- Technical impact analysis
- Implementation opportunities
- Code examples
- Migration guides

## ✅ Validation Checklist

### Type Safety & Build
- [ ] `npm run typecheck` passes
- [ ] `npm run build:pkg` completes successfully
- [ ] Skeleton template builds without errors
- [ ] No unresolved type imports

### Testing
- [ ] All unit tests pass
- [ ] Integration tests updated for new API
- [ ] Manual testing completed for critical paths
- [ ] B2B flows tested (if applicable)

### Documentation
- [ ] API version references updated
- [ ] Examples use new API version
- [ ] JSDoc comments updated
- [ ] README reflects changes

## 🎯 Implementation Status

### P0 - Blockers (Must Fix)
- [ ] #[ISSUE_NUM]: [Issue title and brief description]
- [ ] #[ISSUE_NUM]: [Issue title and brief description]

### P1 - This PR (Recommended)
- [ ] #[ISSUE_NUM]: [Issue title and brief description]
- [ ] #[ISSUE_NUM]: [Issue title and brief description]

### P2 - Follow-up PRs
- [ ] #[ISSUE_NUM]: [Issue title and brief description]
- [ ] #[ISSUE_NUM]: [Issue title and brief description]

## 📈 Metrics
- **Files Changed**: X files
- **Lines Modified**: +Y / -Z
- **New API Features Exposed**: A
- **Breaking Changes Handled**: B
- **Test Coverage**: C%

## 🔗 Related Links
- [Shopify API Changelog for YYYY-MM](https://shopify.dev/changelog/YYYY-MM)
- [API Changes Report](./API_CHANGES_REPORT_YYYY-MM.md)
- [Migration Guide](link-if-exists)

## 👥 Review Focus Areas
Please pay special attention to:
1. [Specific area needing review]
2. [Another critical review point]
3. [Performance implications if any]

## 🚦 Merge Criteria
This PR is ready to merge when:
- [ ] All P0 issues resolved
- [ ] Type checking passes
- [ ] Tests are green
- [ ] At least 2 approvals from maintainers
- [ ] Changeset file reviewed

## 📅 Next Steps
After merging this PR:
1. Monitor CI for version PR creation
2. Create follow-up PRs for P2 items
3. Update changelog.json after npm release
4. Coordinate CLI release if needed

---
*Generated with API Update Guide v2.0*
```

### Pre-PR Cleanup & Commit

```bash
# CRITICAL: Clean up ALL temporary files before committing
echo "🧹 Cleaning up temporary files before commit..."

# Remove all test/temporary markdown files (but NOT the guide!)
rm -f TEST_*.md
rm -f PR_DESCRIPTION.md
rm -f .tmp_api_update_issues.txt
rm -f created_issues.txt
rm -f TEST_ISSUE_*.md
rm -f API_CHANGES_REPORT_*.md
rm -f api_changes_*.json

# Remove any other temporary files created during the process
find . -name "*.tmp" -type f -delete
find . -name ".tmp_*" -type f -delete

# Verify no temporary files remain
echo "Checking for remaining temp files..."
git status --short | grep -E "(TEST_|\.tmp|PR_DESCRIPTION|API_CHANGES|api_changes)" && echo "⚠️ Warning: Temporary files still exist!" || echo "✅ All temp files cleaned"

# Stage all changes for commit
git add -A

# Final check - ensure we're not committing temp files
git status --short | grep -E "(TEST_|\.tmp|PR_DESCRIPTION\.md)" && {
  echo "❌ ERROR: Temporary files staged for commit! Unstaging..."
  git reset HEAD TEST_*.md PR_DESCRIPTION.md .tmp_*
} || echo "✅ Ready to commit"

# Commit the changes
git commit -m "[YYYY-MM] Update Storefront API and Customer Account API"
```

### Create PR Using GitHub CLI

```bash
# Generate fresh PR description for GitHub
cat > PR_DESCRIPTION.md << 'EOF'
[Your PR description content here]
EOF

# Create the PR with the comprehensive description
gh pr create \
  --title "Update Storefront API and Customer Account API to YYYY-MM" \
  --body "$(cat PR_DESCRIPTION.md)" \
  --base main \
  --draft  # Consider starting as draft if P0 issues exist

# Capture the PR URL
PR_URL=$(gh pr view --json url -q .url)
echo "✅ PR created: $PR_URL"

# Final cleanup of PR description file
rm -f PR_DESCRIPTION.md
echo "🧹 Cleaned up PR description file"

# Optional: Keep the API Changes Report for reference
# It can be committed or deleted based on team preference
echo "📋 API_CHANGES_REPORT_YYYY-MM.md kept for reference (decide if committing)"
```

## Automation Helper Scripts

### Script: Create Issues from API Changes Report
```bash
#!/bin/bash
# create-api-issues.sh
# Parse API_CHANGES_REPORT_YYYY-MM.md and create GitHub issues

API_VERSION="YYYY-MM"
REPORT_FILE="API_CHANGES_REPORT_${API_VERSION}.md"
ISSUES_FILE="created_issues.txt"

# Function to create an issue
create_issue() {
  local title="$1"
  local body="$2"
  local priority="$3"
  
  echo "Creating issue: $title"
  
  issue_url=$(gh issue create \
    --title "[${API_VERSION} API UPDATE] ${title}" \
    --body "${body}" \
    --label "api-update,${priority}" \
    --assignee @me \
    2>&1 | grep -oE 'https://[^ ]+')
  
  echo "${title}|${issue_url}" >> $ISSUES_FILE
  echo "Created: ${issue_url}"
}

# Parse report and create issues
# (Implementation would parse the markdown and extract sections)
```

### Script: Generate PR Description with Issue Table
```bash
#!/bin/bash
# generate-pr-description.sh
# Generate comprehensive PR description with issue tracking table

API_VERSION="YYYY-MM"
OLD_VERSION="YYYY-MM"
ISSUES_FILE="created_issues.txt"
OUTPUT_FILE="PR_DESCRIPTION.md"

# Read created issues and format as table
generate_issue_table() {
  echo "| Change | Type | API | Priority | Issue | Status |"
  echo "|--------|------|-----|----------|-------|--------|"
  
  while IFS='|' read -r title url; do
    issue_num=$(echo $url | grep -oE '[0-9]+$')
    # Parse details from title/report
    echo "| $title | Type | API | Priority | #$issue_num | 🔴 Not Started |"
  done < $ISSUES_FILE
}

# Generate full PR description
cat > $OUTPUT_FILE << EOF
# 🚀 API Version Update: ${API_VERSION}

## Executive Summary
Updated Storefront API and Customer Account API from version **${OLD_VERSION}** to **${API_VERSION}**.

## 📊 API Changes Overview

$(generate_issue_table)

[Rest of template...]
EOF

echo "PR description generated: $OUTPUT_FILE"
```

## Verification Checklist

### Phase 1: Code Updates
- [ ] Analyzed API changelog for new features/changes
- [ ] All version constants updated (SFAPI and CAAPI matching)
- [ ] Asked user about Cloudflare Workers compat date
- [ ] Type generation completed successfully
- [ ] hydrogen-react built successfully (critical for type resolution)
- [ ] Documentation built with `npm run build-docs --workspace=@shopify/hydrogen-react`
- [ ] No references to old API versions remain
- [ ] All tests pass with new API versions
- [ ] Build completes successfully
- [ ] Changeset created with major version bumps

### Phase 2: Documentation & Tracking
- [ ] API Changes Report generated and saved as `API_CHANGES_REPORT_YYYY-MM.md`
- [ ] All P0 and P1 changes identified from report
- [ ] GitHub issues created for all actionable items
- [ ] Issue numbers/URLs tracked for PR description

### Phase 3: Pull Request
- [ ] PR description generated with issue tracking table
- [ ] All breaking changes clearly documented
- [ ] Migration paths provided
- [ ] Test results included
- [ ] PR created with appropriate labels
- [ ] Ready for review

## Command Summary (CRITICAL ORDER)
```bash
# 0. Analyze API changes (replace YYYY-MM with actual version like 2025-07)
curl --silent --request POST \
  --url https://changelog.shopify.com/graphql \
  --header 'content-type: application/json' \
  --data '{
  "query": "query GetStorefrontCustomerUpdates($apiVersion: String!) { developer { posts(first: 50, apiTypeFilter: \"storefront-graphql,customer-account-graphql\", apiVersionFilter: $apiVersion, scopeFilter: PUBLISHED) { pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { slug title excerpt content permalink postedAt effectiveAt effectiveApiVersion indicatesActionRequired primaryTag { handle displayName } secondaryTag { handle displayName } affectedApi { handle displayName } } } } }",
  "variables": {
    "apiVersion": "YYYY-MM"
  }
}' | jq -r '.data.developer.posts.nodes[] | "## \(.title)\n**API**: \(.affectedApi[].displayName)\n**Type**: \(.secondaryTag.displayName)\n"'

# 1. Update version constants manually in the files listed above

# 2. Generate new types in hydrogen-react
cd packages/hydrogen-react
npm run graphql-types

# 3. BUILD HYDROGEN-REACT (CRITICAL - DO NOT SKIP)
npm run build
cd ../..

# 4. Verify hydrogen-react types are built
ls -la packages/hydrogen-react/dist/types/storefront-api-types.d.ts

# 5. Build all packages
npm run build:pkg

# 6. Build documentation
npm run build-docs --workspace=@shopify/hydrogen-react

# 7. Regenerate skeleton types
cd templates/skeleton
npm run codegen
cd ../..

# 8. Search for old versions and update (replace YYYY-MM with actual old version)
grep -r "YYYY-MM" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
# Update all found references

# 9. Verify type checking works (CRITICAL VALIDATION)
cd packages/hydrogen-react && npm run typecheck && cd ../..
cd packages/hydrogen && npm run typecheck && cd ../..

# 10. Run full validation suite
npm run typecheck
npm run lint
npm test
# Keep track of any errors for final review

# 11. Format the code
npm run format

# 12. Create changeset
npm run changeset add

# 13. Commit changes
git add -A
git commit -m "[YYYY-MM] Update Storefront API and Customer Account API"

# 14. Generate API Changes Report
# Save comprehensive report as API_CHANGES_REPORT_YYYY-MM.md

# 15. Create GitHub Issues for actionable items
# Use gh CLI to create issues for P0 and P1 items

# 16. Create comprehensive PR
gh pr create \
  --title "Update Storefront API and Customer Account API to YYYY-MM" \
  --body "$(cat PR_DESCRIPTION.md)" \
  --base main \
  --label "api-update,major-version"
```

## Decision Points for AI/User

Throughout this process, the AI should:
1. **ASK** about Cloudflare Workers compatibility date update
2. **ASK** about mini-oxygen package version bump necessity
3. **ANALYZE** and report any API features not covered in changesets
4. **SUGGEST** where missing features should be implemented
5. **CONFIRM** all version references have been updated before finalizing