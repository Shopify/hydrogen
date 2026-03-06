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

> **SANDBOX CONSTRAINT**: HEREDOC (`cat <<'EOF'`) is blocked in the Claude Code sandbox. **Always use the `Write` tool** to create body files, then pass them via `--body-file`. This applies everywhere a body file is needed: parent issue, child issues, phase child issues, parent body updates, and PR bodies.

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

Create in `Shopify/developer-tools-team` with `--repo` flag.

**First, use the `Write` tool** to create `/tmp/claude/parent-body-initial.md` with this content (substituting `<VERSION>` with the actual version):

```
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
```

Then create the issue:

```bash
mkdir -p /tmp/claude

PARENT_ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "Hydrogen <VERSION> update" \
  --body-file /tmp/claude/parent-body-initial.md)

PARENT_NUM=$(echo "$PARENT_ISSUE_URL" | grep -oE '[0-9]+$')
echo "$PARENT_NUM" > /tmp/claude/parent_num.txt
echo "Created parent issue #$PARENT_NUM"
```

### Step 7a: Add Parent to Project with Hydrogen and Status Fields

```bash
PARENT_NUM=$(cat /tmp/claude/parent_num.txt)
PARENT_ISSUE_URL="https://github.com/Shopify/developer-tools-team/issues/$PARENT_NUM"

# Add parent issue to project
gh project item-add 4613 --owner Shopify --url "$PARENT_ISSUE_URL"
sleep 2

# Get project item ID
PARENT_ITEM_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$PARENT_NUM"') { projectItems(first: 5) { nodes { id project { number } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .id')

# Set "Project" field to "Hydrogen"
gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDNH5XOABDyGA"
    itemId: "'"$PARENT_ITEM_ID"'"
    fieldId: "PVTSSF_lADNH5XOABDyGM4Av2Pl"
    value: { singleSelectOptionId: "ad0bd2a6" }
  }) { projectV2Item { id } }
}' > /dev/null

# Set "Status" field to "Todo (prioritized)"
gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDNH5XOABDyGA"
    itemId: "'"$PARENT_ITEM_ID"'"
    fieldId: "PVTSSF_lADNH5XOABDyGM4AnCva"
    value: { singleSelectOptionId: "f75ad846" }
  }) { projectV2Item { id } }
}' > /dev/null

# Verify both fields
PROJECT_VALUE=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$PARENT_NUM"') { projectItems(first: 5) { nodes { project { number } fieldValueByName(name: "Project") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .fieldValueByName.name')

STATUS_VALUE=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$PARENT_NUM"') { projectItems(first: 5) { nodes { project { number } fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .fieldValueByName.name')

if [ "$PROJECT_VALUE" = "Hydrogen" ] && [ "$STATUS_VALUE" = "Todo (prioritized)" ]; then
  echo "✓ Parent #$PARENT_NUM: Project = Hydrogen, Status = Todo (prioritized)"
else
  echo "✗ FAILED: Project = '$PROJECT_VALUE', Status = '$STATUS_VALUE'"
  exit 1
fi
```

### Step 8: Create Child Issues for API Changes

> **Prerequisites for all child issues**: The `child` label already exists in `Shopify/developer-tools-team`. No creation step needed — simply use `--label "child"` when creating issues.

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

**If no existing issue**, use the **`Write` tool** to create `/tmp/claude/child-api-body.md` with this content (substituting exact text and permalink from the changelog):

```
## Changelog Entry
<EXACT text from changelog - no modifications>

## Reference
- [Shopify Changelog](<permalink>)

---
_Implementation notes to be added during human investigation._
```

Then create the issue:

```bash
ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "[<VERSION> API UPDATE] <Title from changelog>" \
  --label "child" \
  --body-file /tmp/claude/child-api-body.md)

ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
```

### 8d: Add to Project, Set Hydrogen and Status Fields

