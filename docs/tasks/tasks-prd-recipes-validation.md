# Task List: Recipes Migration Validation

## PR Breakdown

This validation effort will be implemented across the following PRs using Graphite stacks:

**PR 1: Revert PR #3169** (~50-100 lines + conflict resolutions)
- Clean revert of commit 461e5a5b
- Separate commits for any merge conflict resolutions
- Document what conflicts were encountered

**PR 2: Scaffold Examples** (~500+ lines - large but mostly generated)
- Scaffold all 11 examples as standalone projects
- Each example as a separate commit
- Document scaffolding results

**PR 3: Pre-existing Recipe Validation** (~100-300 lines per recipe)
- Validate 4 pre-existing recipes (bundles, combined-listings, markets, subscriptions)
- Document changes between pre/post PR #3169 states
- Each recipe validation as separate commit

**PRs 4-14: Example-to-Recipe Conversions** (11 separate PRs, ~100-300 lines each)
- Convert each scaffolded example to a working recipe
- Fix broken functionality from original examples
- Validate each recipe can be applied to skeleton

**PR 15: Regression Report and Documentation** (~100 lines)
- Generate comprehensive regression report
- Document all findings and recommendations

## Relevant Files

- `.github/workflows/changesets.yml` - CI workflow configuration
- `templates/skeleton/` - Base skeleton template
- `examples/` - Original examples directory (to be examined)
- `app/routes/` - Recipe routes and implementations
- `app/lib/` - Recipe utilities and helpers
- `package.json` - Dependencies and scripts
- `cookbook.config.json` - Cookbook configuration
- `docs/tasks/regression-report.md` - Final regression report (to be created)
- `docs/validation/merge-conflicts.md` - Document any merge conflicts (to be created if needed)

### Notes

- This is a Hydrogen (JavaScript/TypeScript) project, not Rails
- Use `npm run` commands for testing and validation
- Follow Graphite workflow with `gt` commands for version control
- Each example scaffolding creates substantial code but needs separate commits
- Recipe validation uses `npm run cookbook -- validate --recipe <recipe-name>`
- Critical deadline: End of day today
- Maintain clean commit history for reviewability
- Document all regressions found, even minor ones
- Test files may not exist for all components (this is a migration validation)
- The goal is identifying regressions, not fixing examples during scaffolding
- **IMPORTANT**: Keep merge conflict resolutions in separate commits for clarity

## Version Control with Graphite

### Key Commands for This Project
- Create branches: `gt create <branch-name>`
- Stage files: `gt add <files>` (never use `.` or `--all`)
- Commit: `gt modify --message "commit message"`
- Add additional commits: `gt modify --commit --message "commit message"`
- Submit PR: `gt submit` (current branch) or `gt submit --stack` (entire stack)
- Navigate stack: `gt up` / `gt down`
- Check state: `gt log` or `gt ls`
- Fetch updates: `gt get` (never use `gt sync` with worktrees)

## Tasks

- [ ] 0. Initial Setup

  - [ ] 0.1. Create feature branch using `gt create revert-pr-3169` (from main branch)

  - [ ] 0.2. Document the current state of PR #3169 by examining commit 461e5a5b

  - [ ] 0.3. Create a tracking document at `docs/tasks/validation-progress.md` to monitor progress

