# Hydrogen Release Workflow Simplification Design

## Executive Summary

This document analyzes the current Hydrogen release infrastructure and proposes a simplified architecture leveraging the CalVer system. The goal is to reduce the number of workflows, eliminate manual touchpoints, and create a more maintainable release process while ensuring correctness for millions of users.

## 1. Current State Analysis

### 1.1 Current Workflow Inventory

| Workflow File | Purpose | Triggers | Manual Steps | Complexity |
|--------------|---------|----------|--------------|------------|
| `changesets-reminder.yml` | Remind devs to add changesets | PR opened/changed | None | Low |
| `changesets-linter.yml` | Validate changeset format | PR opened | None | Low |
| `changesets.yml` | Main release orchestration | Push to main | 2-3 steps | High |
| `changesets-back-fix.yml` | Previous version patches | Push to 2025-01 | 2-3 steps | Medium |
| `hydrogen-changelog-config.js` | GitHub-integrated changelog | Called by changesets | Needs token | High |

### 1.2 Current Human Process Flow - Minor/Patch Release

```
Developer Journey - Minor/Patch Release (Current State)
═══════════════════════════════════════════════════════════════════

[DAY 1: Development]
Developer ──► Writes Code ──► Creates PR
    │
    ├─ GitHub Check: changesets-reminder.yml triggers
    │   └─ ⚠️ "No changeset found! Run: npm run changeset add"
    │
    └─ MANUAL STEP 1: Run changeset CLI
        ├─ npm run changeset add
        ├─ Select packages affected
        ├─ Choose: [ ] major [ ] minor [x] patch
        ├─ Write: "Fix hydration issue in Cart component"
        └─ Creates: .changeset/fuzzy-pandas-dance.md

[DAY 2: PR Review]
PR Reviewer ──► Reviews Code + Changeset
    │
    ├─ GitHub Check: changesets-linter.yml
    │   └─ Validates changeset format
    │
    └─ MANUAL STEP 2: Merge PR
        └─ Triggers: changesets.yml workflow

[DAY 2-5: Version PR Accumulation]
GitHub Actions ──► changesets.yml
    ├─ Detects changesets exist
    ├─ Creates/Updates: PR "[ci] release 2025-05"
    ├─ Runs: npm run version
    │   ├─ changeset version (2025.7.1 → 2025.7.2)
    │   ├─ ❌ PROBLEM: No CalVer integration yet
    │   └─ Updates CHANGELOGs
    └─ Version PR waits...

[DAY 5: Release Decision]
Maintainer ──► Reviews Version PR
    │
    ├─ MANUAL STEP 3: Check versions look correct
    ├─ MANUAL STEP 4: Check CHANGELOG entries
    ├─ MANUAL STEP 5: Decide if ready to release
    └─ MANUAL STEP 6: Merge Version PR
        └─ Triggers: npm publish

Total Human Steps: 6
Decision Points: 4
```

### 1.3 Current Human Process Flow - Major Release

```
Developer Journey - Major Release (Current State)
═══════════════════════════════════════════════════════════════════

[WEEK -2: Planning]
Tech Lead ──► Decides Quarterly Release
    │
    ├─ MANUAL: Check Storefront API schedule
    ├─ MANUAL: Coordinate with teams
    └─ MANUAL: Communicate timeline

[WEEK 1: Development]
Multiple Developers ──► Create Breaking Changes
    │
    ├─ Each PR needs changeset
    ├─ MANUAL: Select "major" (often forgotten)
    └─ Creates multiple major changesets

[WEEK 2: Pre-Release]
Maintainer ──► Prepare Release
    │
    ├─ MANUAL STEP 1: Update latestBranch in changesets.yml
    │   └─ Edit line 32: "2025-05" → "2025-07"
    │
    ├─ MANUAL STEP 2: Review all pending changesets
    │
    ├─ MANUAL STEP 3: Run version command locally
    │   └─ See 2025.5.0 → 2026.0.0 (WRONG!)
    │
    ├─ MANUAL STEP 4: Realize CalVer not integrated
    │
    └─ MANUAL STEP 5: Manually edit versions
        └─ Change to 2025.7.0

[RELEASE DAY]
Maintainer ──► Execute Release
    │
    ├─ MANUAL STEP 6: Merge Version PR
    ├─ MANUAL STEP 7: Verify npm publish
    ├─ MANUAL STEP 8: Update hydrogen.shopify.dev
    ├─ MANUAL STEP 9: Send announcement
    └─ MANUAL STEP 10: Monitor for issues

Total Human Steps: 10+
Decision Points: 8
Error-Prone Steps: 5 (version editing, branch updating)
```