```bash
# Add issue to project
gh project item-add 4613 --owner Shopify --url "$ISSUE_URL"
sleep 2  # Wait for GitHub to process

# Get project item ID
ITEM_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$ISSUE_NUM"') { projectItems(first: 5) { nodes { id project { number } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .id')

if [ -z "$ITEM_ID" ]; then
  echo "#$ISSUE_NUM: ✗ FAILED to get project item ID"
  exit 1
fi

# Set "Project" field to "Hydrogen"
gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDNH5XOABDyGA"
    itemId: "'"$ITEM_ID"'"
    fieldId: "PVTSSF_lADNH5XOABDyGM4Av2Pl"
    value: { singleSelectOptionId: "ad0bd2a6" }
  }) { projectV2Item { id } }
}' > /dev/null

# Set "Status" field to "Todo (prioritized)"
gh api graphql -f query='mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "PVT_kwDNH5XOABDyGA"
    itemId: "'"$ITEM_ID"'"
    fieldId: "PVTSSF_lADNH5XOABDyGM4AnCva"
    value: { singleSelectOptionId: "f75ad846" }
  }) { projectV2Item { id } }
}' > /dev/null

# Verify both fields
PROJECT_VALUE=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$ISSUE_NUM"') { projectItems(first: 5) { nodes { project { number } fieldValueByName(name: "Project") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .fieldValueByName.name')

STATUS_VALUE=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$ISSUE_NUM"') { projectItems(first: 5) { nodes { project { number } fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .fieldValueByName.name')

if [ "$PROJECT_VALUE" = "Hydrogen" ] && [ "$STATUS_VALUE" = "Todo (prioritized)" ]; then
  echo "#$ISSUE_NUM: ✓ Added to project with Hydrogen field and Todo (prioritized) status"
else
  echo "#$ISSUE_NUM: ✗ FAILED: Project = '$PROJECT_VALUE', Status = '$STATUS_VALUE'"
  exit 1
fi
```

### 8e: Link as Sub-Issue of Parent

```bash
PARENT_NUM=$(cat /tmp/claude/parent_num.txt)

# Get node IDs first
PARENT_NODE_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$PARENT_NUM"') { id } } }' --jq '.data.repository.issue.id')
CHILD_NODE_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$ISSUE_NUM"') { id } } }' --jq '.data.repository.issue.id')

# Link as sub-issue
RESULT=$(gh api graphql -f query='
  mutation {
    addSubIssue(input: {
      issueId: "'"$PARENT_NODE_ID"'"
      subIssueId: "'"$CHILD_NODE_ID"'"
    }) { issue { id } subIssue { number } }
  }
' 2>&1)

if echo "$RESULT" | grep -q '"errors"'; then
  echo "#$ISSUE_NUM: ✗ Link mutation error: $RESULT"
  exit 1
fi

# Verify the link exists (using subIssues field, NOT trackedIssues)
sleep 1
LINKED=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$PARENT_NUM"') { subIssues(first: 50) { nodes { number } } } } }' --jq '.data.repository.issue.subIssues.nodes[].number' | grep -w "^${ISSUE_NUM}$" || true)

if [ -n "$LINKED" ]; then
  echo "#$ISSUE_NUM: ✓ Linked as sub-issue of parent"
else
  echo "#$ISSUE_NUM: ✗ FAILED - sub-issue link not found after mutation"
  exit 1
fi
```

### 8f.1: Create Phase 3-8 Child Issues

Create child issues for remaining phases. Each follows the same pattern as API changelog issues with full verification.

**Prerequisites:** `$PARENT_NUM` must be set (read from `/tmp/claude/parent_num.txt`).

**Reusable function (define once, call for each phase):**