- [ ] 1. Revert PR #3169 (PR 1)

  - [ ] 1.1. Examine the original PR #3169 changes
    - [ ] 1.1.1. Run `git show 461e5a5b --stat` to see all affected files
    - [ ] 1.1.2. Document the scope of changes in validation-progress.md
    - [ ] 1.1.3. Identify potential conflict areas (files modified since PR #3169)

  - [ ] 1.2. Perform the revert
    - [ ] 1.2.1. Run `git revert 461e5a5b --no-commit` to start the revert
    - [ ] 1.2.2. Review the revert changes with `git status` and `git diff --cached`
    - [ ] 1.2.3. If no conflicts, proceed to commit preparation

  - [ ] 1.3. Handle merge conflicts (if any)
    - [ ] 1.3.1. Document each conflict in `docs/validation/merge-conflicts.md`
    - [ ] 1.3.2. Resolve conflicts file by file, preserving pre-PR #3169 state
    - [ ] 1.3.3. Stage resolved files individually using `gt add <file>`
    - [ ] 1.3.4. Create separate commit for conflict resolutions: `gt modify --commit --message "fix: resolve merge conflicts from PR #3169 revert"`

  - [ ] 1.4. Commit the clean revert
    - [ ] 1.4.1. Stage all revert changes using `gt add` with specific files
    - [ ] 1.4.2. Commit using `gt modify --message "revert: PR #3169 (commit 461e5a5b) - restore examples and recipes to pre-migration state"`
    - [ ] 1.4.3. If there were manual conflict resolutions, ensure they're in a separate commit

  - [ ] 1.5. Verify the revert
    - [ ] 1.5.1. Check that examples directory is restored: `ls -la examples/`
    - [ ] 1.5.2. Verify pre-existing recipes are restored to original state
    - [ ] 1.5.3. Run `npm install` to ensure dependencies are correct
    - [ ] 1.5.4. Run `npm run build` to verify the project builds

  - [ ] 1.6. Document revert details
    - [ ] 1.6.1. Update validation-progress.md with revert status
    - [ ] 1.6.2. Note any files that required manual conflict resolution
    - [ ] 1.6.3. List any unexpected issues encountered

  - [ ] 1.7. **[PR BOUNDARY]** Submit PR 1 using `gt submit`

- [ ] 2. Scaffold Examples as Standalone Projects (PR 2)

  - [ ] 2.1. Create new branch using `gt create scaffold-examples` (stacks on current branch)

  - [ ] 2.2. Prepare scaffolding environment
    - [ ] 2.2.1. Create temp-scaffold directory: `mkdir -p temp-scaffold`
    - [ ] 2.2.2. Document scaffolding approach in validation-progress.md
    - [ ] 2.2.3. Verify cookbook commands are working

  - [ ] 2.3. Scaffold b2b example
    - [ ] 2.3.1. Apply b2b example to skeleton: `npm run cookbook -- apply --recipe b2b --path temp-scaffold/b2b`
    - [ ] 2.3.2. Copy scaffolded code to track changes
    - [ ] 2.3.3. Stage and commit: `gt modify --commit --message "scaffold: b2b example as standalone project"`

  - [ ] 2.4. Scaffold custom-cart-method example
    - [ ] 2.4.1. Apply example to skeleton: `npm run cookbook -- apply --recipe custom-cart-method --path temp-scaffold/custom-cart-method`
    - [ ] 2.4.2. Copy scaffolded code to track changes
    - [ ] 2.4.3. Stage and commit: `gt modify --commit --message "scaffold: custom-cart-method example"`

  - [ ] 2.5. Scaffold express example
    - [ ] 2.5.1. Apply example to skeleton: `npm run cookbook -- apply --recipe express --path temp-scaffold/express`
    - [ ] 2.5.2. Copy scaffolded code to track changes
    - [ ] 2.5.3. Stage and commit: `gt modify --commit --message "scaffold: express example"`

  - [ ] 2.6. Scaffold gtm example
    - [ ] 2.6.1. Apply example to skeleton: `npm run cookbook -- apply --recipe gtm --path temp-scaffold/gtm`
    - [ ] 2.6.2. Copy scaffolded code to track changes
    - [ ] 2.6.3. Stage and commit: `gt modify --commit --message "scaffold: gtm example"`

  - [ ] 2.7. Scaffold infinite-scroll example
    - [ ] 2.7.1. Apply example to skeleton: `npm run cookbook -- apply --recipe infinite-scroll --path temp-scaffold/infinite-scroll`
    - [ ] 2.7.2. Copy scaffolded code to track changes
    - [ ] 2.7.3. Stage and commit: `gt modify --commit --message "scaffold: infinite-scroll example"`

  - [ ] 2.8. Scaffold legacy-customer-account-flow example
    - [ ] 2.8.1. Apply example to skeleton: `npm run cookbook -- apply --recipe legacy-customer-account-flow --path temp-scaffold/legacy-customer-account-flow`
    - [ ] 2.8.2. Copy scaffolded code to track changes
    - [ ] 2.8.3. Stage and commit: `gt modify --commit --message "scaffold: legacy-customer-account-flow example"`

  - [ ] 2.9. Scaffold metaobjects example
    - [ ] 2.9.1. Apply example to skeleton: `npm run cookbook -- apply --recipe metaobjects --path temp-scaffold/metaobjects`
    - [ ] 2.9.2. Copy scaffolded code to track changes
    - [ ] 2.9.3. Stage and commit: `gt modify --commit --message "scaffold: metaobjects example"`

  - [ ] 2.10. Scaffold multipass example
    - [ ] 2.10.1. Apply example to skeleton: `npm run cookbook -- apply --recipe multipass --path temp-scaffold/multipass`
    - [ ] 2.10.2. Copy scaffolded code to track changes
    - [ ] 2.10.3. Stage and commit: `gt modify --commit --message "scaffold: multipass example"`

  - [ ] 2.11. Scaffold partytown example
    - [ ] 2.11.1. Apply example to skeleton: `npm run cookbook -- apply --recipe partytown --path temp-scaffold/partytown`
    - [ ] 2.11.2. Copy scaffolded code to track changes
    - [ ] 2.11.3. Stage and commit: `gt modify --commit --message "scaffold: partytown example"`

  - [ ] 2.12. Scaffold subscriptions example
    - [ ] 2.12.1. Apply example to skeleton: `npm run cookbook -- apply --recipe subscriptions --path temp-scaffold/subscriptions`
    - [ ] 2.12.2. Copy scaffolded code to track changes
    - [ ] 2.12.3. Stage and commit: `gt modify --commit --message "scaffold: subscriptions example"`

  - [ ] 2.13. Scaffold third-party-queries-caching example
    - [ ] 2.13.1. Apply example to skeleton: `npm run cookbook -- apply --recipe third-party-queries-caching --path temp-scaffold/third-party-queries-caching`
    - [ ] 2.13.2. Copy scaffolded code to track changes
    - [ ] 2.13.3. Stage and commit: `gt modify --commit --message "scaffold: third-party-queries-caching example"`

  - [ ] 2.14. Document scaffolding results
    - [ ] 2.14.1. Create summary in `docs/tasks/scaffolding-summary.md`
    - [ ] 2.14.2. Note any examples that failed to scaffold properly
    - [ ] 2.14.3. Document any errors or warnings encountered

  - [ ] 2.15. **[PR BOUNDARY]** Submit PR 2 using `gt submit`

- [ ] 3. Validate Pre-existing Recipe Changes (PR 3)

  - [ ] 3.1. Create new branch using `gt create validate-existing-recipes` (stacks on current branch)

  - [ ] 3.2. Validate bundles recipe changes
    - [ ] 3.2.1. Examine bundles recipe before PR #3169 (use git history)
    - [ ] 3.2.2. Compare with current bundles recipe implementation
    - [ ] 3.2.3. Document differences in `docs/validation/bundles-changes.md`
    - [ ] 3.2.4. Run validation: `npm run cookbook -- validate --recipe bundles`
    - [ ] 3.2.5. Stage and commit findings: `gt modify --commit --message "validate: bundles recipe changes"`

  - [ ] 3.3. Validate combined-listings recipe changes
    - [ ] 3.3.1. Examine combined-listings recipe before PR #3169
    - [ ] 3.3.2. Compare with current combined-listings recipe implementation
    - [ ] 3.3.3. Document differences in `docs/validation/combined-listings-changes.md`
    - [ ] 3.3.4. Run validation: `npm run cookbook -- validate --recipe combined-listings`
    - [ ] 3.3.5. Stage and commit findings: `gt modify --commit --message "validate: combined-listings recipe changes"`

  - [ ] 3.4. Validate markets recipe changes
    - [ ] 3.4.1. Examine markets recipe before PR #3169
    - [ ] 3.4.2. Compare with current markets recipe implementation
    - [ ] 3.4.3. Document differences in `docs/validation/markets-changes.md`
    - [ ] 3.4.4. Run validation: `npm run cookbook -- validate --recipe markets`
    - [ ] 3.4.5. Stage and commit findings: `gt modify --commit --message "validate: markets recipe changes"`

  - [ ] 3.5. Validate subscriptions recipe changes (critical - known deletions)
    - [ ] 3.5.1. Examine subscriptions recipe before PR #3169
    - [ ] 3.5.2. Compare with current subscriptions recipe implementation
    - [ ] 3.5.3. Document deleted code and functionality in `docs/validation/subscriptions-regressions.md`
    - [ ] 3.5.4. Run validation: `npm run cookbook -- validate --recipe subscriptions`
    - [ ] 3.5.5. Stage and commit findings: `gt modify --commit --message "validate: subscriptions recipe regressions"`

  - [ ] 3.6. Create summary of all pre-existing recipe changes in `docs/validation/existing-recipes-summary.md`

  - [ ] 3.7. **[PR BOUNDARY]** Submit PR 3 using `gt submit`

- [ ] 4. Convert Examples to Recipes (PRs 4-14)

  - [ ] 4.1. Convert b2b example to recipe (PR 4)
    - [ ] 4.1.1. Create new branch: `gt create convert-b2b-recipe`
    - [ ] 4.1.2. Create recipe configuration file for b2b
    - [ ] 4.1.3. Transform scaffolded b2b code into recipe format
    - [ ] 4.1.4. Fix any broken functionality from original example
    - [ ] 4.1.5. Validate recipe: `npm run cookbook -- validate --recipe b2b`
    - [ ] 4.1.6. Test applying recipe to fresh skeleton
    - [ ] 4.1.7. Commit: `gt modify --message "convert: b2b example to recipe"`
    - [ ] 4.1.8. Submit PR: `gt submit`

  - [ ] 4.2. Convert custom-cart-method example to recipe (PR 5)
    - [ ] 4.2.1. Create new branch: `gt create convert-custom-cart-method-recipe`
    - [ ] 4.2.2. Create recipe configuration file for custom-cart-method
    - [ ] 4.2.3. Transform scaffolded code into recipe format
    - [ ] 4.2.4. Fix any broken functionality
    - [ ] 4.2.5. Validate recipe: `npm run cookbook -- validate --recipe custom-cart-method`
    - [ ] 4.2.6. Test applying recipe to fresh skeleton
    - [ ] 4.2.7. Commit: `gt modify --message "convert: custom-cart-method example to recipe"`
    - [ ] 4.2.8. Submit PR: `gt submit`

  - [ ] 4.3. Convert express example to recipe (PR 6)
    - [ ] 4.3.1. Create new branch: `gt create convert-express-recipe`
    - [ ] 4.3.2. Create recipe configuration file for express
    - [ ] 4.3.3. Transform scaffolded code into recipe format
    - [ ] 4.3.4. Fix any broken functionality
    - [ ] 4.3.5. Validate recipe: `npm run cookbook -- validate --recipe express`
    - [ ] 4.3.6. Test applying recipe to fresh skeleton
    - [ ] 4.3.7. Commit: `gt modify --message "convert: express example to recipe"`
    - [ ] 4.3.8. Submit PR: `gt submit`

  - [ ] 4.4. Convert gtm example to recipe (PR 7)
    - [ ] 4.4.1. Create new branch: `gt create convert-gtm-recipe`
    - [ ] 4.4.2. Create recipe configuration file for gtm
    - [ ] 4.4.3. Transform scaffolded code into recipe format
    - [ ] 4.4.4. Fix any broken functionality
    - [ ] 4.4.5. Validate recipe: `npm run cookbook -- validate --recipe gtm`
    - [ ] 4.4.6. Test applying recipe to fresh skeleton
    - [ ] 4.4.7. Commit: `gt modify --message "convert: gtm example to recipe"`
    - [ ] 4.4.8. Submit PR: `gt submit`

  - [ ] 4.5. Convert infinite-scroll example to recipe (PR 8)
    - [ ] 4.5.1. Create new branch: `gt create convert-infinite-scroll-recipe`
    - [ ] 4.5.2. Create recipe configuration file for infinite-scroll
    - [ ] 4.5.3. Transform scaffolded code into recipe format
    - [ ] 4.5.4. Fix any broken functionality
    - [ ] 4.5.5. Validate recipe: `npm run cookbook -- validate --recipe infinite-scroll`
    - [ ] 4.5.6. Test applying recipe to fresh skeleton
    - [ ] 4.5.7. Commit: `gt modify --message "convert: infinite-scroll example to recipe"`
    - [ ] 4.5.8. Submit PR: `gt submit`

  - [ ] 4.6. Convert legacy-customer-account-flow example to recipe (PR 9)
    - [ ] 4.6.1. Create new branch: `gt create convert-legacy-customer-account-recipe`
    - [ ] 4.6.2. Create recipe configuration file for legacy-customer-account-flow
    - [ ] 4.6.3. Transform scaffolded code into recipe format
    - [ ] 4.6.4. Fix any broken functionality
    - [ ] 4.6.5. Validate recipe: `npm run cookbook -- validate --recipe legacy-customer-account-flow`
    - [ ] 4.6.6. Test applying recipe to fresh skeleton
    - [ ] 4.6.7. Commit: `gt modify --message "convert: legacy-customer-account-flow example to recipe"`
    - [ ] 4.6.8. Submit PR: `gt submit`

  - [ ] 4.7. Convert metaobjects example to recipe (PR 10)
    - [ ] 4.7.1. Create new branch: `gt create convert-metaobjects-recipe`
    - [ ] 4.7.2. Create recipe configuration file for metaobjects
    - [ ] 4.7.3. Transform scaffolded code into recipe format
    - [ ] 4.7.4. Fix any broken functionality
    - [ ] 4.7.5. Validate recipe: `npm run cookbook -- validate --recipe metaobjects`
    - [ ] 4.7.6. Test applying recipe to fresh skeleton
    - [ ] 4.7.7. Commit: `gt modify --message "convert: metaobjects example to recipe"`
    - [ ] 4.7.8. Submit PR: `gt submit`

  - [ ] 4.8. Convert multipass example to recipe (PR 11)
    - [ ] 4.8.1. Create new branch: `gt create convert-multipass-recipe`
    - [ ] 4.8.2. Create recipe configuration file for multipass
    - [ ] 4.8.3. Transform scaffolded code into recipe format
    - [ ] 4.8.4. Fix any broken functionality
    - [ ] 4.8.5. Validate recipe: `npm run cookbook -- validate --recipe multipass`
    - [ ] 4.8.6. Test applying recipe to fresh skeleton
    - [ ] 4.8.7. Commit: `gt modify --message "convert: multipass example to recipe"`
    - [ ] 4.8.8. Submit PR: `gt submit`

  - [ ] 4.9. Convert partytown example to recipe (PR 12)
    - [ ] 4.9.1. Create new branch: `gt create convert-partytown-recipe`
    - [ ] 4.9.2. Create recipe configuration file for partytown
    - [ ] 4.9.3. Transform scaffolded code into recipe format
    - [ ] 4.9.4. Fix any broken functionality
    - [ ] 4.9.5. Validate recipe: `npm run cookbook -- validate --recipe partytown`
    - [ ] 4.9.6. Test applying recipe to fresh skeleton
    - [ ] 4.9.7. Commit: `gt modify --message "convert: partytown example to recipe"`
    - [ ] 4.9.8. Submit PR: `gt submit`

  - [ ] 4.10. Convert subscriptions example to recipe (PR 13)
    - [ ] 4.10.1. Create new branch: `gt create convert-subscriptions-recipe`
    - [ ] 4.10.2. Create recipe configuration file for subscriptions
    - [ ] 4.10.3. Transform scaffolded code into recipe format
    - [ ] 4.10.4. Restore any deleted functionality identified in validation
    - [ ] 4.10.5. Validate recipe: `npm run cookbook -- validate --recipe subscriptions`
    - [ ] 4.10.6. Test applying recipe to fresh skeleton
    - [ ] 4.10.7. Commit: `gt modify --message "convert: subscriptions example to recipe"`
    - [ ] 4.10.8. Submit PR: `gt submit`

  - [ ] 4.11. Convert third-party-queries-caching example to recipe (PR 14)
    - [ ] 4.11.1. Create new branch: `gt create convert-third-party-api-recipe`
    - [ ] 4.11.2. Create recipe configuration file (note: may be renamed to third-party-api)
    - [ ] 4.11.3. Transform scaffolded code into recipe format
    - [ ] 4.11.4. Fix any broken functionality
    - [ ] 4.11.5. Validate recipe: `npm run cookbook -- validate --recipe third-party-api`
    - [ ] 4.11.6. Test applying recipe to fresh skeleton
    - [ ] 4.11.7. Commit: `gt modify --message "convert: third-party-queries-caching to recipe"`
    - [ ] 4.11.8. Submit PR: `gt submit`

  - [ ] 4.12. **[PR BOUNDARY]** Submit entire stack using `gt submit --stack`

- [ ] 5. Generate Regression Report and Documentation (PR 15)

  - [ ] 5.1. Create new branch: `gt create regression-report`

  - [ ] 5.2. Compare rebuilt work with original PR #3169
    - [ ] 5.2.1. Use git diff to compare final state with PR #3169 state
    - [ ] 5.2.2. Identify all functional differences
    - [ ] 5.2.3. Document code that was deleted unintentionally

  - [ ] 5.3. Create regression report structure at `docs/regression-report.md`
    - [ ] 5.3.1. Write Executive Summary section
    - [ ] 5.3.2. Document Skeleton Template Regressions section
    - [ ] 5.3.3. Document Pre-existing Recipe Changes section
    - [ ] 5.3.4. Document Example Conversion Issues section
    - [ ] 5.3.5. Document Missing Functionality section
    - [ ] 5.3.6. Write Recommendations section
    - [ ] 5.3.7. Document Validation Results section

  - [ ] 5.4. Include detailed findings for each recipe
    - [ ] 5.4.1. List all deleted code snippets with file paths
    - [ ] 5.4.2. Identify broken functionality by recipe
    - [ ] 5.4.3. Document any naming changes or restructuring

  - [ ] 5.5. Generate summary statistics
    - [ ] 5.5.1. Count total lines of code deleted
    - [ ] 5.5.2. Count number of files affected
    - [ ] 5.5.3. List all broken features identified

  - [ ] 5.6. Create recommendations for fixing identified issues
    - [ ] 5.6.1. Prioritize critical fixes (e.g., subscriptions recipe)
    - [ ] 5.6.2. Suggest process improvements to prevent future regressions
    - [ ] 5.6.3. Recommend testing strategies for recipes

  - [ ] 5.7. Stage and commit report: `gt modify --message "docs: comprehensive regression report for PR #3169"`

  - [ ] 5.8. **[PR BOUNDARY]** Submit final PR using `gt submit`

  - [ ] 5.9. Verify entire validation effort is complete by reviewing all PRs in stack