---
name: apis-version-update
description: >
  Guide for updating Storefront API (SFAPI) and Customer Account API (CAAPI)
  versions across the Hydrogen repository. Use when the user mentions
  "API version update", "SFAPI update", "CAAPI update", "quarterly API update",
  or when working on Hydrogen's quarterly Shopify API version bumps.
user-invocable: true
---

# API Version Update Guide for Hydrogen

Update Storefront API and Customer Account API versions quarterly. This guide follows a streamlined 9-step workflow.

## Anti-Hallucination Directive

**CRITICAL CONSTRAINT**: When creating GitHub issues from API changelog:
1. Copy ONLY exact text from changelog - do not paraphrase or summarize
2. NEVER add analysis, impact assessment, or implementation suggestions
3. NEVER speculate about which Hydrogen files might be affected
4. The purpose is to DOCUMENT the API change, not ANALYZE it
5. NEVER include 'Action Required' or similar fields - Shopify's assessment is for generic API consumers, not Hydrogen specifically. The changelog reference link is sufficient; humans will determine actual impact.

## Tracking Phases (8 Phases in Parent Issue)

This skill covers Phases 1-2, including creation of child issue placeholders for Phases 3-8. Phases 3-8 themselves require manual execution by the team.

1. **Version update PR** - Main code PR with version constants
2. **Complete all API changes** - Child issues for each changelog entry
3. **Fix recipes for VERSION** - Validate recipes CI step passes
4. **Manual testing** - Test changes in a real Hydrogen project
5. **Release versions** - Publish packages to npm
6. **Add post in docs/changelog.json** - Enable `h2 upgrade` command
7. **Update Shopify dev API reference docs** - Sync external documentation
8. **Blog post** - Announce the release

---

## Implementation Steps (9 Steps)

### Step 1: Setup

**ASK USER**: Confirm target version (e.g., `2026-01`)

```bash
# Check current version
grep "SF_API_VERSION" packages/hydrogen-react/codegen.ts

# Create feature branch
git checkout -b <VERSION>-sfapi-caapi-update
```

### Step 2: Update Version Constants

Update these 4 files with the new version:

| File | Constant |
|------|----------|
| `packages/hydrogen-react/src/storefront-api-constants.ts` | `SFAPI_VERSION` |
| `packages/hydrogen/src/customer/constants.ts` | `DEFAULT_CUSTOMER_API_VERSION` |
| `packages/hydrogen-react/codegen.ts` | `SF_API_VERSION` and `CA_API_VERSION` |
| `packages/hydrogen/src/vite/compat-date.ts` | `COMPAT_DATE` (format: `YYYY-MM-01`) |

### Step 3: Build & Type Generation

**Run this exact sequence - all commands required**:

```bash
npm install && npm run build
cd packages/hydrogen-react && npm run graphql-types && npm run build && cd ../..
npm run build:pkg
npm run build-docs --workspace=@shopify/hydrogen-react
cd templates/skeleton && npm run codegen && cd ../..
```

**CHECKPOINT 1**: Verify builds complete. If errors, report the EXACT error message and stop. Do NOT attempt to diagnose or fix.

### Step 4: Validation

Capture raw output - do NOT categorize or interpret errors:

```bash
npm run typecheck 2>&1 | tee /tmp/claude/typecheck.log
npm run lint 2>&1 | tee /tmp/claude/lint.log
npm test 2>&1 | tee /tmp/claude/test.log
```

**CHECKPOINT 2**: Report ONLY raw numbers (e.g., "typecheck: 3 failures, lint: 0, test: 5"). Do NOT describe what the failures are or attempt to categorize them. Humans will triage.

### Step 5: Update Hardcoded References

Search for old version string and update all occurrences:

```bash
grep -r "<OLD_VERSION>" packages/ templates/ --include="*.ts" --include="*.tsx" --include="*.md"
```

### Step 6: Create Changeset

```bash
npm run changeset add
```

Include these packages:
- `@shopify/hydrogen`: **major**
- `@shopify/hydrogen-react`: **major**
- `@shopify/cli-hydrogen`: **patch**
- `@shopify/create-hydrogen`: **patch**
- `skeleton`: **major**