```bash
# Function to setup child issue: add to project, set Hydrogen + Status fields, link as sub-issue
# Requires: PARENT_NUM set from Step 7
setup_phase_child_issue() {
  local ISSUE_NUM=$1
  local ISSUE_URL=$2

  PARENT_NUM=$(cat /tmp/claude/parent_num.txt)

  # Add to project
  gh project item-add 4613 --owner Shopify --url "$ISSUE_URL"
  sleep 2

  # Get project item ID
  ITEM_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$ISSUE_NUM"') { projectItems(first: 5) { nodes { id project { number } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .id')

  if [ -z "$ITEM_ID" ]; then
    echo "#$ISSUE_NUM: ✗ FAILED to get project item ID"
    exit 1
  fi

  # Set "Project" field to "Hydrogen"
  gh api graphql -f query='mutation {
    updateProjectV2ItemFieldValue(input: {
      projectId: "PVT_kwDNH5XOABDyGA"
      itemId: "'"$ITEM_ID"'"
      fieldId: "PVTSSF_lADNH5XOABDyGM4Av2Pl"
      value: { singleSelectOptionId: "ad0bd2a6" }
    }) { projectV2Item { id } }
  }' > /dev/null

  # Set "Status" field to "Todo (prioritized)"
  gh api graphql -f query='mutation {
    updateProjectV2ItemFieldValue(input: {
      projectId: "PVT_kwDNH5XOABDyGA"
      itemId: "'"$ITEM_ID"'"
      fieldId: "PVTSSF_lADNH5XOABDyGM4AnCva"
      value: { singleSelectOptionId: "f75ad846" }
    }) { projectV2Item { id } }
  }' > /dev/null

  # Verify both fields
  PROJECT_VALUE=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$ISSUE_NUM"') { projectItems(first: 5) { nodes { project { number } fieldValueByName(name: "Project") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .fieldValueByName.name')

  STATUS_VALUE=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$ISSUE_NUM"') { projectItems(first: 5) { nodes { project { number } fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .fieldValueByName.name')

  if [ "$PROJECT_VALUE" != "Hydrogen" ] || [ "$STATUS_VALUE" != "Todo (prioritized)" ]; then
    echo "#$ISSUE_NUM: ✗ FAILED to set fields (Project='$PROJECT_VALUE', Status='$STATUS_VALUE')"
    exit 1
  fi

  # Link as sub-issue
  PARENT_NODE_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$PARENT_NUM"') { id } } }' --jq '.data.repository.issue.id')
  CHILD_NODE_ID=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$ISSUE_NUM"') { id } } }' --jq '.data.repository.issue.id')

  RESULT=$(gh api graphql -f query='mutation { addSubIssue(input: {issueId: "'"$PARENT_NODE_ID"'", subIssueId: "'"$CHILD_NODE_ID"'"}) { issue { id } subIssue { number } } }' 2>&1)

  if echo "$RESULT" | grep -q '"errors"'; then
    echo "#$ISSUE_NUM: ✗ Link mutation error: $RESULT"
    exit 1
  fi

  # Verify link
  sleep 1
  LINKED=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$PARENT_NUM"') { subIssues(first: 50) { nodes { number } } } } }' --jq '.data.repository.issue.subIssues.nodes[].number' | grep -w "^${ISSUE_NUM}$" || true)

  if [ -n "$LINKED" ]; then
    echo "#$ISSUE_NUM: ✓ Created, project fields set (Hydrogen + Todo prioritized), linked as sub-issue"
    return 0
  else
    echo "#$ISSUE_NUM: ✗ FAILED - sub-issue link not found"
    exit 1
  fi
}
```

**Phase 3: Fix recipes**

Use the **`Write` tool** to create `/tmp/claude/child-issue.md` with this content (substituting `<PARENT_NUM>` and `<VERSION>`):

```
Parent issue: #<PARENT_NUM>

Ensure the "Validate recipes" CI step passes with the new API version.

## Scope
- Run recipe validation CI step
- Fix any recipe compatibility issues
```

Then:

```bash
PARENT_NUM=$(cat /tmp/claude/parent_num.txt)

ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "Fix recipes for <VERSION>" \
  --label "child" \
  --body-file /tmp/claude/child-issue.md)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
setup_phase_child_issue "$ISSUE_NUM" "$ISSUE_URL"
PHASE3_ISSUE=$ISSUE_NUM
```

**Phase 4: Manual testing**

Use the **`Write` tool** to create `/tmp/claude/child-issue.md`:

```
Parent issue: #<PARENT_NUM>

Test changes in a real Hydrogen project.

## Scope
- Test with both `h2 dev` AND `npm run dev` (they should behave identically but verify)
- Validate all API changes work correctly
```

Then:

```bash
ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "Manual testing for <VERSION> update" \
  --label "child" \
  --body-file /tmp/claude/child-issue.md)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
setup_phase_child_issue "$ISSUE_NUM" "$ISSUE_URL"
PHASE4_ISSUE=$ISSUE_NUM
```

**Phase 5: Release versions**

Use the **`Write` tool** to create `/tmp/claude/child-issue.md`:

```
Parent issue: #<PARENT_NUM>

Publish packages to npm.

## Scope
- Merge the Version PR to trigger npm publication
- Verify packages published correctly
- Monitor Slack for release notifications
```

Then:

```bash
ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "Release <VERSION_CALVER> versions" \
  --label "child" \
  --body-file /tmp/claude/child-issue.md)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
setup_phase_child_issue "$ISSUE_NUM" "$ISSUE_URL"
PHASE5_ISSUE=$ISSUE_NUM
```

**Phase 6: Changelog for h2 upgrade**

Use the **`Write` tool** to create `/tmp/claude/child-issue.md`:

```
Parent issue: #<PARENT_NUM>

Document upgrade path for Hydrogen users in the changelog used by `h2 upgrade`. Use [this Claude command to help](https://github.com/Shopify/hydrogen/blob/main/.claude/commands/changelog-update.md)

## Scope
- Add changelog entry in docs/changelog.json with upgrade steps
```

Then:

```bash
ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "[<VERSION>] Add post in docs/changelog.json for h2 upgrade" \
  --label "child" \
  --body-file /tmp/claude/child-issue.md)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
setup_phase_child_issue "$ISSUE_NUM" "$ISSUE_URL"
PHASE6_ISSUE=$ISSUE_NUM
```

