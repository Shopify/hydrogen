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
- `packages/hydrogen-react/src/storefront-api-constants.ts`
  - Update: `export const SFAPI_VERSION = 'YYYY-MM';`
  
- `packages/hydrogen/src/customer/constants.ts`
  - Update: `export const DEFAULT_CUSTOMER_API_VERSION = 'YYYY-MM';`

- `packages/hydrogen-react/codegen.ts`
  - Update both:
    - `const SF_API_VERSION = 'YYYY-MM';`
    - `const CA_API_VERSION = 'YYYY-MM';`

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

### 8. Package Versions (MAJOR UPDATE - REQUIRED)
Create a changeset file that includes major version bumps for:
- `@shopify/hydrogen` - major (components depend on new API schemas)
- `@shopify/hydrogen-react` - major (direct API integration)
- `@shopify/cli-hydrogen` - major (bundles skeleton with new versions)
- `skeleton` - major (uses new Hydrogen version)

Example changeset:
```
---
'@shopify/hydrogen': major
'@shopify/hydrogen-react': major
'@shopify/cli-hydrogen': major
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
4. This comprehensive report should be added to the PR description when pushing to GitHub

### PR Description Template

```markdown
# API Version Update: YYYY-MM

## Summary
Updated Storefront API and Customer Account API from version XXXX-XX to YYYY-MM.

## Changes Made
- ✅ Updated version constants in all packages
- ✅ Regenerated GraphQL types and schemas
- ✅ Updated documentation and examples
- ✅ Updated test fixtures

## Issues Identified & Resolution Plan

### P0 - Blockers
[List issues that must be resolved]

### P1 - Required for this PR
[List issues being addressed in this PR]

### P2 - Follow-up Required
[List issues for separate PRs]

## Testing
- [ ] All unit tests pass
- [ ] TypeScript compilation successful
- [ ] Linting passes
- [ ] Skeleton template builds
- [ ] Manual testing completed

## Next Steps
[List any follow-up PRs or tasks needed]
```

## Verification Checklist

- [ ] Analyzed API changelog for new features/changes
- [ ] All version constants updated (SFAPI and CAAPI matching)
- [ ] Asked user about Cloudflare Workers compat date
- [ ] Type generation completed successfully
- [ ] Documentation built with `npm run build-docs --workspace=@shopify/hydrogen-react`
- [ ] No references to old API versions remain
- [ ] All tests pass with new API versions
- [ ] Build completes successfully
- [ ] Changeset created with major version bumps
- [ ] Validated all new API features are either implemented or documented as gaps
- [ ] All issues documented and presented for review

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
```

## Decision Points for AI/User

Throughout this process, the AI should:
1. **ASK** about Cloudflare Workers compatibility date update
2. **ASK** about mini-oxygen package version bump necessity
3. **ANALYZE** and report any API features not covered in changesets
4. **SUGGEST** where missing features should be implemented
5. **CONFIRM** all version references have been updated before finalizing