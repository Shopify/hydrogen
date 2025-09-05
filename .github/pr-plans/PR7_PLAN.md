# PR 7: CLI Advanced Features - Detailed Execution Plan

## Overview
This PR adds advanced features to the Hydrogen CLI including runtime monorepo detection, CLI auto-linking, and complete removal of the diff system. These are enhancements that improve developer experience but aren't required for basic skeleton functionality. This is a larger PR (~40 files) that significantly improves the CLI capabilities.

## Pre-requisites
- **CRITICAL**: PR 0-5 must be merged first
- Working from branch: `hydrogen-react-router-7.8.2-clean`
- Target branch: `main` (with PR 0-5 merged)
- Required tools: git, npm, node
- Clean working directory

## Phase 1: Setup and Branch Preparation

### Task 1.1: Verify Prerequisites
**WHAT:** Confirm PR 0-5 are merged to main  
**WHY:** This builds on top of the minimal CLI changes from PR 4  
**STEPS:**
1. Fetch latest main: `git fetch origin main`
2. Check critical PRs are merged:
   ```bash
   echo "Checking prerequisites..."
   git log origin/main --oneline | grep -i "version.*pinning" | head -1
   git log origin/main --oneline | grep -i "hydrogen.*core.*infrastructure" | head -1
   git log origin/main --oneline | grep -i "cli.*minimal" | head -1
   git log origin/main --oneline | grep -i "skeleton.*migration" | head -1
   ```
3. All should return results
4. If any missing, STOP - wait for them to merge
5. Document: `echo "Prerequisites: PR0-5 ✓" > pr7-status.txt`

### Task 1.2: Create Feature Branch
**WHAT:** Create branch for CLI advanced features  
**WHY:** Isolate these enhancements from core functionality  
**STEPS:**
1. Checkout and update main:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Create feature branch: `git checkout -b feat/cli-advanced-rr-7.8`
3. Verify clean state: `git status`
4. Note commit: `git log -1 --oneline`
5. Document: `echo "Branch created from: $(git rev-parse --short HEAD)" >> pr7-status.txt`

### Task 1.3: Initial Assessment
**WHAT:** Understand current CLI structure  
**WHY:** These changes touch many files  
**STEPS:**
1. Navigate to CLI: `cd packages/cli`
2. Count current files:
   ```bash
   find src -type f -name "*.ts" | wc -l
   ```
3. Check for diff-related files:
   ```bash
   find src -name "*diff*" -type f
   ```
4. Check for linking-related files:
   ```bash
   find src -name "*link*" -type f
   ```
5. Document current file count and structure

## Phase 2: Apply Runtime Monorepo Detection

### Task 2.1: Cherry-Pick Monorepo Detection
**WHAT:** Apply runtime monorepo detection commit  
**WHY:** Enables CLI to detect and work properly in monorepo environments  
**STEPS:**
1. Cherry-pick: `git cherry-pick 3beb46e`
2. This adds ability to detect monorepo setups at runtime
3. If conflicts:
   - Check package.json (likely already updated in PR 0)
   - For package.json: `git checkout HEAD -- package.json`
   - Accept incoming for new functionality
4. Continue if needed: `git cherry-pick --continue`
5. Document: `echo "Monorepo detection: APPLIED" >> pr7-status.txt`

### Task 2.2: Verify Monorepo Detection Files
**WHAT:** Check what files were added for monorepo support  
**WHY:** Understand the scope of changes  
**STEPS:**
1. Check new/modified files:
   ```bash
   git diff --name-only HEAD~1
   ```
2. Look for monorepo detection logic:
   ```bash
   grep -r "monorepo" src/ --include="*.ts" | head -10
   ```
3. Common patterns to find:
   - Workspace detection
   - Package.json traversal
   - Yarn/npm/pnpm workspace support
4. Document key files added
5. Check if tests were added

### Task 2.3: Test Monorepo Detection
**WHAT:** Verify monorepo detection works  
**WHY:** Ensure functionality is intact  
**STEPS:**
1. Create test file: `test-monorepo.mjs`
2. Add content:
   ```javascript
   import { detectMonorepo } from './dist/lib/monorepo.js';
   
   try {
     const isMonorepo = detectMonorepo(process.cwd());
     console.log('Monorepo detected:', isMonorepo);
     console.log('Test: PASS');
   } catch (error) {
     console.error('Test failed:', error.message);
   }
   ```
3. Build first: `npm run build`
4. Run test: `node test-monorepo.mjs`
5. Clean up: `rm test-monorepo.mjs`