**Phase 7: Update Shopify dev docs**

Use the **`Write` tool** to create `/tmp/claude/child-issue.md`:

```
Parent issue: #<PARENT_NUM>

Sync external documentation with new API version.

## Scope
- Update Shopify dev API reference documentation
- Ensure version numbers are current
```

Then:

```bash
ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "[<VERSION>] Update Shopify dev API reference docs" \
  --label "child" \
  --body-file /tmp/claude/child-issue.md)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
setup_phase_child_issue "$ISSUE_NUM" "$ISSUE_URL"
PHASE7_ISSUE=$ISSUE_NUM
```

**Phase 8: Blog post**

Use the **`Write` tool** to create `/tmp/claude/child-issue.md`:

```
Parent issue: #<PARENT_NUM>

Announce the API update on hydrogen.shopify.dev.

## Scope
- Write blog post announcing <VERSION> update
- Highlight key features/changes
- Publish to hydrogen.shopify.dev
  - This needs a new article created in [this shop](https://app.shopify.com/services/internal/shops/59848228886)
```

Then:

```bash
ISSUE_URL=$(gh issue create --repo Shopify/developer-tools-team \
  --title "[<VERSION>] Blog post: hydrogen.shopify.dev" \
  --label "child" \
  --body-file /tmp/claude/child-issue.md)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')
setup_phase_child_issue "$ISSUE_NUM" "$ISSUE_URL"
PHASE8_ISSUE=$ISSUE_NUM
```

### 8f.2: Update Parent Issue Body

After all child issues (API changes AND phases 3-8) are created, use the **`Write` tool** to create `/tmp/claude/parent-body.md` with actual issue numbers substituted in:

```
API changes:
- [Storefront API changes](https://shopify.dev/changelog?filter=api&api_version=<VERSION>&api_type=storefront-graphql)
- [Customer Account API changes](https://shopify.dev/changelog?filter=api&api_version=<VERSION>&api_type=customer-account-graphql)

---

**1. Version update PR**
- (link after PR created)

**2. Complete all API changes**
- #<API_CHILD_1>
- #<API_CHILD_2>
(one line per API changelog child issue)

**3. Fix recipes for <VERSION>**
- #<PHASE3_ISSUE>

**4. Manual testing**
- #<PHASE4_ISSUE>

**5. Release versions**
- #<PHASE5_ISSUE>

**6. Add post in docs/changelog.json for h2 upgrade**
- #<PHASE6_ISSUE>

**7. Update Shopify dev API reference docs**
- #<PHASE7_ISSUE>

**8. Blog post: hydrogen.shopify.dev**
- #<PHASE8_ISSUE>
```

Then apply and verify:

```bash
PARENT_NUM=$(cat /tmp/claude/parent_num.txt)
ALL_CHILDREN="$API_CHILDREN $PHASE3_ISSUE $PHASE4_ISSUE $PHASE5_ISSUE $PHASE6_ISSUE $PHASE7_ISSUE $PHASE8_ISSUE"

gh issue edit "$PARENT_NUM" --repo Shopify/developer-tools-team --body-file /tmp/claude/parent-body.md

# Verify no checkboxes remain and all children are listed
BODY=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$PARENT_NUM"') { body } } }' --jq '.data.repository.issue.body')

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

PARENT_NUM=$(cat /tmp/claude/parent_num.txt)
EXPECTED_CHILDREN="<ISSUE1> <ISSUE2> ..."  # Space-separated list of ALL child issue numbers

echo "=== 1. Verify sub-issues linked to parent ==="
LINKED=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$PARENT_NUM"') { subIssues(first: 50) { nodes { number title } } } } }' --jq '.data.repository.issue.subIssues.nodes[] | "#\(.number): \(.title)"')
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
  VALUE=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$CHILD"') { projectItems(first: 5) { nodes { project { number } fieldValueByName(name: "Project") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .fieldValueByName.name')
  if [ "$VALUE" = "Hydrogen" ]; then
    echo "  ✓ #$CHILD: Project = Hydrogen"
  else
    echo "  ✗ #$CHILD: Project = '$VALUE' (expected: Hydrogen) - FAILURE"
    exit 1
  fi
done

echo ""
echo "=== 3. Verify Status field set on all issues (parent + children) ==="
for ISSUE in $PARENT_NUM $EXPECTED_CHILDREN; do
  VALUE=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$ISSUE"') { projectItems(first: 5) { nodes { project { number } fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }' --jq '.data.repository.issue.projectItems.nodes[] | select(.project.number == 4613) | .fieldValueByName.name')
  if [ "$VALUE" = "Todo (prioritized)" ]; then
    echo "  ✓ #$ISSUE: Status = Todo (prioritized)"
  else
    echo "  ✗ #$ISSUE: Status = '$VALUE' (expected: Todo (prioritized)) - FAILURE"
    exit 1
  fi
done

echo ""
echo "=== 4. Verify parent body contains children ==="
BODY=$(gh api graphql -f query='query { repository(owner:"Shopify", name:"developer-tools-team") { issue(number: '"$PARENT_NUM"') { body } } }' --jq '.data.repository.issue.body')
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
- All issues (parent + children) show "Status = Todo (prioritized)"
- All children appear in parent body
- Script exits with 0 (success)

**If any check fails:** Fix the specific issue and re-run verification before proceeding.

### Step 9: Create PR

Use the **`Write` tool** to create `/tmp/claude/pr-body.md` with this content (substituting `<VERSION>` and the parent issue link):

```
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
```

Then:

```bash
git add -A
git commit -m "[<VERSION>] Update Storefront API and Customer Account API"
git push -u origin <BRANCH>

