# PR 4: CLI Core Updates (Minimal) - Detailed Execution Plan

## Overview
This PR implements the minimal CLI changes required for the skeleton template to work with React Router 7.8.x. We're keeping this PR minimal - only essential changes needed for skeleton compatibility. Advanced CLI features like diff removal will come in PR 7.

## Pre-requisites
- Working from branch: `hydrogen-react-router-7.8.2-clean`
- Target branch: `main`
- Required tools: git, npm, node
- PR 0, 1, 2, 3 should ideally be merged (but not strictly required)
- Clean working directory

## Phase 1: Setup and Branch Preparation

### Task 1.1: Create Feature Branch
**WHAT:** Create a clean feature branch for PR 4 CLI changes  
**WHY:** Isolate minimal CLI changes for focused review  
**STEPS:**
1. Ensure you're on main branch: `git checkout main`
2. Pull latest changes: `git pull origin main`
3. Create feature branch: `git checkout -b feat/cli-minimal-rr-7.8`
4. Verify clean state: `git status` (should show no changes)
5. Note current commit: `git log -1 --oneline` (record for reference)

### Task 1.2: Initial CLI Package Build Verification
**WHAT:** Verify CLI package builds on main  
**WHY:** Establish baseline and identify any existing issues  
**STEPS:**
1. Navigate to package: `cd packages/cli`
2. Install dependencies: `npm install`
3. Run build: `npm run build`
4. Check for existing issues: `npm run typecheck 2>&1 | tee baseline-typecheck.log`
5. Document results: `echo "Baseline build: SUCCESS" > build-status.txt`
6. Note: CLI may have existing warnings - document them

### Task 1.3: Understand CLI Structure
**WHAT:** Familiarize with key CLI files we'll modify  
**WHY:** Ensure we only change what's necessary  
**STEPS:**
1. List version check file: `ls -la src/lib/react-router-version-check.ts 2>/dev/null || ls -la src/lib/remix-version-check.ts`
2. Check remix config: `ls -la src/lib/remix-config.ts`
3. Check build config: `ls -la tsup.config.ts`
4. Review package.json structure: `head -30 package.json`
5. Note which files exist for later reference

## Phase 2: Apply Version Consistency Check Updates

### Task 2.1: Cherry-pick Version Consistency Commit
**WHAT:** Apply React Router version consistency checks  
**WHY:** CLI needs to validate correct React Router versions are installed  
**STEPS:**
1. Cherry-pick commit: `git cherry-pick 543e93a8eb62127582d2f9c2086cdd58c2b20ad6`
2. Expected changes:
   - New or modified version check file
   - Possibly updates to dev/build/preview commands
   - Pre-commit validation script references
3. If conflicts occur:
   - In version check files: Accept incoming changes
   - In command files: Keep incoming version check calls
   - Mark resolved: `git add <conflicted-files>`
   - Continue: `git cherry-pick --continue`

### Task 2.2: Verify Version Check Implementation
**WHAT:** Ensure version check correctly expects 7.8.2  
**WHY:** This prevents runtime errors from version mismatches  
**STEPS:**
1. Open the version check file:
   ```bash
   cat src/lib/react-router-version-check.ts | grep -A 5 -B 5 "7.8"
   ```
2. Should see checks for exact version "7.8.2"
3. Look for warning messages about version mismatches
4. Check if it handles tilde/caret ranges
5. Document the validation logic in build-status.txt

### Task 2.3: Check Where Version Check is Called
**WHAT:** Understand which commands use version checking  
**WHY:** Ensure it's integrated into the right commands  
**STEPS:**
1. Search for usage:
   ```bash
   grep -r "react-router-version-check" src/ --include="*.ts" | grep -v ".test.ts"
   ```
2. Should be called from:
   - `src/commands/hydrogen/dev.ts`
   - Possibly build and preview commands
3. If not integrated, may need manual addition
4. Document which commands have version checking

## Phase 3: Apply Version Pinning Updates

### Task 3.1: Cherry-pick Version Pinning Commit (Partial)
**WHAT:** Apply only CLI-related changes from the version pinning commit  
**WHY:** We need exact 7.8.2 versions in CLI package.json  
**STEPS:**
1. Cherry-pick without committing:
   ```bash
   git cherry-pick -n 411bb363f54cafc2823999e92e94ace96985653b
   ```
2. Reset to unstage all:
   ```bash
   git reset HEAD
   ```
3. Add only CLI changes:
   ```bash
   git add packages/cli/package.json
   git add packages/cli/src/lib/react-router-version-check.ts
   git add packages/cli/src/lib/remix-config.ts
   git add packages/cli/tsup.config.ts
   ```
