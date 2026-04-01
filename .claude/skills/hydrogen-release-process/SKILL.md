---
name: hydrogen-release-process
description: >
  Release process guide for Shopify's Hydrogen framework. Covers the full release flow
  (standard, back-fix, snapshot), manual vs automatic steps, changelog.json updates,
  h2 upgrade enablement, and release failure recovery.
  Use when performing or debugging a Hydrogen release. Also activates when someone mentions
  "release", "release process", "back-fix", "snapit", "changelog.json", "h2 upgrade enablement",
  "release failure", "version PR", "release PR", or "hydrogen release".
---

# Hydrogen Release Process

Hydrogen uses an automated release system built on Changesets, GitHub Actions (`release.yml`), and npm workspaces. For changeset rules that apply to every PR, see `CLAUDE.md`. For versioning semantics (CalVer, API versions), see the `hydrogen-versioning` skill.

## Release Flow: From PR to Production

1. **Developer creates PR with changes**
   - If changes affect `packages/*/src/**` or `packages/*/package.json`, a changeset is required
   - Run `npm run changeset add` to create a changeset file **(MANUAL)**
   - Changeset specifies which packages are affected and version bump type (patch/minor/major)

2. **On merge to main, TWO parallel processes occur:**

   a) **Next Release (immediate)** **(AUTOMATIC)**
      - Every push to main (except release commits) triggers the `next-release` job in `release.yml`
      - Creates snapshot version: `0.0.0-next-{SHA}-{timestamp}`
      - ALL packages are published with `next` tag
      - Available immediately for testing latest changes

   b) **Version PR Creation (if changesets exist)** **(AUTOMATIC)**
      - The `release` job in `release.yml` runs
      - If changesets are found, creates OR updates an open CI release PR
      - PR title: `[ci] release {latestVersion}` (where `latestVersion` is the computed next version — see below)
      - **Important**: This PR accumulates ALL changesets from merged PRs
      - Multiple PRs can be merged before a release (e.g., 10 PRs = 10 changesets in one Version PR)
      - The Version PR automatically updates as new changesets are merged

3. **Production Release — Batched (manual step)**
   - **Releases are batched**: Maintainers decide when to release (could be after 1 PR or 10 PRs)
   - The Version PR accumulates all pending changesets since last release
   - Maintainer reviews accumulated changes and merges the Version PR when ready **(MANUAL)**
   - On merge, `release.yml` publishes to npm with `latest` tag **(AUTOMATIC)**
   - Only packages with changesets get new versions **(AUTOMATIC)**
   - Internal dependencies updated with patch versions **(AUTOMATIC)**
   - Post-release actions:
     - Compiles templates to `dist` branch **(AUTOMATIC)**

4. **Post-Release: Enabling Upgrades (manual step)**
   - After npm publication, `docs/changelog.json` must be updated **(MANUAL)**
   - This enables the `h2 upgrade` command to detect the new version
   - Without this step, developers cannot upgrade using the CLI
   - Process:
     - Update `docs/changelog.json` with release information **(MANUAL)**
     - Include version, dependencies, features, fixes, and upgrade steps **(MANUAL)**
     - Commit and push to main branch **(MANUAL)**
     - Changes are served via https://hydrogen.shopify.dev/changelog.json **(AUTOMATIC)**

   **How `h2 upgrade` works:**
   - Fetches changelog.json from hydrogen.shopify.dev (proxies to the raw content of this file on the `main` branch in the Hydrogen repo)
   - Compares user's current version against available versions
   - Shows features, fixes, and breaking changes for upgrade path
   - Generates local upgrade instructions file in `.hydrogen/` directory
   - Updates package.json dependencies based on changelog specifications

## Understanding Batched Releases

**Key Point**: Not every merged PR triggers a release!

- When you merge a PR with a changeset, it does NOT immediately release to npm
- Instead, your changeset is added to the open CI release PR
- This PR accumulates changesets from ALL merged PRs since the last release
- Maintainers decide when to merge this PR to trigger an actual release
- This allows batching multiple features/fixes into a single release

**Example Timeline**:
- Monday: 3 PRs merged with changesets → Version PR has 3 changesets
- Tuesday: 2 more PRs merged → Version PR now has 5 changesets
- Wednesday: 4 more PRs merged → Version PR now has 9 changesets
- Thursday: Maintainer merges Version PR → All 9 changes released together

## Multi-Package Releases

- Each package versions independently (no fixed/linked packages in changesets config)
- Single changeset can specify multiple packages
- Example: PR changes both `@shopify/hydrogen` and `@shopify/cli-hydrogen`
  - Both packages listed in changeset
  - Each gets appropriate version bump
  - Published together when Version PR merged