gh pr create --repo Shopify/hydrogen --draft \
  --title "[<VERSION>] Storefront & Customer Account API version update" \
  --body-file /tmp/claude/pr-body.md
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
| Project ID | `PVT_kwDNH5XOABDyGA` | GraphQL node ID for the project |
| "Project" Field ID | `PVTSSF_lADNH5XOABDyGM4Av2Pl` | Single-select field for team assignment |
| Hydrogen Option ID | `ad0bd2a6` | "Hydrogen" value in the Project field |
| "Status" Field ID | `PVTSSF_lADNH5XOABDyGM4AnCva` | Single-select field for workflow status |
| "Todo (prioritized)" Option ID | `f75ad846` | Default status for all new issues |

**Verification (run if values seem outdated):**
```bash
# Verify project and list all fields
gh project field-list 4613 --owner Shopify

# Verify Hydrogen option exists
gh api graphql -f query='query { node(id: "PVTSSF_lADNH5XOABDyGM4Av2Pl") { ... on ProjectV2SingleSelectField { options { id name } } } }' | grep -i hydrogen

# Verify "Todo (prioritized)" option exists
gh api graphql -f query='query { node(id: "PVTSSF_lADNH5XOABDyGM4AnCva") { ... on ProjectV2SingleSelectField { options { id name } } } }' | grep -i todo
```

---

## Success Criteria Checklist

Before considering this skill run complete, verify all of the following:

- [ ] Parent issue created in `Shopify/developer-tools-team`
- [ ] All child issues have the `child` GitHub label
- [ ] All child issues listed in parent body (unordered lists, no checkboxes)
- [ ] All child issues linked as actual GitHub sub-issues of the parent
- [ ] ALL issues (parent + children) added to "Online Store Developer Platforms" project (#4613)
- [ ] ALL issues have "Project" field = "Hydrogen" in that project
- [ ] ALL issues have "Status" field = "Todo (prioritized)" in that project

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

### 6. HEREDOC Is Blocked in the Claude Code Sandbox
**Problem:** Shell HEREDOC syntax (`cat <<'EOF'` or `cat > file <<'EOF'`) is blocked by the Claude Code sandbox security policy. Any script using HEREDOC will silently fail or error.

**Solution:** Use the `Write` tool to create body files, then pass them via `--body-file`. This applies everywhere a body is needed:
- Parent issue body → Write to `/tmp/claude/parent-body-initial.md`, pass via `--body-file`
- Child issue bodies → Write to `/tmp/claude/child-issue.md`, pass via `--body-file`
- Phase 3-8 child bodies → same pattern
- Parent body update → Write to `/tmp/claude/parent-body.md`, pass via `--body-file`
- PR body → Write to `/tmp/claude/pr-body.md`, pass via `--body-file`

### 7. GraphQL Variable Interpolation in Shell
**Problem:** When shell variables need to expand inside a GraphQL query string that uses single-quote boundaries, naive approaches either fail to expand or break the quote structure.

**Solution:** Use the `'"$VAR"'` pattern to end the single-quote string, expand the variable (double-quoted for safety), and resume the single-quote string:

```bash
# Wrong - $VAR won't expand inside single quotes:
gh api graphql -f query='mutation { ... itemId: "$ITEM_ID" ... }'

# Correct - break out of single quotes to expand the variable:
gh api graphql -f query='mutation { ... itemId: "'"$ITEM_ID"'" ... }'
#                                              ↑end'  expand  "start'↑
```

The pattern `'"$VAR"'` means: end single-quote, double-quote-wrapped variable expansion, start single-quote again.