4. Check what's staged: `git diff --cached --stat`
5. Commit with message:
   ```bash
   git commit -m "fix(cli): pin React Router to exact 7.8.2 version"
   ```

### Task 3.2: Verify Package.json Changes
**WHAT:** Ensure React Router versions are exactly 7.8.2  
**WHY:** Version ranges cause runtime errors  
**STEPS:**
1. Check dependencies:
   ```bash
   cat package.json | grep -E '"@?react-router'
   ```
2. Should see:
   - `"@react-router/dev": "7.8.2"` (exact, no ~ or ^)
   - Any other React Router packages at 7.8.2
3. Check peer dependencies if present
4. If ranges found (~/^), edit manually to remove them
5. Save changes if any edits made

## Phase 4: Update Remix Config

### Task 4.1: Review Remix Config Changes
**WHAT:** Check what changes were made to remix-config.ts  
**WHY:** This file handles build configuration that affects React Router  
**STEPS:**
1. View the changes:
   ```bash
   git diff main -- src/lib/remix-config.ts
   ```
2. Look for:
   - Removal of legacy Remix code
   - Updates for React Router 7.8.x
   - Changes to build directory detection
3. Key changes should be removing Remix-specific logic
4. Document what functionality was removed/changed

### Task 4.2: Verify Config Still Works
**WHAT:** Ensure the config changes don't break existing functionality  
**WHY:** CLI must still be able to read project configuration  
**STEPS:**
1. Create a test to load config:
   ```bash
   cat > test-config.mjs << 'EOF'
   import { getRemixConfig } from './dist/lib/remix-config.js';
   
   try {
     // Test with mock project path
     const config = await getRemixConfig('.');
     console.log('Config loaded successfully');
     console.log('Build directory:', config.buildDirectory);
   } catch (error) {
     console.error('Config failed:', error.message);
   }
   EOF
   ```
2. Build first: `npm run build`
3. Run test: `node test-config.mjs`
4. Should either load or fail gracefully
5. Clean up: `rm test-config.mjs`

## Phase 5: Update Build Configuration

### Task 5.1: Review tsup.config.ts Changes
**WHAT:** Check build configuration updates  
**WHY:** Build config affects how CLI is compiled and bundled  
**STEPS:**
1. View changes:
   ```bash
   git diff main -- tsup.config.ts
   ```
2. Look for:
   - Entry point changes
   - DTS (TypeScript definitions) configuration
   - External dependencies updates
3. Key changes might include:
   - Disabling DTS to prevent memory issues
   - Optimizing for React Router 7.8.x
4. Document changes in build-status.txt

### Task 5.2: Verify Build Configuration
**WHAT:** Ensure build config produces working CLI  
**WHY:** CLI must build correctly to be usable  
**STEPS:**
1. Clean previous build: `rm -rf dist/`
2. Run build: `npm run build`
3. Check output structure:
   ```bash
   ls -la dist/ | head -10
   ls -la dist/commands/hydrogen/ | head -5
   ```
4. Verify key files exist:
   - `dist/index.js`
   - `dist/commands/hydrogen/dev.js`
   - `dist/lib/react-router-version-check.js`
5. Check file sizes are reasonable (not empty)

## Phase 6: Build and Test Validation

### Task 6.1: Full Build Test
**WHAT:** Perform complete build and check for issues  
**WHY:** Ensure all changes compile correctly  
**STEPS:**
1. Clean everything:
   ```bash
   rm -rf dist/
   rm -rf node_modules/.cache
   ```
2. Install and build:
   ```bash
   npm install
   npm run build
   ```
3. Expected: Build completes without errors
4. If errors occur:
   - Check error message
   - Usually import/export issues
   - Fix and retry
5. Document build time and any warnings

### Task 6.2: Run Type Checking
**WHAT:** Verify TypeScript compilation  
**WHY:** Ensure type safety is maintained  
**STEPS:**
1. Run typecheck: `npm run typecheck`
2. Compare with baseline:
   ```bash
   npm run typecheck 2>&1 | tee current-typecheck.log
   diff baseline-typecheck.log current-typecheck.log || true
   ```
3. New errors are NOT acceptable
4. If new errors:
   - Check which files cause them
   - Usually missing types or wrong imports
   - Fix and retry
5. Document results