### Step 7: Create Parent Issue

Create in `Shopify/developer-tools-team` with `--repo` flag:

```bash
PARENT_ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "Hydrogen <VERSION> update" \
  --body "$(cat <<'EOF'
API changes:
- [Storefront API changes](https://shopify.dev/changelog?filter=api&api_version=<VERSION>&api_type=storefront-graphql)
- [Customer Account API changes](https://shopify.dev/changelog?filter=api&api_version=<VERSION>&api_type=customer-account-graphql)

---

**1. Version update PR**
- (link after PR created)

**2. Complete all API changes**
(API changelog child issues will be listed here)

**3. Fix recipes for <VERSION>**
- (child issue will be linked here)

**4. Manual testing**
- (child issue will be linked here)

**5. Release versions**
- (child issue will be linked here)

**6. Add post in docs/changelog.json for h2 upgrade**
- (child issue will be linked here)

**7. Update Shopify dev API reference docs**
- (child issue will be linked here)

**8. Blog post: hydrogen.shopify.dev**
- (child issue will be linked here)
EOF
)")

PARENT_NUM=$(echo "$PARENT_ISSUE_URL" | grep -oE '[0-9]+$')
echo "Created parent issue #$PARENT_NUM"
```

### Step 7a: Add Parent to Project with Hydrogen Field

```bash
# Add parent issue to project
gh project item-add 4613 --owner Shopify --url "$PARENT_ISSUE_URL"
sleep 2

# Get project item ID
PARENT_ITEM_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '$PARENT_NUM') { projectItems(first: 5) { nodes { id project { number } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .id')

# Set "Project" field to "Hydrogen"
gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDNH5XOABDyGA"
    itemId: "'$PARENT_ITEM_ID'"
    fieldId: "PVTSSF_lADNH5XOABDyGM4Av2Pl"
    value: { singleSelectOptionId: "ad0bd2a6" }
  }) { projectV2Item { id } }
}'

# Verify
FIELD_VALUE=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '$PARENT_NUM') { projectItems(first: 5) { nodes { fieldValueByName(name: "Project") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }' --jq '.data.repository.issue.projectItems.nodes[0].fieldValueByName.name')

if [ "$FIELD_VALUE" = "Hydrogen" ]; then
  echo "✓ Parent #$PARENT_NUM: Project = Hydrogen"
else
  echo "✗ FAILED to set Hydrogen field on parent"
  exit 1
fi
```

### Step 8: Create Child Issues for API Changes

### 8a: Fetch API Changelog

```bash
API_VERSION="<VERSION>"
curl --silent --request POST \
  --url https://changelog.shopify.com/graphql \
  --header 'content-type: application/json' \
  --data '{
  "query": "query GetStorefrontCustomerUpdates($apiVersion: String!) { developer { posts(first: 50, apiTypeFilter: \"storefront-graphql,customer-account-graphql\", apiVersionFilter: $apiVersion, scopeFilter: PUBLISHED) { nodes { title excerpt permalink indicatesActionRequired affectedApi { displayName } } } } }",
  "variables": { "apiVersion": "'$API_VERSION'" }
}' > /tmp/claude/api_changes.json
```

### 8a.1: Transform Permalink URLs

The Shopify changelog API returns permalinks using `developers.shopify.com/api-changelog/` but this URL returns a 301 redirect to the homepage instead of the specific changelog post. Transform to the correct domain before creating issues:

```bash
# Transform permalinks from API response to correct format
# FROM: https://developers.shopify.com/api-changelog/slug (BROKEN - redirects to homepage)
# TO:   https://shopify.dev/changelog/slug (WORKS - lands on actual post)

jq '.data.developer.posts.nodes[] |= (.permalink = (.permalink | gsub("developers.shopify.com/api-changelog"; "shopify.dev/changelog")))' /tmp/claude/api_changes.json > /tmp/claude/api_changes_fixed.json
mv /tmp/claude/api_changes_fixed.json /tmp/claude/api_changes.json

# Verify transformation worked
grep -o 'shopify.dev/changelog' /tmp/claude/api_changes.json | head -1 && echo "✓ URLs transformed" || echo "✗ URL transformation failed"
```