### Note: @shopify/hydrogen-codegen

`@shopify/hydrogen-codegen` is an independently-versioned **SemVer** package (not CalVer). It releases through the same changeset/Version PR flow as other packages, but:

- It needs its own changeset when its source or dependency versions change (see Rule 3 in root `CLAUDE.md`)
- It does **not** require bumping `cli-hydrogen` or `create-hydrogen` (it is dynamically loaded, not bundled)
- Its dependency on `@shopify/graphql-codegen` (a separate repo) is invisible to CI workspace linking — always create a changeset when bumping it

## Other Release Types

### Snapshot Testing (`/snapit`)

- Comment `/snapit` on any PR
- Creates snapshot version for testing
- Publishes specific packages for PR validation

### Back-fix Releases

- Push to calver branches (e.g., `2025-01`) triggers the `backfix-release` job in `release.yml`
- Publishes with branch name as npm tag
- Used for patching previous versions
- See the detailed step-by-step below

## Manual vs Automatic Steps

### Manual Steps (Human Intervention Required)

1. **Developer Actions**
   - **Create changesets**: Run `npm run changeset add` for any PR with code changes
   - **Skeleton changes**: MUST include all three packages in changeset: `skeleton`, `@shopify/cli-hydrogen`, AND `@shopify/create-hydrogen` — see changeset rules in CLAUDE.md
   - **Write PR descriptions**: Include clear explanations of changes
   - **Request snapshot builds**: Comment `/snapit` on PR to test changes

2. **Maintainer Actions — Regular Releases**
   - **Merge Version PR**: Review and merge the auto-generated open CI release PR to trigger npm publication
   - **Update changelog.json**: After npm release, manually update this file to enable `h2 upgrade` command
   - **Monitor releases**: Verify packages published correctly and Slack notifications sent

3. **Maintainer Actions — CLI Releases**
   - When cli-hydrogen has updates, create a PR in the Shopify CLI repo and coordinate with Shopify CLI team to request patch release
   - **Post-release actions**: Whether to update skeleton's `@shopify/cli` and trigger a second cli-hydrogen release depends on the nature of the cli-hydrogen changes — see the circular dependency section in CLAUDE.md

4. **Maintainer Actions — Major Version Changes**
   - **`latestBranch` detection**: `latestBranch` is computed dynamically by `calver-shared.js` + `get-calver-version-branch.js` in `release.yml`. No manual editing of `latestBranch` is needed for standard releases.
   - **Configure back-fix branches**: To enable back-fix releases for a previous CalVer branch, add it to the `on.push.branches` array in `.github/workflows/release.yml`. Never add the current CalVer branch.

### Automatic Steps (CI/CD Handles)

1. **On Every Push to Main**
   - Next release publishes immediately with tag `next`
   - Version: `0.0.0-next-{SHA}-{timestamp}`
   - All packages published regardless of changesets

2. **When Changesets Exist on Main**
   - Version PR automatically created
   - Title: `[ci] release {latestVersion}`
   - Contains version bumps and CHANGELOG updates

3. **When Version PR is Merged**
   - Packages publish to npm with `latest` tag
   - Only packages with changesets get new versions
   - Templates compile and push to `dist` branch
   - Slack notification sent (if Hydrogen package included)
   - GitHub releases created with changelogs

4. **When `/snapit` is Commented**
   - `snapit.yml` workflow runs
   - Snapshot version created for PR
   - Packages published with unique tag
   - PR comment updated with installation instructions

5. **On Push to Calver Branches**
   - `backfix-release` job in `release.yml` runs
   - Back-fix version PR created
   - Publishes with branch name as npm tag when merged

## Standard Release (from main)

