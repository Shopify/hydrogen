# Create Shopify CLI PRs after releasing new version of @shopify/cli-hydrogen

## Context
You need to update the Shopify CLI to use a new version of @shopify/cli-hydrogen that was just released from the Hydrogen repository. The process varies based on whether this is a major, minor, or patch version bump.

## Pre-Requirements
Before starting, I need:
1. **Local path to Shopify CLI repository** (e.g., `/Users/username/github/cli`)
2. **New cli-hydrogen version number** (e.g., `10.2.0`)
3. **Current stable branch** (optional - I can detect it, format: `stable/3.XX`)

## PR Description Guidelines

When creating PRs, keep descriptions concise and factual:
- ✅ State what's being updated (version numbers)
- ✅ Include release notes from the source
- ✅ Let the changeset and release notes explain the "why"
- ❌ Don't add redundant urgency explanations
- ❌ Don't justify why stable branches need updates
- ❌ Don't repeat information already in the release notes

## What I Will Do

### Phase 1: Pre-Flight Validation ⚠️ CRITICAL

1. **Verify CLI release process documentation is current**
   ```bash
   cd ~/src/github.com/Shopify/vault-pages
   git pull --rebase origin main
   # Read teams/2493/shopify-cli/Releasing.md
   ```
   - Extract the "Creating a new patch version" section from vault-pages
   - Compare it with the expected content below
   - If ANY content has changed, show the differences and ask how to proceed

   **Expected "Creating a new patch version" content:**
   ```
   ### Creating a new patch version

   1. Locate the [opened PR](https://github.com/Shopify/cli/pulls?q=is%3Apr+is%3Aopen+in%3Atitle+%22Version+Packages%22) named **Version Packages - 3.x**. This PR is automatically created with the first merge in a stable branch after a previous release is published. _Changesets_ will automatically detect changes with each merge and update automatically the PR and consequently the `package.json`s and the dependencies between them
   2. Verify that the correct version is updated in every `package.json`, <ins>paying special attention that there is no **major** or **minor** bump</ins>. Approve and merge the **Version Packages** PR when all checks have passed
   3. After merging the PR, the release will be triggered automatically. You can check the status in [GitHub actions](https://github.com/Shopify/cli/actions/workflows/release.yml).
   4. Go to the `stable/3.x` branch and create a new tag with the new version: `git tag 3.x.x && git push --tags`
   5. [Create a new release in the CLI repo](https://github.com/Shopify/cli/releases/new):
      - Use the created tag ("3.x.x")
      - Release title: "3.x.x"
      - Description: summary of the most important changes from Version Packages PR
      - Click "Publish release"
   6. From the `stable/3.x` branch, run `pnpm post-release`. This script will create 2 new PRs:
      - [To update the homebrew-shopify formula](https://github.com/Shopify/homebrew-shopify/pulls?q=is%3Apr+is%3Aopen+Shopify+CLI).
      - [To update the docs](https://github.com/Shopify/shopify-dev/pulls?q=is%3Apr+is%3Aopen+"%5BCLI%5D+Update+docs").
      - Approve and merge both PRs when they pass CI. When in doubt about a change in the docs, ask in `#app-development-app-inner-loop`.
   ```

   - Also extract release schedule table for later use

2. **Navigate to CLI repo and verify clean state**
   ```bash
   cd [CLI_REPO_PATH]
   git status --porcelain
   ```

3. **Validate npm package is published** (WILL EXIT if not found)
   ```bash
   shadowenv exec -- pnpm view @shopify/cli-hydrogen@[VERSION] version
   ```

4. **Check version bump type** (major/minor/patch)
   ```bash
   # First cd to CLI repo path
   cd [CLI_REPO_PATH]
   # Get current cli-hydrogen version from CLI main branch
   git checkout main
   git pull origin main
   # Extract current version from packages/cli/package.json
   # Compare with new version to determine if major/minor/patch bump
   ```

5. **Get next CLI minor version release date**
   - Use the release schedule table extracted from vault-pages in step 2
   - Find the next release date AFTER current calendar date
   - Example: If today is August 5, 2025 and next release is "week of 2025-08-11", that's the target date

6. **Test package installation** (WILL EXIT if fails)
   ```bash
   # Navigate to CLI repo and create a test directory
   cd [CLI_REPO_PATH]
   mkdir -p .tmp-test
   cd .tmp-test

   # Create minimal package.json for testing
   echo '{"name": "test-install"}' > package.json

   # Test installing the new cli-hydrogen version
   shadowenv exec -- pnpm add @shopify/cli-hydrogen@[VERSION] 2>&1 | head -30

   # Look for successful installation (should see dependencies added)
   # Expected output includes: "+ @shopify/cli-hydrogen [VERSION]"

   # Clean up test directory
   cd ..
   rm -rf .tmp-test
   ```

7. **Fetch GitHub release notes**
   ```bash
   curl -s "https://api.github.com/repos/Shopify/hydrogen/releases/tags/%40shopify%2Fcli-hydrogen%40[VERSION]"
   ```

8. **Update base dependencies if needed**
   - Check if `@shopify/cli-kit`, `@shopify/plugin-cloudflare`, or `@shopify/cli` need updates by running the command `shadowenv exec -- pnpm view @shopify/cli-hydrogen@[VERSION] dependencies peerDependencies | grep -A1 -E "@shopify/(cli-kit|plugin-cloudflare|cli)"`
   - If versions differ, update them in package.json

### Phase 2: Version-Based Branching Logic

#### For MAJOR Version Bumps:
- **Action**: Wait for next scheduled CLI minor version bump
- **PR Strategy**: Only create PR against main branch
- **Changeset**: Include in main PR
- **Slack Notification**: None
- **Message to user**: "This is a major version bump. We must wait for the next CLI minor version release on [DATE]. Major bumps cannot be released as patches to stable branches."

#### For MINOR or PATCH Version Bumps:
1. **Determine urgency** - Ask user:
   - **Urgent**: Need release within the next day → PRs to main + stable, with Slack notification
   - **Timely**: Need release within the next few days → Show next CLI release date, let user decide
   - **Not urgent**: Can wait for next scheduled release → PR to main only, no Slack notification

   **⚠️ CRITICAL**: When creating both main and stable PRs, the changeset goes ONLY in the stable PR!

2. **For Timely bumps**, present options:
   - "The next scheduled CLI minor version release is [DATE]. Would you like to:"
   - Option A: Wait for scheduled release (PR to main only, with Slack notification)
   - Option B: Request immediate patch release (PRs to main + stable, with Slack notification)

### Phase 3: Create Main Branch PR

1. **Create feature branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b update-cli-hydrogen-[VERSION]
   ```