### 8c: For Each Changelog Entry

**Check for existing issue first** (prevent duplicates on retry):

```bash
gh issue list --repo Shopify/developer-tools-team --search "in:body <permalink>"
```

**If no existing issue**, create with minimal template:

```bash
ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "[<VERSION> API UPDATE] <Title from changelog>" \
  --label "child" \
  --body "$(cat <<'EOF'
## Changelog Entry
<EXACT text from changelog - no modifications>

## Reference
- [Shopify Changelog](<permalink>)

---
_Implementation notes to be added during human investigation._
EOF
)")

ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
```

### 8d: Add to Project and Set Hydrogen Field

```bash
# Add issue to project
gh project item-add 4613 --owner Shopify --url "$ISSUE_URL"
sleep 2  # Wait for GitHub to process

# Get project item ID
ITEM_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '$ISSUE_NUM') { projectItems(first: 5) { nodes { id project { number } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .id')

if [ -z "$ITEM_ID" ]; then
  echo "#$ISSUE_NUM: ✗ FAILED to get project item ID"
  exit 1
fi

# Set "Project" field to "Hydrogen"
gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDNH5XOABDyGA"
    itemId: "'$ITEM_ID'"
    fieldId: "PVTSSF_lADNH5XOABDyGM4Av2Pl"
    value: { singleSelectOptionId: "ad0bd2a6" }
  }) { projectV2Item { id } }
}'

# Verify field was set
FIELD_VALUE=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '$ISSUE_NUM') { projectItems(first: 5) { nodes { fieldValueByName(name: "Project") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }' --jq '.data.repository.issue.projectItems.nodes[0].fieldValueByName.name')

if [ "$FIELD_VALUE" = "Hydrogen" ]; then
  echo "#$ISSUE_NUM: ✓ Added to project with Hydrogen field"
else
  echo "#$ISSUE_NUM: ✗ FAILED to set Hydrogen field (got: $FIELD_VALUE)"
  exit 1
fi
```

### 8e: Link as Sub-Issue of Parent

```bash
# Get node IDs first
PARENT_NODE_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: <PARENT_NUM>) { id } } }' --jq '.data.repository.issue.id')
CHILD_NODE_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '$ISSUE_NUM') { id } } }' --jq '.data.repository.issue.id')

# Link as sub-issue
RESULT=$(gh api graphql -f query='
  mutation {
    addSubIssue(input: {
      issueId: "'$PARENT_NODE_ID'"
      subIssueId: "'$CHILD_NODE_ID'"
    }) { issue { id } subIssue { number } }
  }
' 2>&1)

if echo "$RESULT" | grep -q '"errors"'; then
  echo "#$ISSUE_NUM: ✗ Link mutation error: $RESULT"
  exit 1
fi

# Verify the link exists (using subIssues field, NOT trackedIssues)
sleep 1
LINKED=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: <PARENT_NUM>) { subIssues(first: 50) { nodes { number } } } } }' --jq '.data.repository.issue.subIssues.nodes[].number' | grep -w "^${ISSUE_NUM}$" || true)

if [ -n "$LINKED" ]; then
  echo "#$ISSUE_NUM: ✓ Linked as sub-issue of parent"
else
  echo "#$ISSUE_NUM: ✗ FAILED - sub-issue link not found after mutation"
  exit 1
fi
```

### 8f.1: Create Phase 3-8 Child Issues

Create child issues for remaining phases. Each follows the same pattern as API changelog issues with full verification.

**Prerequisites:** `$PARENT_NUM` must be set from Step 7.