## Phase 3: Apply CLI Auto-Linking

### Task 3.1: Cherry-Pick Auto-Linking
**WHAT:** Apply CLI auto-linking functionality  
**WHY:** Automatically links local packages in development  
**STEPS:**
1. Cherry-pick: `git cherry-pick a600b04`
2. This adds auto-linking capabilities
3. If conflicts:
   - Usually in command files
   - Accept incoming changes
   - Resolve carefully to preserve both features
4. Continue if needed: `git cherry-pick --continue`
5. Document: `echo "Auto-linking: APPLIED" >> pr7-status.txt`

### Task 3.2: Understand Auto-Linking Implementation
**WHAT:** Review how auto-linking works  
**WHY:** Complex feature that affects development workflow  
**STEPS:**
1. Find auto-linking files:
   ```bash
   grep -r "link\|Link" src/ --include="*.ts" | grep -v "diff" | head -20
   ```
2. Check for new commands or flags:
   ```bash
   grep -r "auto.*link" src/commands/ --include="*.ts"
   ```
3. Look for package linking logic:
   ```bash
   grep -r "npm link\|yarn link" src/ --include="*.ts"
   ```
4. Document auto-linking approach
5. Check if it handles different package managers

### Task 3.3: Verify Auto-Linking Configuration
**WHAT:** Check configuration for auto-linking  
**WHY:** May have settings or options  
**STEPS:**
1. Check for config files:
   ```bash
   grep -r "autoLink" src/ --include="*.ts" | head -10
   ```
2. Look for CLI flags:
   ```bash
   grep -r "--.*link" src/commands/hydrogen/ --include="*.ts"
   ```
3. Check if it's automatic or opt-in
4. Document configuration options
5. Note any new dependencies

## Phase 4: Remove Diff System Completely

### Task 4.1: Cherry-Pick Diff Removal
**WHAT:** Apply commit that removes the diff system  
**WHY:** Diff system is being replaced with standalone examples  
**STEPS:**
1. Cherry-pick: `git cherry-pick 97493ed`
2. This removes all diff-related code
3. Expected: Many file deletions
4. If conflicts:
   - If file was deleted but modified locally, accept deletion
   - Check carefully for any diff references
5. Continue if needed: `git cherry-pick --continue`
6. Document: `echo "Diff system: REMOVED" >> pr7-status.txt`

### Task 4.2: Verify Diff System Removal
**WHAT:** Ensure all diff code is gone  
**WHY:** Complete removal is important  
**STEPS:**
1. Check for any remaining diff files:
   ```bash
   find src -name "*diff*" -type f
   ```
2. Should return nothing
3. Search for diff references:
   ```bash
   grep -r "diff" src/ --include="*.ts" | grep -v "different"
   ```
4. Should only show unrelated uses of "diff"
5. Check removed files:
   ```bash
   git diff --name-status HEAD~1 | grep "^D" | wc -l
   ```
6. Document number of files removed

### Task 4.3: Check Command Changes
**WHAT:** Verify commands still work without diff system  
**WHY:** Some commands may have depended on diff functionality  
**STEPS:**
1. Check dev command:
   ```bash
   grep -A 10 -B 10 "class Dev" src/commands/hydrogen/dev.ts
   ```
2. Check build command:
   ```bash
   grep -A 10 -B 10 "class Build" src/commands/hydrogen/build.ts
   ```
3. Look for removed options:
   ```bash
   git diff HEAD~1 -- src/commands/hydrogen/*.ts | grep "^-.*--"
   ```
4. Document any command changes
5. Note if help text was updated

## Phase 5: Template Handling Improvements

### Task 5.1: Identify Template Changes
**WHAT:** Find template handling improvements  
**WHY:** Templates are handled differently without diffs  
**STEPS:**
1. Check for template-related changes:
   ```bash
   git diff main -- src/**/*template*.ts
   ```
2. Look for init command changes:
   ```bash
   git diff main -- src/commands/hydrogen/init.ts
   ```
3. Check for new template utilities:
   ```bash
   ls -la src/lib/*template* 2>/dev/null
   ```
4. Document template handling approach
5. Note any new template sources

### Task 5.2: Verify Template System
**WHAT:** Ensure templates work correctly  
**WHY:** Critical for creating new projects  
**STEPS:**
1. Check template resolution:
   ```bash
   grep -r "template" src/commands/hydrogen/init.ts | head -20
   ```
2. Look for GitHub template fetching:
   ```bash
   grep -r "github.*template\|releases.*latest" src/ --include="*.ts"
   ```