2. **Update package.json**
   - Edit `packages/cli/package.json` line ~119
   - Update `"@shopify/cli-hydrogen": "[NEW_VERSION]"`

3. **Update dependencies and generate files**
   ```bash
   shadowenv exec -- pnpm i
   shadowenv exec -- pnpm graphql-codegen:get-graphql-schemas
   shadowenv exec -- pnpm graphql-codegen
   shadowenv exec -- pnpm refresh-manifests
   shadowenv exec -- pnpm test:regenerate-snapshots
   shadowenv exec -- pnpm build-api-docs
   shadowenv exec -- pnpm build-dev-docs
   ```

4. **Create changeset** ⚠️ CRITICAL: ONLY if NOT doing stable branch PR
   **IMPORTANT**: If you are creating both main and stable PRs, SKIP THIS STEP ENTIRELY for the main PR!
   ```bash
   cat > .changeset/update-hydrogen-cli-[VERSION].md << 'EOF'
---
'@shopify/cli': patch
---

Update cli-hydrogen [VERSION]
EOF
   ```

5. **Commit and push (with consent)**
   ```bash
   git add .
   git commit -m "Bump cli-hydrogen to [VERSION]"
   # Will ask for consent before pushing
   git push origin update-cli-hydrogen-[VERSION]
   ```

6. **Create PR with auto-fetched release notes**
   ```bash
   gh pr create --repo Shopify/cli \
     --title "hydrogen/Bump cli-hydrogen to [VERSION] (main)" \
     --body "[AUTO-GENERATED WITH RELEASE NOTES]" \
     --base main
   ```

   **Good PR Description Example**: https://github.com/Shopify/cli/pull/6188