**Reusable function (define once at start of Step 8e.1):**
```bash
# Function to setup child issue: add to project, set Hydrogen field, link as sub-issue
# Requires: PARENT_NUM set from Step 7
setup_phase_child_issue() {
  local ISSUE_NUM=$1
  local ISSUE_URL=$2

  # Add to project
  gh project item-add 4613 --owner Shopify --url "$ISSUE_URL"
  sleep 2

  # Get project item ID
  ITEM_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '$ISSUE_NUM') { projectItems(first: 5) { nodes { id project { number } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .id')

  if [ -z "$ITEM_ID" ]; then
    echo "#$ISSUE_NUM: ✗ FAILED to get project item ID"
    exit 1
  fi

  # Set "Project" field to "Hydrogen"
  gh api graphql -f query='mutation {
    updateProjectV2ItemFieldValue(input: {
      projectId: "PVT_kwDNH5XOABDyGA"
      itemId: "'$ITEM_ID'"
      fieldId: "PVTSSF_lADNH5XOABDyGM4Av2Pl"
      value: { singleSelectOptionId: "ad0bd2a6" }
    }) { projectV2Item { id } }
  }' > /dev/null

  # Verify field was set
  FIELD_VALUE=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '$ISSUE_NUM') { projectItems(first: 5) { nodes { fieldValueByName(name: "Project") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }' --jq '.data.repository.issue.projectItems.nodes[0].fieldValueByName.name')

  if [ "$FIELD_VALUE" != "Hydrogen" ]; then
    echo "#$ISSUE_NUM: ✗ FAILED to set Hydrogen field (got: $FIELD_VALUE)"
    exit 1
  fi

  # Link as sub-issue
  PARENT_NODE_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '$PARENT_NUM') { id } } }' --jq '.data.repository.issue.id')
  CHILD_NODE_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '$ISSUE_NUM') { id } } }' --jq '.data.repository.issue.id')

  RESULT=$(gh api graphql -f query='mutation { addSubIssue(input: {issueId: "'$PARENT_NODE_ID'", subIssueId: "'$CHILD_NODE_ID'"}) { issue { id } subIssue { number } } }' 2>&1)

  if echo "$RESULT" | grep -q '"errors"'; then
    echo "#$ISSUE_NUM: ✗ Link mutation error: $RESULT"
    exit 1
  fi

  # Verify link
  sleep 1
  LINKED=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '$PARENT_NUM') { subIssues(first: 50) { nodes { number } } } } }' --jq '.data.repository.issue.subIssues.nodes[].number' | grep -w "^${ISSUE_NUM}$" || true)

  if [ -n "$LINKED" ]; then
    echo "#$ISSUE_NUM: ✓ Created, project field set, linked as sub-issue"
    return 0
  else
    echo "#$ISSUE_NUM: ✗ FAILED - sub-issue link not found"
    exit 1
  fi
}
```

**Phase 3: Fix recipes**
```bash
cat > /tmp/claude/child-issue.md <<'EOF'
Parent issue: #<PARENT_NUM>

Ensure the "Validate recipes" CI step passes with the new API version.

## Scope
- Run recipe validation CI step
- Fix any recipe compatibility issues
EOF

ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "Fix recipes for <VERSION>" \
  --label "child" \
  --body-file /tmp/claude/child-issue.md)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
setup_phase_child_issue "$ISSUE_NUM" "$ISSUE_URL"
PHASE3_ISSUE=$ISSUE_NUM
```

**Phase 4: Manual testing**
```bash
cat > /tmp/claude/child-issue.md <<'EOF'
Parent issue: #<PARENT_NUM>

Test changes in a real Hydrogen project.

## Scope
- Test with both `h2 dev` AND `npm run dev` (they should behave identically but verify)
- Validate all API changes work correctly
EOF

ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "Manual testing for <VERSION> update" \
  --label "child" \
  --body-file /tmp/claude/child-issue.md)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
setup_phase_child_issue "$ISSUE_NUM" "$ISSUE_URL"
PHASE4_ISSUE=$ISSUE_NUM
```

**Phase 5: Release versions**
```bash
cat > /tmp/claude/child-issue.md <<'EOF'
Parent issue: #<PARENT_NUM>

Publish packages to npm.

## Scope
- Merge the Version PR to trigger npm publication
- Verify packages published correctly
- Monitor Slack for release notifications
EOF

ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "Release <VERSION_CALVER> versions" \
  --label "child" \
  --body-file /tmp/claude/child-issue.md)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
setup_phase_child_issue "$ISSUE_NUM" "$ISSUE_URL"
PHASE5_ISSUE=$ISSUE_NUM
```