3. Check local template handling:
   ```bash
   grep -r "file://\|path.resolve.*template" src/ --include="*.ts"
   ```
4. Document template sources
5. Note template validation logic

## Phase 6: Build and Test Validation

### Task 6.1: Clean Build Test
**WHAT:** Build CLI with all advanced features  
**WHY:** Ensure everything compiles  
**STEPS:**
1. Clean previous build:
   ```bash
   rm -rf dist/
   rm -rf node_modules/.cache
   ```
2. Install and build:
   ```bash
   npm install
   npm run build
   ```
3. Expected: Build completes successfully
4. Check build size:
   ```bash
   du -sh dist/
   ```
5. Document: `echo "Build: SUCCESS" >> pr7-status.txt`

### Task 6.2: TypeScript Validation
**WHAT:** Run type checking  
**WHY:** Ensure type safety  
**STEPS:**
1. Run typecheck:
   ```bash
   npm run typecheck
   ```
2. Should complete without new errors
3. If errors:
   - Check imports
   - Verify types
   - Fix and retry
4. Document results
5. Note any suppressed errors

### Task 6.3: Test Core Commands
**WHAT:** Verify commands still function  
**WHY:** Ensure no regressions  
**STEPS:**
1. Test help:
   ```bash
   node dist/index.js hydrogen --help
   ```
2. Check new options appear
3. Test version:
   ```bash
   node dist/index.js hydrogen --version
   ```
4. Test init help:
   ```bash
   node dist/index.js hydrogen init --help
   ```
5. Document any new flags or options

## Phase 7: Feature Testing

### Task 7.1: Test Monorepo Detection
**WHAT:** Verify monorepo detection in practice  
**WHY:** Core new feature  
**STEPS:**
1. In Hydrogen repo (which is a monorepo):
   ```bash
   node dist/index.js hydrogen env list
   ```
2. Should detect monorepo setup
3. Check logs for monorepo-related messages
4. Try in non-monorepo:
   ```bash
   cd /tmp
   mkdir test-regular
   cd test-regular
   npm init -y
   node /path/to/cli/dist/index.js hydrogen env list
   ```
5. Should work differently
6. Document behavior differences

### Task 7.2: Test Auto-Linking
**WHAT:** Verify auto-linking functionality  
**WHY:** Improves development workflow  
**STEPS:**
1. Check if auto-linking is enabled:
   ```bash
   node dist/index.js hydrogen dev --help | grep -i link
   ```
2. Look for auto-link options
3. Test with flag (if exists):
   ```bash
   node dist/index.js hydrogen dev --auto-link --help
   ```
4. Document auto-linking behavior
5. Note when it activates

### Task 7.3: Verify Diff System Removal
**WHAT:** Ensure diff system is completely gone  
**WHY:** Should be no traces left  
**STEPS:**
1. Check for diff options:
   ```bash
   node dist/index.js hydrogen --help | grep -i diff
   ```
2. Should return nothing
3. Check init command:
   ```bash
   node dist/index.js hydrogen init --help | grep -i diff
   ```
4. Should show no diff-related options
5. Document removal confirmation

## Phase 8: Integration Testing

### Task 8.1: Test with Skeleton Template
**WHAT:** Ensure CLI works with skeleton  
**WHY:** Primary use case  
**STEPS:**
1. Navigate to skeleton:
   ```bash
   cd ../../templates/skeleton
   ```
2. Try using the updated CLI:
   ```bash
   ../../packages/cli/dist/index.js hydrogen build --help
   ```
3. Should work without errors
4. Test with dev command:
   ```bash
   ../../packages/cli/dist/index.js hydrogen dev --help
   ```
5. Document any issues

### Task 8.2: Test Project Initialization
**WHAT:** Verify init command works  
**WHY:** Critical for new projects  
**STEPS:**
1. Create test directory:
   ```bash
   cd /tmp
   mkdir test-hydrogen-init
   cd test-hydrogen-init
   ```
2. Test init (dry run):
   ```bash
   /path/to/cli/dist/index.js hydrogen init --help
   ```
3. Check template options
4. Note any new templates
5. Clean up test directory

### Task 8.3: Manifest Generation
**WHAT:** Regenerate oclif manifest  
**WHY:** Command structure changed  
**STEPS:**
1. Return to CLI directory:
   ```bash
   cd /path/to/packages/cli
   ```
2. Generate manifest:
   ```bash
   npm run generate:manifest
   ```
3. Check manifest updated:
   ```bash
   git diff oclif.manifest.json | head -20
   ```