### Task 6.3: Test Version Check Functionality
**WHAT:** Verify version checking works correctly  
**WHY:** This is the main feature we're adding  
**STEPS:**
1. Create test file: `test-version-check.mjs`
2. Add content:
   ```javascript
   import { checkReactRouterVersion } from './dist/lib/react-router-version-check.js';
   
   // Mock a package.json with wrong version
   const mockPackageJson = {
     dependencies: {
       'react-router': '~7.8.1',  // Wrong! Has tilde
       '@react-router/dev': '7.8.0'  // Wrong! Old version
     }
   };
   
   // This should detect issues
   try {
     const issues = checkReactRouterVersion(mockPackageJson);
     console.log('Version check found issues:', issues);
   } catch (error) {
     console.log('Version check result:', error.message);
   }
   ```
3. Run test: `node test-version-check.mjs`
4. Should identify version issues
5. Clean up: `rm test-version-check.mjs`

## Phase 7: Integration Testing

### Task 7.1: Test CLI Commands Still Work
**WHAT:** Verify core CLI commands function  
**WHY:** Ensure we haven't broken existing functionality  
**STEPS:**
1. Test help command:
   ```bash
   node dist/index.js hydrogen --help
   ```
2. Should display help without errors
3. Test version command:
   ```bash
   node dist/index.js hydrogen --version
   ```
4. Should show version
5. Document any issues

### Task 7.2: Test Dev Command Integration
**WHAT:** Verify dev command includes version checking  
**WHY:** This is where version check is most important  
**STEPS:**
1. Check dev command has version check:
   ```bash
   grep -A 10 "react-router-version" dist/commands/hydrogen/dev.js
   ```
2. Should see version check being called
3. If possible, test with mock project:
   ```bash
   # This will fail but should show version check running
   node dist/index.js hydrogen dev --help
   ```
4. Look for version-related options or messages
5. Document behavior

### Task 7.3: Verify Manifest Generation
**WHAT:** Ensure oclif manifest is correct  
**WHY:** CLI framework needs proper manifest  
**STEPS:**
1. Check if manifest exists: `ls -la oclif.manifest.json`
2. If generation needed:
   ```bash
   npm run generate:manifest 2>/dev/null || echo "No manifest script"
   ```
3. Check manifest has commands:
   ```bash
   cat oclif.manifest.json | grep -c '"hydrogen:' || echo "Check manifest structure"
   ```
4. Should have multiple hydrogen commands
5. Document any manifest issues

## Phase 8: Final Validation

### Task 8.1: Lint Check
**WHAT:** Run linting on CLI package  
**WHY:** Maintain code quality  
**STEPS:**
1. Run lint: `npm run lint`
2. If errors:
   - Try auto-fix: `npm run lint -- --fix`
   - Review remaining issues
   - Fix critical ones manually
3. ESLint warnings are acceptable if pre-existing
4. Document any new warnings

### Task 8.2: Check File Count
**WHAT:** Ensure we only modified minimal files  
**WHY:** This PR should be minimal changes only  
**STEPS:**
1. Count modified files:
   ```bash
   git diff --stat main | tail -1
   ```
2. Should be ~10 files or fewer
3. List files:
   ```bash
   git diff --name-only main
   ```
4. All should be in packages/cli/
5. If too many files, review what can be deferred

### Task 8.3: Final Build Verification
**WHAT:** One last build to confirm everything works  
**WHY:** Ensure PR is ready for review  
**STEPS:**
1. Final clean build:
   ```bash
   rm -rf dist/
   npm run build
   npm run typecheck
   ```
2. All should pass
3. Record: `echo "Final build: SUCCESS" >> build-status.txt`
4. Size check: `du -sh dist/`
5. Should be reasonable size (not bloated)

## Phase 9: Commit and Push

### Task 9.1: Review All Changes
**WHAT:** Careful review before final commit  
**WHY:** Ensure only minimal necessary changes  
**STEPS:**
1. Review all changes:
   ```bash
   git diff main --stat
   ```
2. For each file, ask: "Is this essential for skeleton?"
3. If not essential, consider removing:
   ```bash
   git checkout main -- <non-essential-file>
   ```
4. Final diff review: `git diff main`
5. Should be focused, minimal changes

### Task 9.2: Create Final Commit
**WHAT:** Clean commit history  
**WHY:** Easy review and future reference  
**STEPS:**
1. If multiple commits, squash:
   ```bash
   git rebase -i main
   # Mark all but first as 'squash'
   ```
2. Write commit message:
   ```
   fix(cli): minimal React Router 7.8.2 compatibility updates

   - Add React Router version consistency checking
   - Pin React Router to exact 7.8.2 version
   - Remove legacy Remix configuration code
   - Update build configuration for React Router 7.8.x
   
   This provides the minimal CLI changes needed for skeleton
   template compatibility. Advanced features (diff removal,
   auto-linking) will come in PR 7.
   
   Part of React Router 7.8.x migration (PR 4 of 9)
   ```