**Phase 6: Changelog for h2 upgrade**
```bash
cat > /tmp/claude/child-issue.md <<'EOF'
Parent issue: #<PARENT_NUM>

Document upgrade path for Hydrogen users in the changelog used by `h2 upgrade`. Use [this Claude command to help](https://github.com/Shopify/hydrogen/blob/main/.claude/commands/changelog-update.md)

## Scope
- Add changelog entry in docs/changelog.json with upgrade steps
EOF

ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "[<VERSION>] Add post in docs/changelog.json for h2 upgrade" \
  --label "child" \
  --body-file /tmp/claude/child-issue.md)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
setup_phase_child_issue "$ISSUE_NUM" "$ISSUE_URL"
PHASE6_ISSUE=$ISSUE_NUM
```

**Phase 7: Update Shopify dev docs**
```bash
cat > /tmp/claude/child-issue.md <<'EOF'
Parent issue: #<PARENT_NUM>

Sync external documentation with new API version.

## Scope
- Update Shopify dev API reference documentation
- Ensure version numbers are current
EOF

ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "[<VERSION>] Update Shopify dev API reference docs" \
  --label "child" \
  --body-file /tmp/claude/child-issue.md)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
setup_phase_child_issue "$ISSUE_NUM" "$ISSUE_URL"
PHASE7_ISSUE=$ISSUE_NUM
```

**Phase 8: Blog post**
```bash
cat > /tmp/claude/child-issue.md <<'EOF'
Parent issue: #<PARENT_NUM>

Announce the API update on hydrogen.shopify.dev.

## Scope
- Write blog post announcing <VERSION> update
- Highlight key features/changes
- Publish to hydrogen.shopify.dev
  - This needs a new article created in [this shop](https://app.shopify.com/services/internal/shops/59848228886)
EOF

ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "[<VERSION>] Blog post: hydrogen.shopify.dev" \
  --label "child" \
  --body-file /tmp/claude/child-issue.md)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
setup_phase_child_issue "$ISSUE_NUM" "$ISSUE_URL"
PHASE8_ISSUE=$ISSUE_NUM
```

### 8f.2: Update Parent Issue Body

After all child issues (API changes AND phases 3-8) are created, update the parent body:

```bash
# Collect ALL child issue numbers (API changes + phases 3-8)
# API_CHILDREN comes from Step 8b loop
# PHASE*_ISSUE variables come from Step 8e.1
ALL_CHILDREN="$API_CHILDREN $PHASE3_ISSUE $PHASE4_ISSUE $PHASE5_ISSUE $PHASE6_ISSUE $PHASE7_ISSUE $PHASE8_ISSUE"

# Generate child list for API changes section
API_CHILD_LIST=""
for CHILD in $API_CHILDREN; do
  API_CHILD_LIST="${API_CHILD_LIST}- #${CHILD}
"
done

# Update parent body with ALL children (no checkboxes - use unordered lists)
cat > /tmp/claude/parent-body.md <<EOF
API changes:
- [Storefront API changes](https://shopify.dev/changelog?filter=api&api_version=<VERSION>&api_type=storefront-graphql)
- [Customer Account API changes](https://shopify.dev/changelog?filter=api&api_version=<VERSION>&api_type=customer-account-graphql)

---

**1. Version update PR**
- (link after PR created)

**2. Complete all API changes**
${API_CHILD_LIST}
**3. Fix recipes for <VERSION>**
- #$PHASE3_ISSUE

**4. Manual testing**
- #$PHASE4_ISSUE

**5. Release versions**
- #$PHASE5_ISSUE

**6. Add post in docs/changelog.json for h2 upgrade**
- #$PHASE6_ISSUE

**7. Update Shopify dev API reference docs**
- #$PHASE7_ISSUE

**8. Blog post: hydrogen.shopify.dev**
- #$PHASE8_ISSUE
EOF

gh issue edit <PARENT_NUM> --repo Shopify/developer-tools-team --body-file /tmp/claude/parent-body.md

# Verify no checkboxes remain and all children are listed
BODY=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: <PARENT_NUM>) { body } } }' --jq '.data.repository.issue.body')

if echo "$BODY" | grep -q "\- \[ \]"; then
  echo "✗ FAILED: Body still contains checkboxes"
  exit 1
fi

for CHILD in $ALL_CHILDREN; do
  if ! echo "$BODY" | grep -q "#$CHILD"; then
    echo "✗ FAILED: #$CHILD NOT in parent body"
    exit 1
  fi
done

echo "✓ Parent body updated with all children (no checkboxes)"
```