### Phase 4: Create Stable Branch PR (Only for urgent/timely minor/patch)

1. **Create branch from stable**
   ```bash
   git checkout [STABLE_BRANCH]
   git pull origin [STABLE_BRANCH]
   git checkout -b stable-update-cli-hydrogen-[VERSION]
   ```

2. **Repeat update process**
   - Same package.json update
   - Same pnpm commands (with shadowenv exec --)
   - **⚠️ CRITICAL: Include changeset HERE in stable branch PR**
   - **REMINDER**: The main branch PR must NOT have a changeset when doing both PRs
   - Changeset filename: `stable-update-hydrogen-cli-[VERSION].md`

3. **Create PR to stable branch**
   ```bash
   gh pr create --repo Shopify/cli \
     --title "hydrogen/Bump cli-hydrogen to [VERSION]" \
     --body "[AUTO-GENERATED WITH RELEASE NOTES]" \
     --base [STABLE_BRANCH]
   ```


4. **Update main branch PR with link to stable PR**
  ```bash
    # Edit the main PR body to add the link
    gh pr edit [MAIN_PR_NUMBER] --repo Shopify/cli \
      --body "[EXISTING_BODY]
      ## Related PRs
      - Stable branch PR (with changeset): [STABLE_PR_URL]"
  ```

### Phase 5: Post-PR Steps (Only for urgent/timely minor/patch releases)

1. **Send Slack notification for review**

   a. **Decrypt webhook URL**
      ```bash
      npm run decrypt
      ```
      - If this fails, abort and notify user
      - The webhook URL is stored in `secrets.ejson` as `slack_cli_release_request_webhook_url`

   b. **Determine which message version to use**
      - **Version 1**: For main PR only scenarios
      - **Version 2**: For both main and stable PR scenarios

      Where `[URGENCY_WITH_EXPLANATION]` will be:
      - For urgent: `urgent :alarm-siren: - we would like to do a new release within the next day`
      - For timely (immediate): `timely - we would like to do a new release within the next few days`
      - For timely (wait): `timely - we would like this version bump to be in the upcoming CLI release`

   c. **Get user approval**
      - Show the exact message that will be posted (formatted as it will appear in Slack)
      - Wait for explicit approval before posting
      - Apply any requested changes and iterate

   d. **POST to webhook** (SOURCE OF TRUTH for message templates)
      - Read the decrypted `slack_cli_release_request_webhook_url` from `secrets.json`
      - POST the approved message using pure Node.js to avoid bash escaping:
      - **CRITICAL**: Must use Node.js exactly as shown below. Do NOT use bash, Python, or other methods as they will cause extra backslashes to appear in the posted message

      **Message Version 1: Main PR Only**
      Use when: Timely release that will wait for scheduled CLI release
      ```bash
      node -e "
      const https = require('https');

      // MESSAGE VERSION 1: Main PR only (for timely/wait scenario)
      const message = 'Hello! Could we please get some eyes on this @shopify/cli-hydrogen upgrade PR? :cli:\\n- [MAIN_PR_URL] - main\\n\\nThis request is [URGENCY_WITH_EXPLANATION].\\n\\nThank you on behalf of @headless-devs! :hydrogen-party:';

      const payload = JSON.stringify({ message: message });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length
        }
      };

      const req = https.request('[WEBHOOK_URL]', options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { console.log(data); });
      });

      req.write(payload);
      req.end();
      "
      ```

      **Message Version 2: Both Main and Stable PRs**
      Use when: Urgent release OR Timely release with immediate patch request
      ```bash
      node -e "
      const https = require('https');

      // MESSAGE VERSION 2: Both main and stable PRs (for urgent or timely/immediate scenarios)
      const message = 'Hello! Could we please get some eyes on this @shopify/cli-hydrogen upgrade PR? :cli:\\n- [STABLE_PR_URL] - latest stable release branch\\n\\nThis request is [URGENCY_WITH_EXPLANATION].\\n\\nEquivalent PR to main branch (without changeset):\\n- [MAIN_PR_URL]\\n\\nThank you on behalf of @headless-devs! :hydrogen-party:';

      const payload = JSON.stringify({ message: message });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length
        }
      };

      const req = https.request('[WEBHOOK_URL]', options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { console.log(data); });
      });

      req.write(payload);
      req.end();
      "
      ```

      - **Important**: The webhook expects a JSON object with a `"message"` field (not `"text"`)
      - Message must be hardcoded in the Node.js script to avoid bash escaping of special characters
      - Replace `[MAIN_PR_URL]`, `[STABLE_PR_URL]` (version 2 only), `[URGENCY_WITH_EXPLANATION]`, and `[WEBHOOK_URL]` directly in the script
      - I will select the appropriate version based on the scenario automatically
      - Expected successful response: `{"ok":true}`
      - **Why Node.js**: Using bash curl, Python, or other methods will cause extra backslashes to appear in the Slack message. The Node.js approach shown above is the only reliable method

