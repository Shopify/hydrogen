# Product Requirements Document: Recipes Migration Validation

## Introduction/Overview

This PRD outlines the validation and reconstruction effort for PR #3169, which migrated all Hydrogen examples to the cookbook recipe system. The PR introduced unintended regressions, including deleted code in existing recipes (particularly the subscriptions recipe). This effort aims to systematically rebuild the migration to identify all regressions and ensure no functionality was lost during the conversion process.

## Goals

1. Identify ALL regressions introduced by PR #3169 to the skeleton template, existing recipes, and example conversions
2. Create a clean, reviewable history of the example-to-recipe migration process
3. Validate that all pre-existing recipes still function correctly
4. Ensure faithful conversion of all examples to recipes without loss of functionality
5. Generate a detailed regression report documenting all issues found

## User Stories

1. As a developer, I want to revert PR #3169 cleanly so that I can rebuild the migration properly
2. As a developer, I want to scaffold each example as a standalone project so that I can verify the conversion process
3. As a developer, I want to validate changes to pre-existing recipes so that I can identify unintended modifications
4. As a developer, I want to convert each example to a recipe individually so that I can review each conversion properly
5. As a code reviewer, I want to review small, focused PRs (ideal: 100 lines, good: 100-300 lines, max 500 lines only when absolutely necessary), so that I can provide thorough feedback without being overwhelmed
6. As a maintainer, I want a detailed regression report so that I can understand all issues introduced by PR #3169

## Functional Requirements

### Phase 0: Revert PR #3169
1. The system must revert commit 461e5a5b from the main branch
2. The system must handle any merge conflicts that arise from the reversion
3. The system must create a new working branch for the validation effort

### Phase 1: Scaffold Examples as Standalone Projects
4. The system must scaffold each of the following 11 examples as standalone projects:
   - b2b
   - custom-cart-method
   - express
   - gtm
   - infinite-scroll
   - legacy-customer-account-flow
   - metaobjects
   - multipass
   - partytown
   - subscriptions
   - third-party-queries-caching
5. Each scaffolded example must be created by applying the example to the skeleton template
6. Each scaffolded example must be committed as a separate commit (one commit per example)
7. The scaffolding must preserve the exact state of the example, even if broken
8. No modifications to the scaffolded code are allowed in this phase

### Phase 2: Validate Pre-existing Recipe Changes (Separate PR via Graphite)
9. The system must create a new PR stacked on Phase 1 using Graphite
10. The system must validate changes to the following 4 pre-existing recipes:
    - bundles
    - combined-listings
    - markets
    - subscriptions
11. Each recipe validation must be a separate commit showing the diff between pre-PR and post-PR states
12. The system must verify that each recipe can still be applied to the skeleton template

### Phase 3: Convert Examples to Recipes (Third PR via Graphite)
13. The system must create individual PRs for each example-to-recipe conversion using Graphite
14. Each conversion must transform the scaffolded example into a working recipe
15. The conversion must fix any broken functionality from the original example
16. Each recipe must be validated to ensure it can be applied to the skeleton template

### Phase 4: Final Validation and Reporting
17. The system must generate a detailed comparison between the rebuilt work and PR #3169
18. The system must identify all functional differences and regressions
19. The system must document any code that was deleted unintentionally
20. The system must create a comprehensive regression report in Markdown format

## Non-Goals (Out of Scope)

1. This effort will NOT fix broken examples during the scaffolding phase
2. This effort will NOT create automated testing frameworks
3. This effort will NOT modify the cookbook system itself
4. This effort will NOT create new recipes beyond the example conversions
5. This effort will NOT optimize or refactor the existing recipe code

## PR Strategy

Given the nature of this work involving entire project scaffolding, we'll use the following strategy:

### Stack Structure using Graphite:
1. **Base PR**: Revert of PR #3169 and scaffolding of all 11 examples
   - Each example scaffolding as a separate commit
   - Expected size: Large but mostly generated code
   
2. **Stack Level 2**: Pre-existing recipe validation
   - 4 commits (one per pre-existing recipe)
   - Expected size: Varies based on recipe changes
   
3. **Stack Level 3**: Example-to-recipe conversions
   - 11 separate PRs (one per example conversion)
   - Each PR focused on converting one example to a recipe
   - Expected size: Medium (patch files and recipe configuration)

### Review Strategy:
- Phase 1 can be reviewed as verification that scaffolding matches original examples
- Phase 2 focuses on identifying changes to existing recipes
- Phase 3 PRs can be reviewed individually for conversion correctness

## Technical Considerations

1. **Git Reversion Strategy**: Use `git revert` with conflict resolution rather than hard reset to maintain history
2. **Scaffolding Command**: Use existing cookbook commands to apply examples to skeleton template
3. **Recipe Validation**: Use `npm run cookbook -- validate --recipe <recipe-name>` for validation
4. **Diff Generation**: Use git diff tools to compare pre/post states of recipes
5. **Graphite Tool**: Use `gt` commands for managing the PR stack

## Success Metrics

1. All 11 examples successfully scaffolded as standalone projects
2. All regressions in the skeleton template identified and documented
3. All unintended changes to the 4 pre-existing recipes identified
4. All deleted code from PR #3169 identified and documented
5. Comprehensive regression report delivered by end of day
6. Clean PR stack created using Graphite for reviewability

## Open Questions

1. Should we attempt to fix the React Router 7.8.x compatibility issues during conversion, or document them for later?
2. If reverting PR #3169 causes significant conflicts, what's the fallback strategy?
3. Should the regression report include recommendations for fixes, or just identify issues?
4. How should we handle the renamed example (third-party-queries-caching → third-party-api)?
5. Do we need to validate the cookbook system commands themselves, or trust they work correctly?

## Timeline

**Critical Deadline**: End of Day Today

### Execution Order:
1. **Hour 1-2**: Revert PR #3169 and set up working branch
2. **Hour 2-3**: Scaffold all 11 examples as standalone projects
3. **Hour 3-4**: Validate changes to 4 pre-existing recipes
4. **Hour 4-6**: Convert examples to recipes (can be parallelized)
5. **Hour 6-7**: Generate comparison and regression report
6. **Hour 7-8**: Document findings and create final report

## Regression Report Structure

The final regression report should include:

1. **Executive Summary**: High-level overview of all issues found
2. **Skeleton Template Regressions**: Any code deleted or modified unintentionally
3. **Pre-existing Recipe Changes**: Detailed diff for each of the 4 recipes
4. **Example Conversion Issues**: Problems found during example-to-recipe conversion
5. **Missing Functionality**: Features that existed in examples but were lost
6. **Recommendations**: Suggested fixes for each identified issue
7. **Validation Results**: Status of each recipe after rebuild