**CHECKPOINT 3**: Run full verification script before proceeding to Step 9:

```bash
#!/bin/bash
# Checkpoint 3 Verification - Run after all child issues created
set -e

PARENT_NUM="<PARENT_NUM>"  # Replace with actual parent issue number
EXPECTED_CHILDREN="<ISSUE1> <ISSUE2> ..."  # Space-separated list

echo "=== 1. Verify sub-issues linked to parent ==="
LINKED=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '$PARENT_NUM') { subIssues(first: 50) { nodes { number title } } } } }' --jq '.data.repository.issue.subIssues.nodes[] | "#\(.number): \(.title)"')
echo "$LINKED"

for CHILD in $EXPECTED_CHILDREN; do
  if echo "$LINKED" | grep -q "#$CHILD:"; then
    echo "  ✓ #$CHILD linked"
  else
    echo "  ✗ #$CHILD NOT linked - FAILURE"
    exit 1
  fi
done

echo ""
echo "=== 2. Verify Hydrogen field set on all children ==="
for CHILD in $EXPECTED_CHILDREN; do
  VALUE=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '$CHILD') { projectItems(first: 5) { nodes { fieldValueByName(name: "Project") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }' --jq '.data.repository.issue.projectItems.nodes[0].fieldValueByName.name')
  if [ "$VALUE" = "Hydrogen" ]; then
    echo "  ✓ #$CHILD: Project = Hydrogen"
  else
    echo "  ✗ #$CHILD: Project = '$VALUE' (expected: Hydrogen) - FAILURE"
    exit 1
  fi
done

echo ""
echo "=== 3. Verify parent body contains children ==="
BODY=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '$PARENT_NUM') { body } } }' --jq '.data.repository.issue.body')
for CHILD in $EXPECTED_CHILDREN; do
  if echo "$BODY" | grep -q "#$CHILD"; then
    echo "  ✓ #$CHILD in parent body"
  else
    echo "  ✗ #$CHILD NOT in parent body - FAILURE"
    exit 1
  fi
done

echo ""
echo "=== ALL CHECKS PASSED ==="
```

**Expected output:**
- All sub-issues show as linked
- All children show "Project = Hydrogen"
- All children appear in parent body
- Script exits with 0 (success)

**If any check fails:** Fix the specific issue and re-run verification before proceeding.

### Step 9: Create PR

```bash
git add -A
git commit -m "[<VERSION>] Update Storefront API and Customer Account API"
git push -u origin <BRANCH>

gh pr create --repo Shopify/hydrogen --draft \
  --title "[<VERSION>] Storefront & Customer Account API version update" \
  --body "$(cat <<'EOF'
## Summary
Updated Storefront API and Customer Account API to version <VERSION>.

## Changes
- Updated version constants
- Regenerated GraphQL types and schemas
- Updated skeleton template types

## Validation Status
<Include raw error counts from logs if any>

## Related
- Parent tracking issue: <link>
EOF
)"
```

---

## Child Issue Template (Minimal)

```markdown
## Changelog Entry
<EXACT text from changelog - no modifications>

## Reference
- [Shopify Changelog](<permalink>)

---
_Implementation notes to be added during human investigation._
```

This template is intentionally minimal to prevent AI from adding interpretation.

---

## Fix Recipes Note

The "Validate recipes" CI step should succeed with all recipes. If failing, stop and report the failure. Recipe fixes require human investigation - do NOT attempt to fix recipe files.

---

## Rollback Strategy