2. **Monitor for cli-kit version**
   - After release, cli-kit might be one version behind
   - Check cli-kit changelog for any critical updates

3. **Update Hydrogen's changelog.json**
   - Add new Shopify CLI version to enable upgrades
   - Do NOT retroactively update previous entries

## Summary of PR Strategies

| Version Type | Urgency | PRs Created | Changeset Location | Slack Notification | Slack Notification Version |
|-------------|---------|-------------|-------------------|-------------------|-----------------------------|
| Major | N/A | Main only | Main PR | No | N/A |
| Minor/Patch | Not urgent | Main only | Main PR | No | N/A |
| Minor/Patch | Timely (wait) | Main only | Main PR | Yes | Version 1 |
| Minor/Patch | Timely (immediate) | Main + Stable | **Stable PR ONLY** ⚠️ | Yes | Version 2 |
| Minor/Patch | Urgent | Main + Stable | **Stable PR ONLY** ⚠️ | Yes | Version 2 |

### ⚠️ CRITICAL CHANGESET RULE

**When creating BOTH main and stable PRs:**
- The changeset MUST go in the stable branch PR ONLY
- The main branch PR must NEVER include a changeset
- This prevents duplicate releases and version conflicts

**When creating ONLY a main PR:**
- The changeset goes in the main PR as normal

## Dependency Chain Context

The release involves a complex circular dependency:
```
@shopify/cli-hydrogen (bundles skeleton)
    ↓ included in
@shopify/cli (main Shopify CLI)
    ↓ used by
skeleton template's devDependencies
    ↓ bundled in
@shopify/cli-hydrogen (circular!)
```

This may require a second cli-hydrogen release after the Shopify CLI is updated to bundle the correct skeleton version.

## Exit Conditions

I will EXIT immediately if:
- ❌ cli-hydrogen version is not published on npm
- ❌ Package installation fails (dependency conflicts)
- ❌ Repository has uncommitted changes
- ❌ Not in the correct repository

## Commands I'll Run

All commands that modify the repository will request explicit consent before execution. I will:
- ✅ Validate everything before making changes
- ✅ Show you what will be changed
- ✅ Ask for permission before pushing
- ✅ Create detailed PR descriptions with release notes

## Required Information

1. **Local CLI repository path**: ~/src/github.com/Shopify/cli
2. **cli-hydrogen version to update**: latest
3. **Stable branch** (optional, I can detect): the latest stable branch

## Phase 6: Creating the Patch Release (After Stable PR Merge)

When the stable branch PR has been merged and you need to create the patch release, I will execute the following steps:

### What I'll Do Automatically:

1. **Monitor for Version Packages PR** (may take several minutes)
   ```bash
   # Navigate to CLI repo
   cd ~/src/github.com/Shopify/cli

   # Find the "Changeset Release" workflow that will create the Version Packages PR
   # This workflow is triggered after the stable branch PR merge
   # The display title will be "Merge pull request #XXXX from Shopify/stable-update-cli-hydrogen-..."
   gh run list --workflow=release.yml --repo Shopify/cli --branch stable/3.x --limit 1 --json databaseId,status,conclusion,displayTitle,name

   # Watch the workflow (this runs the changeset action)
   gh run watch [RUN_ID] --repo Shopify/cli --exit-status

   # Once workflow completes successfully, the Version Packages PR will be created
   # Find the Version Packages PR
   gh pr list --base stable/3.x --search "Version Packages" --state open
   ```
   - I'll watch the workflow in real-time
   - Once it completes, the Version Packages PR will be available
   - Show you the PR link once found