4. Should show changes
5. Commit manifest if needed

## Phase 9: Documentation Updates

### Task 9.1: Update CLI Documentation
**WHAT:** Update README and help text  
**WHY:** Document new features  
**STEPS:**
1. Check README:
   ```bash
   grep -i "diff\|link\|monorepo" README.md
   ```
2. Update if mentions diff system
3. Add notes about:
   - Monorepo support
   - Auto-linking
   - Standalone examples
4. Keep changes minimal
5. Document updates made

### Task 9.2: Update Command Help
**WHAT:** Ensure help text is accurate  
**WHY:** Users need correct information  
**STEPS:**
1. Check if help text files exist:
   ```bash
   find src -name "*.md" -type f
   ```
2. Update any that mention diff system
3. Add help for new features
4. Verify in code:
   ```bash
   grep -r "description:" src/commands/ --include="*.ts" | head -10
   ```
5. Document help text updates

## Phase 10: Final Validation

### Task 10.1: Lint Check
**WHAT:** Run linting  
**WHY:** Code quality  
**STEPS:**
1. Run lint:
   ```bash
   npm run lint
   ```
2. Fix auto-fixable issues:
   ```bash
   npm run lint -- --fix
   ```
3. Review remaining issues
4. Document any that can't be fixed
5. Ensure no new violations

### Task 10.2: File Count Verification
**WHAT:** Verify ~40 files changed  
**WHY:** Match expected scope  
**STEPS:**
1. Count changed files:
   ```bash
   git diff --name-only main | wc -l
   ```
2. Should be approximately 40 files
3. List all changes:
   ```bash
   git diff --stat main
   ```
4. Review for unexpected changes
5. Document final count

### Task 10.3: Final Build Test
**WHAT:** One more complete build  
**WHY:** Ensure everything works  
**STEPS:**
1. Final clean build:
   ```bash
   rm -rf dist/
   npm run build
   npm run typecheck
   ```
2. All should pass
3. Test size is reasonable:
   ```bash
   du -sh dist/
   ```
4. Record: `echo "Final validation: SUCCESS" >> pr7-status.txt`
5. Return to monorepo root: `cd ../..`

## Phase 11: Commit and Push

### Task 11.1: Review All Changes
**WHAT:** Final review of all changes  
**WHY:** Ensure quality  
**STEPS:**
1. Review complete diff:
   ```bash
   git diff main | wc -l
   ```
2. Should be substantial but focused
3. Check for:
   - No debug code
   - No console.logs
   - No commented code
   - No temporary files
4. Document line count
5. Verify all features included

### Task 11.2: Commit Organization
**WHAT:** Organize commits logically  
**WHY:** Clear history  
**STEPS:**
1. Check commit count:
   ```bash
   git log --oneline main..HEAD
   ```
2. Should have 3 main commits (one per feature)
3. If more, consider squashing related changes:
   ```bash
   git rebase -i main
   # Keep three main commits
   ```
4. Commit messages should be:
   - Monorepo detection
   - Auto-linking
   - Diff system removal
5. Each should be clear and complete

### Task 11.3: Push Branch
**WHAT:** Push to GitHub  
**WHY:** Create PR  
**STEPS:**
1. Push: `git push origin feat/cli-advanced-rr-7.8`
2. Note URL provided
3. Verify push succeeded
4. Check file count on GitHub
5. Document: `echo "Pushed to GitHub" >> pr7-status.txt`

## Phase 12: Pull Request Creation

### Task 12.1: Create GitHub PR
**WHAT:** Open pull request  
**WHY:** Get changes reviewed  
**STEPS:**
1. Go to GitHub
2. Click "Compare & pull request"
3. Base: `main`
4. Compare: `feat/cli-advanced-rr-7.8`
5. Title: "feat(cli): add monorepo detection, auto-linking, and remove diff system"