If the process fails mid-way (e.g., some issues created but build fails):
**Leave existing issues**. They are valid documentation and can be updated later.
No cleanup required.

---

## Excluded Phases

These phases from previous updates are **intentionally excluded** as edge cases:
- E2E tests - Not standard for every API update
- "Double check API update steps" - Meta-step that adds confusion
- "Update mock shop" - Only when mock shop doesn't support new version
- "Release skeleton template separately" - Only needed if mock shop issue exists

---

## Quick Reference: Project Constants

These values are stable and verified:

| Constant | Value | Notes |
|----------|-------|-------|
| Project Number | `4613` | Online Store Developer Platforms |
| Project Field ID | `PVTSSF_lADNH5XOABDyGM4Av2Pl` | "Project" single-select field |
| Hydrogen Option ID | `ad0bd2a6` | "Hydrogen" option value |

**Verification (run if values seem outdated):**
```bash
# Verify project exists
gh project field-list 4613 --owner Shopify | grep "Project"

# Verify Hydrogen option exists
gh api graphql -f query='query { node(id: "PVTSSF_lADNH5XOABDyGM4Av2Pl") { ... on ProjectV2SingleSelectField { options { id name } } } }' | grep -i hydrogen
```

---

## Lessons Learned (Critical Knowledge for Future Agents)

### 1. Changelog URL Domain Mismatch
**Problem:** Shopify's changelog GraphQL API returns permalinks using `developers.shopify.com/api-changelog/` but this URL returns a 301 redirect to the Shopify dev homepage—NOT the specific changelog post. Users clicking these links get dumped on a generic page with no way to find the original content.

**Solution:** Always transform permalink URLs in Step 8a.1 before using them:
- **Wrong:** `https://developers.shopify.com/api-changelog/some-slug` (301 → homepage)
- **Correct:** `https://shopify.dev/changelog/some-slug` (lands on actual post)

### 2. GitHub Sub-Issues Have Single-Parent Constraint
**Problem:** GitHub's sub-issue feature only allows ONE parent per issue. If an issue is already a child of another parent, attempting to link it to a new parent will fail with: "Sub issue may only have one parent"

**Solution:** Each API version update needs its own dedicated child issues. Cannot reuse child issues from previous API updates (e.g., issues #988-990 from 2025-10 couldn't be re-parented to #1003 for 2026-01).

### 3. Unordered Lists vs Checkboxes for Issue Bodies
**Problem:** Checkboxes (`- [ ]`) in parent issue bodies create a second source of status information that must be manually synchronized with the issue's actual state.

**Solution:** Use unordered lists (`- #1234`) instead. GitHub's issue open/closed status is the single source of truth. Checkboxes create a second location for status that violates this principle and inevitably becomes stale.

### 4. Project Field Setting Requires Multi-Step Process
**Problem:** Setting a GitHub project field value requires knowing multiple IDs, and the "project item ID" is different from the "issue ID."

**Why two IDs?** GitHub has TWO different identifiers:
1. **Issue Node ID** - the global issue identifier (e.g., `I_kwDO...`)
2. **Project Item ID** - the specific instance of that issue within a project (e.g., `PVTI_lAD...`)

Project field mutations require the Item ID because fields are project-scoped, not issue-scoped. The same issue can have different field values in different projects.

**Solution:** Follow this sequence:
1. Add issue to project: `gh project item-add <PROJECT_NUM> --owner Shopify --url <ISSUE_URL>`
2. Wait for processing: `sleep 2`
3. Get project item ID via GraphQL (filter by project number to get correct item)
4. Set field value via GraphQL mutation using item ID

### 5. Variable Scope in Multi-Step Scripts
**Problem:** Shell variables set in one code block don't persist to the next if run separately by an agent.

**Solution:** Either:
- Execute related steps as a single script to preserve variable scope, OR
- Save intermediate values to files for recovery: `echo "$PARENT_NUM" > /tmp/claude/parent_num.txt`
- Retrieve later: `PARENT_NUM=$(cat /tmp/claude/parent_num.txt)`

**Standard recovery file pattern:** `/tmp/claude/<variable_name>.txt`