## 2. Problems with Current Architecture

### 2.1 Workflow Proliferation
- **4 separate workflows** for changeset management
- Each workflow has different triggers and logic
- Maintenance burden when updating release process

### 2.2 Manual Configuration Updates
- `latestBranch` hardcoded in changesets.yml
- Must remember to update quarterly
- No validation if forgotten

### 2.3 Token Dependencies
- Changelog generation fails without GitHub token
- Blocks local testing
- Creates CI/CD fragility

### 2.4 No CalVer Integration
- Changesets doesn't understand quarterly versioning
- Manual intervention required for every major release
- High risk of version mistakes

### 2.5 Human Decision Fatigue
- Too many manual checkpoints
- Decisions spread across days/weeks
- Context switching between tasks

## 3. Proposed Simplified Architecture

### 3.1 Consolidated Workflow Design

```
BEFORE: 4 workflows + manual scripts
AFTER: 1 unified workflow + CalVer automation

┌─────────────────────────────────────────────┐
│         Unified Release Workflow             │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │   Changeset Detection & Creation     │   │
│  │   (Automatic from PR description)    │   │
│  └──────────────────────────────────────┘   │
│                    ↓                         │
│  ┌──────────────────────────────────────┐   │
│  │      CalVer Version Resolution       │   │
│  │   (Integrated quarterly alignment)   │   │
│  └──────────────────────────────────────┘   │
│                    ↓                         │
│  ┌──────────────────────────────────────┐   │
│  │     Automated Release Decision        │   │
│  │   (Rules-based with overrides)       │   │
│  └──────────────────────────────────────┘   │
│                    ↓                         │
│  ┌──────────────────────────────────────┐   │
│  │      NPM Publish & Monitoring        │   │
│  │   (With automatic rollback)          │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 3.2 New Simplified Workflow File

```yaml
# .github/workflows/unified-release.yml
# REPLACES: changesets.yml, changesets-linter.yml, changesets-reminder.yml, next-release.yml (partially)

name: Unified Release System

on:
  pull_request:
    types: [opened, synchronize]
  push:
    branches: [main, '20[0-9][0-9]-[0-9][0-9]']  # main + calver branches
  schedule:
    - cron: '0 9 * * MON'  # Weekly release check