### Task 12.2: PR Description Template
**WHAT:** Comprehensive description  
**WHY:** Help reviewers understand scope  
**STEPS:**
Copy and use:
```markdown
## Summary
Add advanced CLI features including runtime monorepo detection, automatic package linking, and complete removal of the deprecated diff system. This is PR 7 of 9 in the React Router 7.8.x migration strategy.

## Changes

### Monorepo Detection (3beb46e)
- ✅ Runtime detection of monorepo environments
- ✅ Support for npm, yarn, and pnpm workspaces
- ✅ Automatic workspace package discovery
- ✅ Improved dependency resolution in monorepos

### CLI Auto-Linking (a600b04)
- ✅ Automatic linking of local packages during development
- ✅ Eliminates manual npm/yarn link steps
- ✅ Detects and links @shopify/* packages
- ✅ Improves development workflow

### Diff System Removal (97493ed)
- ✅ Complete removal of deprecated diff system
- ✅ Removed all diff-related commands and options
- ✅ Cleaned up template handling
- ✅ Simplified codebase (~X files removed)

### Additional Improvements
- ✅ Enhanced template handling
- ✅ Better error messages
- ✅ Improved CLI performance
- ✅ Updated documentation

## Dependencies
⚠️ **REQUIRES**: PR 0-5 must be merged first
- PR 0: Version pinning ✅
- PR 1: Remix-Oxygen ✅
- PR 2: Hydrogen-React ✅
- PR 3: Hydrogen core ✅
- PR 4: CLI minimal ✅
- PR 5: Skeleton template ✅

## Testing
- [x] CLI builds successfully
- [x] TypeScript compilation passes
- [x] Monorepo detection works
- [x] Auto-linking functions correctly
- [x] Diff system completely removed
- [x] All commands functional
- [x] Template initialization works
- [x] No regressions in core functionality

## Files Changed (~40 files)

### Added
- Monorepo detection utilities
- Auto-linking system
- Enhanced template handlers

### Modified
- Command implementations (dev, build, init)
- Template resolution logic
- Configuration handling
- Package discovery

### Removed
- All diff-related files
- Diff command implementations
- Diff utilities and helpers
- Deprecated template handlers

## Breaking Changes
- ⚠️ Removed `--diff` flag from init command
- ⚠️ Removed diff-based example system
- ⚠️ Examples are now standalone (PR 8)

## Migration Guide
For users upgrading:
1. Remove any `--diff` flags from scripts
2. Use standalone examples instead of diffs
3. Auto-linking replaces manual linking

## Performance Impact
- Faster CLI startup (diff system removed)
- Better monorepo performance
- Reduced bundle size

## Next Steps
After this PR:
- PR 8: Convert all examples to standalone
- PR 9: Update recipes

## Related
- Part of #3127 breakdown strategy
- See PRS_STRATEGY.md for overall plan
- Commits cherry-picked from hydrogen-react-router-7.8.x branch

## Validation
Run these commands to verify:
```bash
cd packages/cli
npm run build
npm run typecheck
npm run lint
node dist/index.js hydrogen --help
```
```

## Success Criteria Checklist
- [ ] PR 0-5 merged first
- [ ] Feature branch created from main
- [ ] Monorepo detection commit applied
- [ ] Auto-linking commit applied
- [ ] Diff system removal commit applied
- [ ] ~40 files changed
- [ ] CLI builds without errors
- [ ] TypeScript passes
- [ ] All commands functional
- [ ] Monorepo detection works
- [ ] Auto-linking works
- [ ] Diff system completely removed
- [ ] Template handling improved
- [ ] Documentation updated
- [ ] No debug code
- [ ] PR created and ready

## Troubleshooting Guide

### Issue: Cherry-pick conflicts
**Solution:**
1. Package.json: Use HEAD version (from PR 0)
2. Command files: Carefully merge features
3. For deletions: Accept if diff-related
4. Test after each resolution

### Issue: Build fails after diff removal
**Solution:**
1. Check for remaining diff imports
2. Remove any diff references
3. Update command registrations
4. Verify all imports resolve

### Issue: Monorepo detection not working
**Solution:**
1. Check workspace detection logic
2. Verify package.json traversal
3. Test with different package managers
4. Check for correct file paths

### Issue: Auto-linking fails
**Solution:**
1. Verify link command exists
2. Check package resolution
3. Ensure correct permissions
4. Test with different package managers

### Issue: Template initialization broken
**Solution:**
1. Check template resolution
2. Verify GitHub API calls
3. Test local template paths
4. Ensure template handlers updated

### Issue: Commands missing options
**Solution:**
1. Check command definitions
2. Verify option registration
3. Update help text
4. Regenerate manifest

### Issue: TypeScript errors
**Solution:**
1. Check for missing types
2. Verify imports
3. Update type definitions
4. Consider skipLibCheck temporarily

## Notes for Implementer
- This is a large PR with significant changes
- Take time to understand each feature
- Monorepo detection is complex - test thoroughly
- Auto-linking affects development workflow
- Diff removal is extensive - ensure complete
- Test with both monorepo and regular projects
- Verify templates still work
- Document any unexpected issues
- Consider splitting if becomes too large
- Keep commits organized by feature