2. **Review the Version Packages PR**
   ```bash
   # View the PR to verify version bumps
   gh pr view [PR_NUMBER] --repo Shopify/cli

   # Check the changed files
   gh pr diff [PR_NUMBER] --repo Shopify/cli --name-only

   # Verify ONLY patch bumps (no major/minor)
   gh pr diff [PR_NUMBER] --repo Shopify/cli | grep -E '"version":|"@shopify/cli-hydrogen":'

   # Check current approvals
   gh pr view [PR_NUMBER] --repo Shopify/cli --json reviews
   ```

   **I'll provide you with:**
   - PR URL: `https://github.com/Shopify/cli/pull/[PR_NUMBER]`
   - My analysis of version changes (confirming patch-only bumps)
   - List of changed packages and their version bumps
   - Current approval status

   **What to look for when reviewing:**
   - ✅ All version bumps are patch level (e.g., 3.80.4 → 3.80.5)
   - ✅ The cli-hydrogen dependency is updated to your new version
   - ❌ NO major or minor bumps (e.g., 3.80.4 → 3.81.0 would be wrong)
   - ❌ NO unexpected package changes

3. **Help merge the Version Packages PR**
   ```bash
   # Check CI status
   gh pr checks [PR_NUMBER] --repo Shopify/cli

   # Verify PR has approvals
   gh pr view [PR_NUMBER] --repo Shopify/cli --json reviews,reviewDecision
   ```

   **Once you've approved and CI passes:**
   - I'll verify the PR has at least 1 approval
   - If approved, I'll merge it: `gh pr merge [PR_NUMBER] --repo Shopify/cli --merge`
   - If not approved, I'll remind you to get approval first

4. **Monitor the release workflow**
   ```bash
   # Get the workflow run ID from the merge
   gh run list --workflow=release.yml --repo Shopify/cli --limit 1 --json databaseId,status

   # Watch the release progress
   gh run watch [RUN_ID] --repo Shopify/cli
   ```
   - I'll track the automated release process
   - Notify you when it completes successfully

5. **Create and push the git tag**
   ```bash
   # Checkout stable branch and pull latest
   git checkout stable/3.x
   git pull origin stable/3.x

   # Get the new version from package.json
   NEW_VERSION=$(jq -r '.version' packages/cli/package.json)

   # Create and push the tag
   git tag "$NEW_VERSION"
   git push origin "$NEW_VERSION"
   ```

### What You Need to Do Manually:

6. **Create the GitHub Release** (MANUAL STEP)

   I'll provide you with:
   - Direct link: `https://github.com/Shopify/cli/releases/new`
   - Pre-filled information:
     - **Tag**: The version tag I just created (e.g., "3.80.5")
     - **Release title**: Same as tag (e.g., "3.80.5")
     - **Release description**: I'll generate this from the Version Packages PR, formatted as:
       ```
       ## What's Changed

       ### @shopify/cli-hydrogen
       - Updated to version [VERSION]
       - [Summary of changes from Hydrogen release notes]

       ### Other Updates
       - [Any other package updates from the changeset]

       Full changelog: [Link to Version Packages PR]
       ```

   You'll need to:
   1. Click the provided link
   2. Select the tag I created
   3. Paste the release description I prepared
   4. Click "Publish release"

### What I'll Do After You Publish:

7. **Run post-release script**
   ```bash
   # Ensure we're on stable branch
   git checkout stable/3.x
   git pull origin stable/3.x

   # Run post-release to create homebrew and docs PRs
   shadowenv exec -- pnpm post-release
   ```
   - This creates 2 PRs automatically:
     - Homebrew formula update
     - Documentation update