### Task 9.3: Push Branch
**WHAT:** Push to GitHub  
**WHY:** Required for PR creation  
**STEPS:**
1. Push branch: `git push origin feat/cli-minimal-rr-7.8`
2. Note URL for PR creation
3. Verify push succeeded

## Phase 10: Pull Request Creation

### Task 10.1: Create GitHub PR
**WHAT:** Open pull request  
**WHY:** Begin review process  
**STEPS:**
1. Go to GitHub repository
2. Click "Compare & pull request"
3. Base: `main`
4. Compare: `feat/cli-minimal-rr-7.8`
5. Title: "fix(cli): minimal React Router 7.8.2 compatibility updates"

### Task 10.2: PR Description Template
**WHAT:** Provide context for reviewers  
**WHY:** Clear communication of changes  
**STEPS:**
Copy and use this template:
```markdown
## Summary
Minimal CLI changes required for skeleton template compatibility with React Router 7.8.x. This is PR 4 of 9 in the migration strategy.

## Scope
This PR includes ONLY the essential CLI changes needed for the skeleton to work:
- Version validation
- Version pinning  
- Legacy code removal
- Build configuration

Advanced CLI features (diff system removal, auto-linking, monorepo detection) are intentionally deferred to PR 7.

## Changes
- ✅ React Router version consistency checking (warns on mismatches)
- ✅ Exact version pinning to 7.8.2 (no ~/^ ranges)
- ✅ Removed legacy Remix-specific configuration code
- ✅ Updated build configuration for React Router 7.8.x

## What's NOT Included
- ❌ Diff system removal (PR 7)
- ❌ CLI auto-linking (PR 7)
- ❌ Monorepo detection (PR 7)
- ❌ Template handling improvements (PR 7)

## Testing
- [x] CLI builds successfully
- [x] TypeScript compilation passes
- [x] Version checking works
- [x] Core commands functional
- [x] No new TypeScript errors

## Files Changed
~10 files (minimal changeset)

## Dependencies
- PR 0 (Version pinning) must be merged first
- PR 1, 2, 3 recommended but not strictly required
- PR 5 (Skeleton) will depend on this

## Next Steps
After this PR:
1. PR 5 can proceed (Skeleton template)
2. PR 7 will add advanced CLI features

## Related
- Part of #3127 breakdown strategy
- See PRS_STRATEGY.md for overall plan
```

## Success Criteria Checklist
- [ ] Feature branch created from main
- [ ] Version check commit cherry-picked
- [ ] Version pinning partially applied (CLI only)
- [ ] React Router versions exactly 7.8.2
- [ ] Legacy Remix code removed
- [ ] Build configuration updated
- [ ] CLI builds without errors
- [ ] TypeScript passes (no new errors)
- [ ] Version checking functional
- [ ] Core CLI commands work
- [ ] Only ~10 files modified
- [ ] Only packages/cli/ modified
- [ ] No advanced features included
- [ ] Clean commit history
- [ ] PR created and ready

## Troubleshooting Guide

### Issue: Cherry-pick has too many changes
**Solution:**
1. Use `git cherry-pick -n` (no commit)
2. Reset all: `git reset HEAD`
3. Add only CLI files: `git add packages/cli/...`
4. Commit with custom message

### Issue: Build fails with memory error
**Solution:**
1. Check tsup.config.ts for dts setting
2. Set `dts: false` to disable declaration generation
3. Clear node_modules/.cache
4. Retry build

### Issue: Version check not working
**Solution:**
1. Verify file exists: dist/lib/react-router-version-check.js
2. Check it's imported in dev command
3. Verify the function is exported correctly
4. Check for typos in import statements

### Issue: TypeScript errors in commands
**Solution:**
1. Check all imports are correct
2. Verify types from @oclif/core
3. May need to update oclif dependencies
4. Check tsconfig.json settings

### Issue: Manifest generation fails
**Solution:**
1. This is often okay - manifest might be committed
2. Check oclif.manifest.json exists
3. If needed, can be regenerated later
4. Not critical for this PR

### Issue: Too many files changed
**Solution:**
1. Review each file: "Is this essential?"
2. Reset non-essential files: `git checkout main -- <file>`
3. Focus on version checking and pinning only
4. Defer other improvements to PR 7

## Notes for Implementer
- Keep this PR minimal - resist adding "nice to have" changes
- Version checking is the critical feature
- Legacy Remix code removal helps prevent confusion
- Build config changes should be minimal
- If in doubt, defer to PR 7
- Test that CLI still works for basic commands
- Document any unexpected issues
- Remember: skeleton compatibility is the goal