1. PRs with changesets are merged to main
2. The changesets automation opens or updates a **release PR**
3. **IMPORTANT: Validate BOTH the title AND the description** of the release PR. Bugs can happen where the title may show the correct version (e.g., `2025.7.2` — a patch bump) but the description incorrectly says a different version (e.g., `2025.10.0`). Do not trust one without checking the other.
4. Approve and merge the release PR — this automatically publishes the packages to npm
5. **Monitor the GitHub Actions** that run after merge to confirm they succeed. Example release PR: [#3468](https://github.com/Shopify/hydrogen/pull/3468)
6. Double check that you now see the new release(s) on npm

It is expected that for ~1 hr after doing a new release, scaffolding new Hydrogen projects may continue to be scaffolded using the stale version due to npm caching.

## Back-Fix Releases (detailed)

Sometimes you need to release a patch/minor for a version that is not the latest major, or `main` already has unreleased code for a future version. In these cases, use a back-fix branch.

**If this is your first back-fix, pair with an experienced team member.** The process involves branch naming conventions and force-push scenarios that can silently break things if done wrong.

> [!CAUTION]
> **Branch naming**: The back-fix branch **must** be named to match the major version, e.g., `2024-10`. Do NOT use arbitrary branch names¹. The dev docs automation for updating API documentation depends on this exact naming pattern. If the branch name is wrong, docs will not update and there will be **no error** — it fails silently.

_¹This dev docs automation (at time of writing - Mar. 17, 2026) currently only applies to `@shopify/hydrogen` and `@shopify/hydrogen-react`. It is extremely rare that you would want to back-fix a different package in this monorepo, though you could, and in that case the specific branch name can be whatever you want, you just need to make sure that you have the SAME branch name as what you put in `.github/workflows/release.yml`. Also note that in this situation (after back-fixing a non `@shopify/hydrogen` or `@shopify/hydrogen-react` dependency in this repo), you probably don't need to release a new Hydrogen version, and instead you can just add a new entry to `docs/changelog.json` with the new back-fixed version of the dependency. [Example](https://github.com/Shopify/hydrogen/blob/b1462efb71e5fd358105f5c38a17df1b6ddb13ae/docs/changelog.json#L715-L729): we released a new version of the Shopify CLI that we wanted people to upgrade to, so we just added a _second_ entry in `docs/changelog.json` for Hydrogen version 2025.4.1, as it would be unnecessary to do another release of Hydrogen with just the CLI bump._

**Step-by-step workflow**:

Create the back-fix branch:
1. ALWAYS create a NEW branch from the latest patch/minor of the target major (even if an existing branch by that name already exists!!):
   ```bash
   git checkout -b 2024-10 @shopify/hydrogen@2024.10.1
   ```
2. Add your back-fix branch to the `on.push.branches` array in `.github/workflows/release.yml`. This change is only made on back-fix branches, never on main.
3. Commit and push (FORCE push your version if the branch already exists on remote!!):
   ```bash
   git push origin 2024-10
   ```

> [!WARNING] 
> **Why should I always create a NEW back-fix branch and (force) push, even if one already exists on remote?**
> - While we can update `.github/workflows/release.yml` to automatically create a back-fix branch for each release upon release, we've decided not to. Sometimes changes can accidentally get pushed to or merged into the back-fix branch but not released, so if you were to then add onto it you also have some arbitrary changes present that shouldn't be there. Also, even if a back-fix branch is automatically created after each Hydrogen release, others can still force push to it or make changes to it such that you cannot and should not trust the existing back-fix branch (if it exists) as the source of truth. The existing back-fix branch could theoretically be named "2025-10" but actually contain code from Hydrogen version "2025-01" if someone pushed faulty code to it in the past.

Do the code changes that you want present in the back-fixed version:

1. Create a new branch for your code changes, that is based on the back-fix branch
   ```bash
   git checkout -b 2024-10-my-changes 2024-10
   ```
2. Make your code changes and create a changeset
3. Push your changes to remote, and then create a PR on your `2024-10-my-changes` branch, with the base branch being `2024-10` (obviously adjust specific branch names to your specific case)
4. Get reviews from team members on your PR!
5. Once your PR is approved and merged, a GitHub Action will automatically create a back-fix release PR (example: [#3360](https://github.com/Shopify/hydrogen/pull/3360))
6. Get reviews from team members on the release PR!
7. Merge the release PR and monitor GitHub Actions for release success

## Release Failure Recovery

**If this is your first release failure, pair with an experienced team member before attempting recovery. DO NOT JUST YOLO THIS WITH LLMs!!!!!**

1. **Investigate** the error message from the failed GitHub Action
2. If the issue appears to be a Shopify/npm configuration issue (NOT a Hydrogen-specific issue), get help in `#help-eng-infrastructure` (Slack ID: `C01MXHNTT4Z`)
3. After fixing the underlying issue, **revert the release PR** to re-trigger a release attempt. Use the "Revert" button on the PR's GitHub page.
4. If the revert button does not work (common for back-fix branches):
   - **First, save the current branch state**: `git branch backup-2024-10` (so you can restore if needed)
   - Check out the branch locally
   - Drop the release PR commit(s) via rebase
   - Force push

**WARNING**: The force-push recovery path requires advanced git confidence. If you are not extremely comfortable with `git rebase` and `git push --force`, do not attempt this alone. Verify you are not deleting other commits before force pushing.

## Related Skills

- `CLAUDE.md` — Changeset rules (apply to every PR), skeleton/CLI bundling chain, circular dependency
- `hydrogen-versioning` — CalVer formats, version support policies, release cadence
- `hydrogen-dev-workflow` — Day-to-day development workflow, testing, recipes, PR conventions