8. **Review and help merge the post-release PRs** ⚠️ **CRITICAL - DO NOT SKIP**

   **Note**: The post-release script creates these PRs with the user as the author, so they cannot approve their own PRs on GitHub.

   **⚠️ MANDATORY ACTIONS I MUST COMPLETE IN ORDER:**

   **Step 8a: Initial Review & Request User Action**
   ```bash
   # Find and review the homebrew PR
   gh pr list --repo Shopify/homebrew-shopify --search "Shopify CLI" --state open
   gh pr view [HOMEBREW_PR] --repo Shopify/homebrew-shopify --json reviews,statusCheckRollup,url,state,files

   # Find and review the docs PR
   gh pr list --repo Shopify/shopify-dev --search "[CLI] Update docs" --state open
   gh pr view [DOCS_PR] --repo Shopify/shopify-dev --json reviews,statusCheckRollup,url,state
   ```
   **REQUIRED OUTPUT TO USER:**
   - Homebrew PR URL and current status
   - Docs PR URL and current status
   - CI status for both PRs (pass/fail/running)
   - Current approval status
   - **MUST SAY for Homebrew PR**: "Please review the homebrew PR. Since you created it, you can't formally approve it on GitHub, but please confirm it looks correct and I'll merge it for you."
   - **MUST SAY for Docs PR**: "Please get a team member to approve the docs PR (you can't approve your own PR). Once approved, you can comment /shipit to deploy."
   - **MUST WAIT** for user confirmation

   **Step 8b: Verify Ready State** (only after user confirms)
   ```bash
   # For Homebrew PR - check if user confirmed it looks good
   gh pr view [HOMEBREW_PR] --repo Shopify/homebrew-shopify --json mergeable,state

   # For Docs PR - check for external approval
   gh pr view [DOCS_PR] --repo Shopify/shopify-dev --json reviews,reviewDecision,mergeable
   ```
   **REQUIRED CHECKS:**
   - **Homebrew PR**: User has confirmed it looks correct (no GitHub approval needed)
   - **Docs PR**: Has reviewDecision: "APPROVED" from someone else
   - Both PRs are mergeable: "MERGEABLE"
   - CI has passed (no failing checks)
   - If docs PR not approved: remind user to get external approval and WAIT

   **Step 8c: Merge/Deploy the PRs** (only after ALL checks pass)
   ```bash
   # Merge homebrew PR (after user confirms it looks good)
   gh pr merge [HOMEBREW_PR] --repo Shopify/homebrew-shopify --merge

   # Confirm homebrew merge
   gh pr view [HOMEBREW_PR] --repo Shopify/homebrew-shopify --json state

   # For docs PR: Remind user to post /shipit (they must do this themselves)
   # The user will comment /shipit after external approval is received
   ```
   **REQUIRED ACTIONS:**
   - Merge homebrew PR after user confirmation
   - Report homebrew merge success/failure
   - **TELL USER**: "Homebrew PR merged! For the docs PR, once it has external approval, please comment '/shipit' to deploy it."
   - Wait for user to confirm they've posted /shipit
   - Monitor docs PR for deployment status after user posts /shipit
   - Provide final summary of both PRs processed

   **❌ DO NOT mark this step complete until:**
   - Both PRs URLs provided to user
   - User has reviewed homebrew PR and confirmed it looks correct
   - Homebrew PR successfully merged by me
   - User has confirmed docs PR has external approval
   - User has posted /shipit on docs PR themselves
   - Docs PR deployment confirmed (or merged via /shipit)
   - Final success confirmation provided to user

   **If I skip ANY part of this step, I have FAILED the task**

### Summary:
- **I handle**: Monitoring, reviewing, and executing commands
- **You handle**: Reviewing my analysis, approving PRs, and creating the GitHub release
- **Time estimate**: ~20-30 minutes total (mostly waiting for automation)
- **Key wait**: Step 1 may take 5-10 minutes for the Version Packages PR to appear

### Important Notes:
- I will NOT approve any PRs - I'll only review and provide analysis
- I will NOT merge any PRs without existing approvals
- I'll always show you PR URLs and wait for your review before proceeding