jobs:
  # Job 1: Changeset Validation (Replaces reminder + linter)
  changeset-validation:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check for changeset
        id: check-changeset
        run: |
          if [ ! -f .changeset/*.md ]; then
            echo "::warning::No changeset found. Please run 'npm run changeset add'"
            exit 1
          fi
      
      - name: Validate changeset format
        run: node scripts/lint-changesets.mjs

  # Job 2: Next Release (Parallel - publishes 0.0.0-next versions)
  next-release:
    if: github.ref == 'refs/heads/main' && !contains(github.event.head_commit.message, '[ci] release')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Publish next versions
        run: |
          # Publish all packages with 0.0.0-next-{SHA}-{timestamp} version
          node scripts/publish-next.js
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

  # Job 3: Version and Release (Replaces changesets.yml main logic)
  version-and-release:
    if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/heads/20')
    runs-on: ubuntu-latest
    outputs:
      released: ${{ steps.release.outputs.published }}
      versions: ${{ steps.release.outputs.versions }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Setup
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'npm'
          
      - name: Install
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Run Unified Version Command
        id: version
        run: |
          # This single command now handles EVERYTHING:
          # 1. Detects if changesets exist
          # 2. Runs changeset version
          # 3. Applies CalVer transformation
          # 4. Updates latestBranch automatically
          # 5. Generates changelog without GitHub token
          node scripts/unified-version.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Create or Update Release PR
        if: steps.version.outputs.has_changes == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          branch: ci-release-${{ steps.version.outputs.quarter }}
          title: "[ci] release ${{ steps.version.outputs.quarter }}"
          body: |
            ## Release ${{ steps.version.outputs.version }}
            
            This PR was opened by the changesets release workflow. Merging it will:
            1. Publish packages to npm with 'latest' tag
            2. Compile templates to dist branch
            3. Send Slack notification
            
            **Note**: After merging, manually update `docs/changelog.json` to enable `h2 upgrade`
            
            ### Changelog
            ${{ steps.version.outputs.changelog }}
          commit-message: "Version Packages (${{ steps.version.outputs.version }})"
          
      # NEVER auto-merge - always requires human review
      
      - name: Generate Changelog Draft
        if: |
          github.event.pull_request.merged == true &&
          contains(github.event.pull_request.title, '[ci] release')
        run: |
          # Generate draft changelog entry for maintainer review
          node scripts/generate-changelog-draft.js \
            --pr=${{ github.event.pull_request.number }} \
            --version=${{ steps.version.outputs.version }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Publish to NPM
        if: |
          github.event.pull_request.merged == true &&
          contains(github.event.pull_request.title, '🚀 Release')
        id: release
        run: |
          node scripts/unified-publish.js
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

  # Job 4: Post-Release (Simplified)
  post-release:
    needs: version-and-release
    if: needs.version-and-release.outputs.released == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Update dist branch
        run: |
          node scripts/compile-templates.js
          git push origin HEAD:dist --force
          
      - name: Notify Slack
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d "{\"version\": \"${{ needs.version-and-release.outputs.versions }}\"}"
```

### 3.3 New Unified Scripts

```javascript
// scripts/unified-version.js
// REPLACES: Complex npm run version chain

const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  console.log('🚀 Unified Version System Starting...');
  
  // 1. Check for changesets
  const hasChangesets = fs.existsSync('.changeset') && 
    fs.readdirSync('.changeset').some(f => f.endsWith('.md'));
  
  if (!hasChangesets) {
    console.log('✅ No changesets found - nothing to release');
    process.exit(0);
  }
  
  // 2. Save original versions (for CalVer)
  const originalVersions = saveOriginalVersions();
  
  // 3. Run changeset version
  execSync('npx changeset version', { stdio: 'inherit' });
  
  // 4. Apply CalVer transformation
  const calverResult = applyCalverTransformation(originalVersions);
  
  // 5. Auto-update latestBranch if needed
  if (calverResult.isQuarterlyRelease) {
    updateLatestBranch(calverResult.newVersion);
  }
  
  // 6. Generate simplified changelog
  const changelog = generateChangelog(calverResult);
  
  // 7. Output for GitHub Actions
  console.log(`::set-output name=has_changes::true`);
  console.log(`::set-output name=version::${calverResult.newVersion}`);
  console.log(`::set-output name=version_type::${calverResult.versionType}`);
  console.log(`::set-output name=risk_level::${calverResult.riskLevel}`);
  console.log(`::set-output name=changelog::${changelog}`);
}

function updateLatestBranch(version) {
  const [year, quarter] = version.split('.');
  const branch = `${year}-${quarter.padStart(2, '0')}`;
  
  // Auto-update ALL workflow files
  const workflowPath = '.github/workflows/unified-release.yml';
  let content = fs.readFileSync(workflowPath, 'utf8');
  content = content.replace(/LATEST_BRANCH=[\d-]+/, `LATEST_BRANCH=${branch}`);
  fs.writeFileSync(workflowPath, content);
  
  console.log(`✅ Updated latestBranch to ${branch}`);
}

function generateChangelog(calverResult) {
  // Simple changelog without GitHub API dependency
  const changes = [];
  
  for (const pkg of calverResult.packages) {
    changes.push(`### ${pkg.name} ${pkg.version}`);
    changes.push('');
    
    for (const changeset of pkg.changesets) {
      changes.push(`- ${changeset.summary}`);
    }
    changes.push('');
  }
  
  return changes.join('\n');
}

main().catch(console.error);
```

## 4. Simplified Human Process Flows

### 4.1 New Minor/Patch Release Flow

```
Simplified Minor/Patch Release (Proposed)
═══════════════════════════════════════════════════════════════════

[Developer]
Creates PR ──► Manually adds changeset
    │
    └─ npm run changeset add (unchanged)

[PR Merged to Main - Two Parallel Paths]
    ├─ Path A: Next Release (immediate)
    │   └─ Publishes 0.0.0-next-{SHA} to npm
    │
    └─ Path B: Version PR Creation
        ├─ Creates/updates "[ci] release 2025-07" PR
        ├─ Accumulates with other changesets
        └─ Waits for human decision

[Maintainer Decision Point]
Reviews Version PR ──► Merges when ready
    ├─ Publishes to npm with 'latest' tag
    ├─ Compiles templates to dist
    └─ Sends Slack notification

[Post-Release Semi-Automated]
Maintainer ──► Uses changelog-update command
    ├─ Claude analyzes CI release PRs
    ├─ Generates draft changelog entry
    ├─ Maintainer reviews/approves
    └─ Enables h2 upgrade for users

[Manual Steps: Create changeset, Merge Version PR, Review changelog]
```

### 4.2 New Major Release Flow

```
Simplified Major Release (Proposed)
═══════════════════════════════════════════════════════════════════

[Pre-Release Planning]
Tech Lead ──► Coordinates quarterly release
    └─ Communicates timeline to teams

[Development Phase]
Developers ──► Create PRs with major changesets
    ├─ npm run changeset add
    └─ Select "major" for breaking changes

[Version PR Accumulation]
Changesets accumulate in "[ci] release 2025-07" PR
    ├─ CalVer automatically converts to 2025.7.0
    └─ latestBranch auto-updates in workflow

[Release Day]
Maintainer ──► Reviews & Merges Version PR
    ├─ Publishes to npm
    ├─ Compiles templates
    └─ Sends notifications

[Post-Release Semi-Automated]
Maintainer ──► Uses changelog-update command
    ├─ Claude analyzes CI release PRs
    ├─ Generates draft changelog entry
    ├─ Maintainer reviews/approves
    └─ Enables h2 upgrade for users

[Manual Steps: Create changesets, Merge Version PR, Review changelog]
```

## 5. Configuration Simplification

### 5.1 Before: Multiple Config Files
```
.changeset/
  ├── config.json (changeset config)
  ├── hydrogen-changelog-config.js (GitHub integration)
.github/workflows/
  ├── changesets.yml (162 lines)
  ├── changesets-linter.yml (13 lines)  
  ├── changesets-reminder.yml (21 lines)
  ├── changesets-back-fix.yml (58 lines)
scripts/
  ├── Various version scripts
```

### 5.2 After: Unified Configuration
```
.changeset/
  ├── config.json (simplified, no GitHub dependency)
.github/workflows/
  ├── unified-release.yml (120 lines total)
scripts/
  ├── unified-version.js (handles everything)
  ├── apply-calver-versioning.js (integrated)
```

## 6. Benefits Analysis

### 6.1 Quantitative Improvements

| Metric | Current | Proposed | Improvement |
|--------|---------|----------|-------------|
| Workflow files | 4 | 1 | 75% reduction |
| Total workflow LOC | 254 | 120 | 53% reduction |
| Manual steps (minor) | 6 | 2-3 | 50-67% reduction |
| Manual steps (major) | 10+ | 3-4 | 60-70% reduction |
| Release batching | Ad-hoc | Intentional | Better planning |
| Config files | 5+ | 2 | 60% reduction |

### 6.2 Qualitative Improvements

✅ **No more forgotten latestBranch updates** - Automated
✅ **No GitHub token dependency** - Simplified changelog
✅ **No manual changeset creation** - Auto-generated from PR
✅ **No version confusion** - CalVer handles everything
✅ **Single source of truth** - One workflow to rule them all
✅ **Reduced cognitive load** - Developers just label PRs
✅ **Faster feedback** - Auto-merge for safe changes

## 7. Implementation Steps

### Step 1: Deploy CalVer & Tools
- Deploy CalVer integration (apply-calver-versioning.js)
- Test CalVer with existing changesets workflow
- Create changelog draft generator script
- Setup Claude commands (changelog-update, shopify-cli-update)

### Step 2: Simplify Workflows
- Consolidate changeset validation logic
- Integrate next-release as parallel job
- Test unified workflow in dry-run mode
- Train team on new tools

### Step 3: Gradual Adoption
- Start using Claude commands for actual releases
- Gather feedback on semi-automation
- Refine scripts based on real usage
- Keep old workflows as fallback

### Step 4: Measure & Iterate
- Track metrics: manual commands, decision points, failure rate
- Compare before/after data
- Identify remaining bottlenecks
- Plan further improvements

## 8. Fallback Options

If new processes encounter issues:
- Old workflows remain available as fallback
- CalVer can be disabled by removing from package.json scripts
- Claude commands are optional - manual process still works
- Each component can be rolled back independently

## 9. Success Criteria & Metrics

### Phase 1 Success Metrics

#### Primary Metrics (Must Improve)
1. **Manual Steps Reduction**
   - **Baseline**: 6-10 manual commands per release
   - **Target**: 2-3 manual commands per release
   - **Measurement**: Count of manual commands executed

2. **Human Decision Points**
   - **Baseline**: 4-8 decision points spread across days
   - **Target**: 2-3 consolidated decision points
   - **Measurement**: Number of times human intervention required

3. **Failed Release Rate**
   - **Baseline**: Track current failure rate due to manual errors
   - **Target**: 50% reduction in manual error failures
   - **Measurement**: Releases requiring rollback or fixes

#### How to Measure
```
# Track for each release:
- [ ] Number of manual commands run
- [ ] Number of human decisions/approvals needed
- [ ] Did release succeed without rollback? (Y/N)
- [ ] What manual errors occurred (if any)?
```

### Technical Requirements
- ✅ Automatic CalVer quarterly alignment
- ✅ No GitHub token dependency for local testing
- ✅ Automatic latestBranch updates
- ✅ Semi-automated changelog generation
- ✅ Parallel next-release for immediate testing

### Deferred to Phase 2
- Auto-merge for low-risk changes (decided against for Phase 1)
- Release scheduling for majors
- Automatic rollback on metrics
- Release health dashboard
- Full changelog automation (using Claude command for now)

## 10. Implementation Philosophy: Phase 1 - Tactical Automation

### Approach
Phase 1 focuses on **simplifying architecture** and **automating individual steps** through tactical human interactions, rather than fully automated workflows.

### Key Components

#### 1. Claude Commands (Semi-Automation)
Strategic use of AI-assisted commands for complex tasks:
- **changelog-update**: Analyzes CI releases, generates changelog entries
- **shopify-cli-update**: Creates PRs in Shopify CLI repo
- **Future commands**: Can be added for other repetitive tasks

#### 2. Unified Scripts
Consolidated scripts that humans trigger:
- **unified-version.js**: Handles CalVer + changesets
- **generate-changelog-draft.js**: Prepares data for Claude
- **publish-next.js**: Manages snapshot releases

#### 3. Human Decision Points
Maintained at critical junctures:
- Version PR merge (never auto-merged)
- Changelog review and approval
- CLI update PR creation
- Release timing decisions

### Benefits of This Approach

1. **Reduces cognitive load** without removing human oversight
2. **Eliminates toil** while maintaining control
3. **Allows incremental adoption** - can automate more over time
4. **Preserves flexibility** for edge cases and exceptions
5. **Builds confidence** before full automation
6. **Measurable improvement** - clear metrics to track success

## 11. Conclusion

This Phase 1 simplified architecture:

1. **Consolidates workflows** from 4 to 1 unified system
2. **Semi-automates complex tasks** via Claude commands
3. **Integrates CalVer seamlessly** into existing flow
4. **Removes local testing barriers** (GitHub token dependency)
5. **Automates configuration updates** (latestBranch)

The new system maintains human control at critical decision points while dramatically reducing manual toil through tactical automation. Maintainers execute scripts and commands that handle the complexity, but retain full visibility and control over the release process.

## Appendix: Script Examples

### A.1 Auto-Changeset Generator
```javascript
// scripts/auto-changeset.js
const fs = require('fs');
const crypto = require('crypto');

function generateChangeset(pr) {
  // Extract version type from labels
  const versionType = extractVersionType(pr.labels);
  
  // Generate summary from PR title/body
  const summary = pr.body || pr.title;
  
  // Determine affected packages
  const packages = detectAffectedPackages(pr.files);
  
  // Create changeset
  const changeset = {
    releases: packages.map(pkg => ({
      name: pkg,
      type: versionType
    })),
    summary: summary
  };
  
  // Write changeset file
  const filename = `.changeset/${generateName()}.md`;
  fs.writeFileSync(filename, formatChangeset(changeset));
  
  return filename;
}

function extractVersionType(labels) {
  if (labels.includes('release: major')) return 'major';
  if (labels.includes('release: minor')) return 'minor';
  if (labels.includes('release: patch')) return 'patch';
  
  // Default based on keywords
  return 'patch';
}
```

### A.2 Changelog Draft Generator
```javascript
// scripts/generate-changelog-draft.js
// Creates a draft entry for the changelog-update Claude command

const fs = require('fs');
const { execSync } = require('child_process');

function generateChangelogDraft(pr, version) {
  // Analyze the CI release PR
  const prData = execSync(`gh pr view ${pr} --json body,title,commits`);
  
  // Extract consumed changesets
  const changesets = extractChangesets(prData);
  
  // Create draft structure for Claude command
  const draft = {
    pr_number: pr,
    version: version,
    changesets: changesets,
    skeleton_changes: getSkeletonChanges(),
    suggested_title: suggestTitle(changesets),
    needs_review: [
      'Title confirmation',
      'Feature vs fix classification',
      'Breaking change identification',
      'Migration steps needed?'
    ]
  };
  
  // Save draft for maintainer to use with Claude
  fs.writeFileSync(
    `.changelog-draft-${version}.json`,
    JSON.stringify(draft, null, 2)
  );
  
  console.log(`\n📝 Changelog draft created: .changelog-draft-${version}.json`);
  console.log(`\nNext steps:`);
  console.log(`1. Review the draft with: cat .changelog-draft-${version}.json`);
  console.log(`2. Run Claude command: npx claude --command changelog-update`);
  console.log(`3. Claude will analyze and generate the final changelog entry`);
  console.log(`4. Review and approve the generated entry`);
  console.log(`5. Changelog will be updated automatically upon approval`);
}

function generateChangelog(version, changesets) {
  const lines = [
    `# Release ${version}`,
    '',
    `Released on ${new Date().toISOString().split('T')[0]}`,
    '',
    '## Changes',
    ''
  ];
  
  // Group by package
  const byPackage = {};
  for (const cs of changesets) {
    for (const release of cs.releases) {
      byPackage[release.name] = byPackage[release.name] || [];
      byPackage[release.name].push({
        type: release.type,
        summary: cs.summary
      });
    }
  }
  
  // Format output
  for (const [pkg, changes] of Object.entries(byPackage)) {
    lines.push(`### ${pkg}`);
    lines.push('');
    
    // Group by type
    const majors = changes.filter(c => c.type === 'major');
    const minors = changes.filter(c => c.type === 'minor');
    const patches = changes.filter(c => c.type === 'patch');
    
    if (majors.length) {
      lines.push('#### Breaking Changes');
      majors.forEach(c => lines.push(`- ${c.summary}`));
      lines.push('');
    }
    
    if (minors.length) {
      lines.push('#### New Features');
      minors.forEach(c => lines.push(`- ${c.summary}`));
      lines.push('');
    }
    
    if (patches.length) {
      lines.push('#### Bug Fixes');
      patches.forEach(c => lines.push(`- ${c.summary}`));
      lines.push('');
    }
  }
  
  return lines.join('\n');
}
```

### A.3 Semi-Automated Changelog Process
```markdown
# Changelog Update Process (Post-Release)

After merging a Version PR that publishes packages to npm:

1. **Draft Generation (Automated)**
   - Workflow creates `.changelog-draft-{version}.json`
   - Contains PR info, changesets, dependency changes
   
2. **Claude Analysis (Semi-Automated)**
   ```bash
   npx claude --command changelog-update
   ```
   - Claude reads the draft file
   - Analyzes all related CI release PRs
   - Asks clarifying questions about naming/classification
   - Generates complete changelog entry
   
3. **Human Review**
   - Maintainer reviews generated entry
   - Confirms accuracy of dependencies
   - Validates migration steps if present
   - Approves final entry
   
4. **Update (Automated)**
   - Upon approval, Claude updates docs/changelog.json
   - Entry inserted at top of releases array
   - File committed to main branch
   
5. **User Availability**
   - h2 upgrade command can now detect new version
   - Users receive upgrade prompts in CLI
```

---

*Focus: Simplification through consolidation and semi-automation*