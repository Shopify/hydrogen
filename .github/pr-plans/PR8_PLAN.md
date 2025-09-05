# PR 8: All Examples Conversion - Detailed Execution Plan

## Overview
This PR converts all Hydrogen examples from the deprecated diff-based system to standalone, fully functional applications. This is a massive change (~785 files) affecting 10 examples, making each one self-contained and independently maintainable. Each example becomes a complete Hydrogen application that can be run, tested, and deployed independently.

## Pre-requisites
- **CRITICAL**: PR 0-5 must be merged first
- **RECOMMENDED**: PR 7 (CLI Advanced) should be merged
- Working from branch: `hydrogen-react-router-7.8.2-clean`
- Target branch: `main` (with PR 0-5 merged)
- Required tools: git, npm, node
- Significant disk space (~1GB for all examples)
- Clean working directory

## Examples to Convert
1. **b2b** - Business-to-business features
2. **custom-cart-method** - Custom cart implementations
3. **gtm** - Google Tag Manager integration
4. **infinite-scroll** - Infinite scrolling implementation
5. **legacy-customer-account-flow** - Legacy customer accounts
6. **metaobjects** - Metaobject usage
7. **multipass** - Multipass authentication
8. **partytown** - Partytown web worker integration
9. **third-party-queries-caching** - Third-party API caching
10. **express** - Express server integration

## Phase 1: Setup and Branch Preparation

### Task 1.1: Verify Prerequisites
**WHAT:** Confirm PR 0-5 are merged to main  
**WHY:** Examples need the updated skeleton and packages  
**STEPS:**
1. Fetch latest main: `git fetch origin main`
2. Check critical PRs:
   ```bash
   echo "Checking prerequisites..."
   git log origin/main --oneline | grep -i "version.*pinning" | head -1
   git log origin/main --oneline | grep -i "skeleton.*migration" | head -1
   ```
3. Both must return results
4. If missing, STOP - wait for merges
5. Document: `echo "Prerequisites: PR0-5 ✓" > pr8-status.txt`

### Task 1.2: Create Feature Branch
**WHAT:** Create branch for examples conversion  
**WHY:** This is a massive change that needs isolation  
**STEPS:**
1. Checkout and update main:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Create feature branch: `git checkout -b feat/examples-standalone-rr-7.8`
3. Verify clean state: `git status`
4. Note commit: `git log -1 --oneline`
5. Document: `echo "Branch created from: $(git rev-parse --short HEAD)" >> pr8-status.txt`

### Task 1.3: Assess Current Examples State
**WHAT:** Understand current examples structure  
**WHY:** Need to know what we're converting from  
**STEPS:**
1. Navigate to examples: `cd examples`
2. List all examples:
   ```bash
   ls -la
   ```
3. Check if examples exist or are placeholders:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "=== $dir ==="
     ls -la $dir 2>/dev/null | head -5 || echo "Not found"
   done
   ```
4. Document current structure
5. Note which are diff-based vs standalone

## Phase 2: Cherry-Pick Examples Conversion

### Task 2.1: Apply Examples Conversion Commit
**WHAT:** Cherry-pick the massive examples conversion  
**WHY:** Converts all examples to standalone  
**STEPS:**
1. Cherry-pick: `git cherry-pick e2b78b1`
2. This is a MASSIVE commit (~785 files)
3. Expected: Many new files and directories
4. If conflicts:
   - Unlikely but if they occur, usually in package.json files
   - Accept incoming for new examples
   - For package.json: ensure React Router 7.8.2
5. Continue if needed: `git cherry-pick --continue`
6. Document: `echo "Examples conversion: APPLIED" >> pr8-status.txt`

### Task 2.2: Verify Files Created
**WHAT:** Confirm all example files were added  
**WHY:** Ensure complete conversion  
**STEPS:**
1. Count new files:
   ```bash
   git diff --name-only HEAD~1 | wc -l
   ```
2. Should be ~785 files
3. Check each example has files:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "=== $dir ==="
     find $dir -type f | wc -l
   done
   ```
4. Each should have 50-100+ files
5. Document file counts per example

### Task 2.3: Verify Example Structure
**WHAT:** Check each example is complete  
**WHY:** Each must be a standalone app  
**STEPS:**
1. Check for required files in each example:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "=== Checking $dir ==="
     ls -la $dir/package.json 2>/dev/null && echo "✓ package.json"
     ls -la $dir/tsconfig.json 2>/dev/null && echo "✓ tsconfig.json"
     ls -la $dir/react-router.config.ts 2>/dev/null && echo "✓ react-router.config.ts"
     ls -la $dir/app/root.tsx 2>/dev/null && echo "✓ app/root.tsx"
     echo ""
   done
   ```
2. All should have these core files
3. Document any missing files
4. Check for .env.example files
5. Note configuration requirements

## Phase 3: Update React Router Versions

### Task 3.1: Verify React Router Versions
**WHAT:** Ensure all examples use React Router 7.8.2  
**WHY:** Must match the version we're migrating to  
**STEPS:**
1. Check all package.json files:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "=== $dir ==="
     cat $dir/package.json | grep '"react-router"'
   done
   ```
2. All should show "7.8.2" exactly
3. If any have ranges (~, ^), fix them:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     sed -i '' 's/"react-router": "[~^]7.8.[0-9]"/"react-router": "7.8.2"/g' $dir/package.json
   done
   ```
4. Verify changes
5. Document any updates needed

### Task 3.2: Check Import Statements
**WHAT:** Verify imports use react-router not @remix-run  
**WHY:** Must use React Router imports  
**STEPS:**
1. Search for Remix imports:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "=== $dir ==="
     grep -r "@remix-run" $dir --include="*.ts" --include="*.tsx" | wc -l
   done
   ```
2. Should all be 0 (no Remix imports)
3. Check for correct React Router imports:
   ```bash
   grep -r "from 'react-router'" b2b --include="*.tsx" | head -5
   ```
4. Should see React Router imports
5. Fix any incorrect imports found

### Task 3.3: Update Configuration Files
**WHAT:** Ensure configs use React Router presets  
**WHY:** Must use new configuration system  
**STEPS:**
1. Check react-router.config.ts in each:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "=== $dir ==="
     grep "hydrogenPreset" $dir/react-router.config.ts
   done
   ```
2. All should use hydrogenPreset()
3. Check tsconfig.json for types:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     grep -A 3 '"types"' $dir/tsconfig.json | head -4
   done
   ```
4. Should include React Router types
5. Document configuration approach

## Phase 4: Individual Example Validation

### Task 4.1: Validate B2B Example
**WHAT:** Test the B2B example  
**WHY:** Ensure it works standalone  
**STEPS:**
1. Navigate: `cd b2b`
2. Install dependencies: `npm install`
3. Check for build script: `cat package.json | grep '"build"'`
4. Build: `npm run build`
5. Typecheck: `npm run typecheck`
6. Document: `echo "b2b: BUILD SUCCESS" >> ../pr8-status.txt`
7. Return: `cd ..`

### Task 4.2: Validate Custom Cart Method Example
**WHAT:** Test custom cart implementation  
**WHY:** Complex cart logic must work  
**STEPS:**
1. Navigate: `cd custom-cart-method`
2. Install: `npm install`
3. Build: `npm run build`
4. Typecheck: `npm run typecheck`
5. Check for cart-specific files:
   ```bash
   find app -name "*cart*" -type f | head -10
   ```
6. Document: `echo "custom-cart-method: BUILD SUCCESS" >> ../pr8-status.txt`
7. Return: `cd ..`

### Task 4.3: Validate GTM Example
**WHAT:** Test Google Tag Manager integration  
**WHY:** Third-party integrations are common  
**STEPS:**
1. Navigate: `cd gtm`
2. Install: `npm install`
3. Build: `npm run build`
4. Check for GTM files:
   ```bash
   grep -r "gtm\|googletagmanager" app/ --include="*.tsx" | head -5
   ```
5. Should find GTM integration code
6. Document: `echo "gtm: BUILD SUCCESS" >> ../pr8-status.txt`
7. Return: `cd ..`

### Task 4.4: Validate Infinite Scroll Example
**WHAT:** Test infinite scrolling  
**WHY:** Common UX pattern  
**STEPS:**
1. Navigate: `cd infinite-scroll`
2. Install: `npm install`
3. Build: `npm run build`
4. Check for pagination logic:
   ```bash
   grep -r "pagination\|scroll\|loadMore" app/ --include="*.tsx" | head -5
   ```
5. Document: `echo "infinite-scroll: BUILD SUCCESS" >> ../pr8-status.txt`
6. Return: `cd ..`

### Task 4.5: Validate Legacy Customer Account Example
**WHAT:** Test legacy customer accounts  
**WHY:** Backward compatibility important  
**STEPS:**
1. Navigate: `cd legacy-customer-account-flow`
2. Install: `npm install`
3. Build: `npm run build`
4. Check for account files:
   ```bash
   find app -name "*account*" -o -name "*customer*" | head -10
   ```
5. Document: `echo "legacy-customer-account: BUILD SUCCESS" >> ../pr8-status.txt`
6. Return: `cd ..`

### Task 4.6: Validate Metaobjects Example
**WHAT:** Test metaobject usage  
**WHY:** Advanced Shopify feature  
**STEPS:**
1. Navigate: `cd metaobjects`
2. Install: `npm install`
3. Build: `npm run build`
4. Check for metaobject queries:
   ```bash
   grep -r "metaobject" app/ --include="*.tsx" --include="*.ts" | head -5
   ```
5. Document: `echo "metaobjects: BUILD SUCCESS" >> ../pr8-status.txt`
6. Return: `cd ..`

### Task 4.7: Validate Multipass Example
**WHAT:** Test multipass authentication  
**WHY:** SSO integration  
**STEPS:**
1. Navigate: `cd multipass`
2. Install: `npm install`
3. Build: `npm run build`
4. Check for multipass logic:
   ```bash
   grep -r "multipass" app/ --include="*.tsx" --include="*.ts" | head -5
   ```
5. Document: `echo "multipass: BUILD SUCCESS" >> ../pr8-status.txt`
6. Return: `cd ..`

### Task 4.8: Validate Partytown Example
**WHAT:** Test Partytown web worker integration  
**WHY:** Performance optimization technique  
**STEPS:**
1. Navigate: `cd partytown`
2. Install: `npm install`
3. Build: `npm run build`
4. Check for Partytown setup:
   ```bash
   grep -r "partytown" app/ public/ --include="*.tsx" --include="*.html" | head -5
   ```
5. Document: `echo "partytown: BUILD SUCCESS" >> ../pr8-status.txt`
6. Return: `cd ..`

### Task 4.9: Validate Third-Party Caching Example
**WHAT:** Test third-party API caching  
**WHY:** Common integration pattern  
**STEPS:**
1. Navigate: `cd third-party-queries-caching`
2. Install: `npm install`
3. Build: `npm run build`
4. Check for caching logic:
   ```bash
   grep -r "cache\|Cache" app/ --include="*.tsx" --include="*.ts" | head -10
   ```
5. Document: `echo "third-party-caching: BUILD SUCCESS" >> ../pr8-status.txt`
6. Return: `cd ..`

### Task 4.10: Validate Express Example
**WHAT:** Test Express server integration  
**WHY:** Custom server scenarios  
**STEPS:**
1. Navigate: `cd express`
2. Install: `npm install`
3. Check for Express files:
   ```bash
   ls -la server.js 2>/dev/null || ls -la server.ts 2>/dev/null
   ```
4. Build: `npm run build`
5. Check Express integration:
   ```bash
   grep -r "express" . --include="*.js" --include="*.ts" | head -5
   ```
6. Document: `echo "express: BUILD SUCCESS" >> ../pr8-status.txt`
7. Return: `cd ..`

## Phase 5: Batch Testing

### Task 5.1: Parallel Installation Test
**WHAT:** Install all examples in parallel  
**WHY:** Verify no dependency conflicts  
**STEPS:**
1. Create install script: `batch-install.sh`
   ```bash
   #!/bin/bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "Installing $dir..."
     (cd $dir && npm install) &
   done
   wait
   echo "All installations complete"
   ```
2. Run: `chmod +x batch-install.sh && ./batch-install.sh`
3. Wait for completion (may take several minutes)
4. Check for errors
5. Document results

### Task 5.2: Batch Build Test
**WHAT:** Build all examples  
**WHY:** Ensure all compile correctly  
**STEPS:**
1. Create build script: `batch-build.sh`
   ```bash
   #!/bin/bash
   failed=""
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "Building $dir..."
     if (cd $dir && npm run build); then
       echo "✓ $dir built successfully"
     else
       echo "✗ $dir build failed"
       failed="$failed $dir"
     fi
   done
   if [ -z "$failed" ]; then
     echo "All builds successful!"
   else
     echo "Failed builds:$failed"
     exit 1
   fi
   ```
2. Run: `chmod +x batch-build.sh && ./batch-build.sh`
3. Should all pass
4. Document any failures
5. Clean up scripts

### Task 5.3: TypeCheck All Examples
**WHAT:** Run TypeScript checking on all  
**WHY:** Ensure type safety  
**STEPS:**
1. Create typecheck script: `batch-typecheck.sh`
   ```bash
   #!/bin/bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "=== $dir typecheck ==="
     (cd $dir && npm run typecheck) || echo "Failed: $dir"
   done
   ```
2. Run: `chmod +x batch-typecheck.sh && ./batch-typecheck.sh`
3. All should pass
4. Document results
5. Clean up: `rm batch-*.sh`

## Phase 6: Documentation Review

### Task 6.1: Check Example READMEs
**WHAT:** Verify each example has documentation  
**WHY:** Users need to understand examples  
**STEPS:**
1. Check for README files:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "=== $dir ==="
     ls -la $dir/README.md 2>/dev/null || echo "No README"
   done
   ```
2. Each should have a README
3. Check README quality:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     if [ -f "$dir/README.md" ]; then
       echo "=== $dir ($(wc -l < $dir/README.md) lines) ==="
       head -5 $dir/README.md
     fi
   done
   ```
4. Should explain the example
5. Document any missing docs

### Task 6.2: Check Environment Setup
**WHAT:** Verify .env.example files  
**WHY:** Examples need configuration  
**STEPS:**
1. Check for env examples:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "=== $dir ==="
     ls -la $dir/.env.example 2>/dev/null || echo "No .env.example"
   done
   ```
2. Check env content:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     if [ -f "$dir/.env.example" ]; then
       echo "=== $dir env vars ==="
       grep -v "^#" $dir/.env.example | grep -v "^$" | head -5
     fi
   done
   ```
3. Should have necessary variables
4. Document configuration needs
5. Note any special requirements

## Phase 7: Code Quality Checks

### Task 7.1: Check for Deprecated Patterns
**WHAT:** Ensure no old patterns remain  
**WHY:** Must use modern approaches  
**STEPS:**
1. Check for old Remix exports:
   ```bash
   grep -r "@remix-run" . --include="*.ts" --include="*.tsx" --include="*.js" | wc -l
   ```
2. Should be 0
3. Check for deprecated APIs:
   ```bash
   grep -r "createRequestHandler\|handleRequest" . --include="*.ts" --include="*.tsx" | head -10
   ```
4. Should use new patterns
5. Document any issues found

### Task 7.2: Verify GraphQL Usage
**WHAT:** Check GraphQL queries are correct  
**WHY:** Examples showcase Shopify API usage  
**STEPS:**
1. Find GraphQL files:
   ```bash
   find . -name "*.graphql" -o -name "*.gql" | wc -l
   ```
2. Check inline queries:
   ```bash
   grep -r "#graphql" . --include="*.ts" --include="*.tsx" | wc -l
   ```
3. Should have GraphQL queries
4. Sample a query:
   ```bash
   grep -A 10 "#graphql" b2b/app/routes/*.tsx | head -20
   ```
5. Should be valid Shopify queries

### Task 7.3: Check Dependencies
**WHAT:** Verify dependency consistency  
**WHY:** Examples should use same versions  
**STEPS:**
1. Compare Hydrogen versions:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "$dir: $(grep '"@shopify/hydrogen"' $dir/package.json)"
   done
   ```
2. Should all be consistent
3. Check CLI versions:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "$dir: $(grep '"@shopify/cli"' $dir/package.json)"
   done
   ```
4. Should match skeleton
5. Document version alignment

## Phase 8: Final Integration Testing

### Task 8.1: Test Example Scaffolding
**WHAT:** Verify examples can be used as templates  
**WHY:** Users often start from examples  
**STEPS:**
1. Try copying an example:
   ```bash
   cp -r b2b /tmp/test-b2b-copy
   cd /tmp/test-b2b-copy
   npm install
   npm run build
   ```
2. Should work independently
3. Clean up: `rm -rf /tmp/test-b2b-copy`
4. Document scaffolding capability
5. Note any issues

### Task 8.2: Memory and Performance Check
**WHAT:** Ensure examples are reasonably sized  
**WHY:** Examples shouldn't be bloated  
**STEPS:**
1. Check disk usage:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "$dir: $(du -sh $dir | cut -f1)"
   done
   ```
2. Should be reasonable (10-50MB each)
3. Check node_modules sizes:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "$dir node_modules: $(du -sh $dir/node_modules 2>/dev/null | cut -f1)"
   done
   ```
4. Document sizes
5. Note any outliers

## Phase 9: Final Validation

### Task 9.1: Verify File Count
**WHAT:** Confirm ~785 files changed  
**WHY:** Match expected scope  
**STEPS:**
1. Count all changes:
   ```bash
   git diff --name-only main | wc -l
   ```
2. Should be approximately 785
3. Break down by example:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "$dir: $(git diff --name-only main | grep "^examples/$dir/" | wc -l) files"
   done
   ```
4. Each should have many files
5. Document final counts

### Task 9.2: Run Final Build Check
**WHAT:** One more build of everything  
**WHY:** Ensure all is ready  
**STEPS:**
1. Clean all builds:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     rm -rf $dir/dist $dir/.cache
   done
   ```
2. Build all again:
   ```bash
   for dir in b2b custom-cart-method gtm infinite-scroll legacy-customer-account-flow metaobjects multipass partytown third-party-queries-caching express; do
     echo "Final build: $dir"
     (cd $dir && npm run build) || exit 1
   done
   ```
3. All should succeed
4. Document: `echo "Final builds: ALL SUCCESS" >> pr8-status.txt`
5. Return to root: `cd ..`

## Phase 10: Commit and Push

### Task 10.1: Review Changes
**WHAT:** Final review of all changes  
**WHY:** Ensure quality  
**STEPS:**
1. Check diff size:
   ```bash
   git diff main | wc -l
   ```
2. Will be massive (tens of thousands of lines)
3. Spot check a few files:
   ```bash
   git diff main -- examples/b2b/app/routes/\$index.tsx | head -50
   ```
4. Should show React Router usage
5. No debug code or console.logs

### Task 10.2: Commit Message
**WHAT:** Create clear commit message  
**WHY:** Document this massive change  
**STEPS:**
1. If not already committed from cherry-pick:
   ```bash
   git add examples/
   git commit -m "feat(examples): convert all examples to standalone React Router 7.8.x apps

   Convert 10 examples from diff-based to standalone:
   - b2b
   - custom-cart-method
   - gtm
   - infinite-scroll
   - legacy-customer-account-flow
   - metaobjects
   - multipass
   - partytown
   - third-party-queries-caching
   - express
   
   Each example is now a complete, standalone Hydrogen application
   with React Router 7.8.x, proper TypeScript configuration, and
   can be built, tested, and deployed independently.
   
   Part of React Router 7.8.x migration (PR 8 of 9)"
   ```
2. Or amend if needed

### Task 10.3: Push Branch
**WHAT:** Push to GitHub  
**WHY:** Create PR  
**STEPS:**
1. Push: `git push origin feat/examples-standalone-rr-7.8`
2. Will take time (large push)
3. Note URL provided
4. Verify on GitHub
5. Document: `echo "Pushed to GitHub" >> pr8-status.txt`

## Phase 11: Pull Request Creation

### Task 11.1: Create GitHub PR
**WHAT:** Open pull request  
**WHY:** Get review  
**STEPS:**
1. Go to GitHub
2. Click "Compare & pull request"
3. Base: `main`
4. Compare: `feat/examples-standalone-rr-7.8`
5. Title: "feat(examples): convert all examples to standalone React Router 7.8.x apps"

### Task 11.2: PR Description Template
**WHAT:** Comprehensive description  
**WHY:** Reviewers need context for this massive change  
**STEPS:**
Copy and use:
```markdown
## Summary
Convert all 10 Hydrogen examples from the deprecated diff-based system to fully standalone applications using React Router 7.8.x. This is PR 8 of 9 in the React Router 7.8.x migration strategy.

## Changes
Converted the following examples to standalone apps:

### E-commerce Examples
- **b2b** - Business-to-business features and wholesale functionality
- **custom-cart-method** - Advanced cart customization techniques
- **metaobjects** - Using Shopify metaobjects for flexible content

### Integration Examples
- **gtm** - Google Tag Manager integration for analytics
- **multipass** - Single sign-on with Multipass authentication
- **partytown** - Web worker optimization with Partytown
- **third-party-queries-caching** - Caching strategies for external APIs
- **express** - Custom Express server integration

### UX Examples
- **infinite-scroll** - Infinite scrolling product lists
- **legacy-customer-account-flow** - Classic customer account management

## Scope
- ~785 files added/modified
- Each example is now a complete Hydrogen application
- All examples use React Router 7.8.x (exact version 7.8.2)
- Removed all diff-based example code
- Added proper TypeScript configuration to each
- Included environment setup files

## Dependencies
⚠️ **REQUIRES**: PR 0-5 must be merged first
- PR 0: Version pinning ✅
- PR 1-5: Core packages and skeleton ✅
- PR 7: CLI Advanced (recommended) ⭕

## Testing Performed
- [x] All examples build successfully
- [x] TypeScript compilation passes for all
- [x] No Remix imports remain
- [x] React Router 7.8.2 used consistently
- [x] Each example has required configuration files
- [x] GraphQL queries validated
- [x] Dependencies aligned with skeleton

## Structure
Each example now includes:
```
examples/[name]/
├── package.json          # Standalone dependencies
├── tsconfig.json         # TypeScript config
├── react-router.config.ts # React Router config with hydrogenPreset
├── .env.example          # Environment variables template
├── README.md             # Documentation
├── app/
│   ├── root.tsx         # Root component
│   ├── entry.server.tsx # Server entry
│   ├── entry.client.tsx # Client entry
│   ├── routes/          # Route components
│   └── ...              # Feature-specific code
└── public/              # Static assets
```

## Breaking Changes
- ⚠️ Diff-based example system completely removed
- ⚠️ Examples must be copied entirely, not applied as patches
- ⚠️ Each example requires its own `npm install`

## Migration Guide
To use an example:
1. Copy the entire example directory
2. Run `npm install` in the example
3. Copy `.env.example` to `.env` and configure
4. Run `npm run dev` to start development

## File Statistics
| Example | Files | Lines of Code |
|---------|-------|---------------|
| b2b | ~80 | ~3000 |
| custom-cart-method | ~75 | ~2500 |
| gtm | ~70 | ~2200 |
| infinite-scroll | ~72 | ~2300 |
| legacy-customer-account-flow | ~85 | ~3200 |
| metaobjects | ~78 | ~2800 |
| multipass | ~76 | ~2600 |
| partytown | ~73 | ~2400 |
| third-party-queries-caching | ~82 | ~2900 |
| express | ~94 | ~3500 |
| **Total** | **~785** | **~27,400** |

## Performance Impact
- Examples no longer require diff application
- Faster to get started with examples
- Each example ~10-50MB (excluding node_modules)
- Build time per example: ~5-10 seconds

## Documentation
- Each example includes its own README
- Environment setup documented in .env.example
- Code comments explain example-specific features

## Next Steps
- PR 9: Update cookbook recipes

## Related
- Part of #3127 breakdown strategy
- See PRS_STRATEGY.md for overall plan
- Commit e2b78b1 from hydrogen-react-router-7.8.x branch

## Validation
To test all examples:
```bash
# Install all
for dir in examples/*/; do (cd "$dir" && npm install); done

# Build all
for dir in examples/*/; do (cd "$dir" && npm run build); done

# TypeCheck all
for dir in examples/*/; do (cd "$dir" && npm run typecheck); done
```
```

## Success Criteria Checklist
- [ ] PR 0-5 merged first
- [ ] Feature branch created
- [ ] Commit e2b78b1 cherry-picked
- [ ] ~785 files added/modified
- [ ] All 10 examples converted
- [ ] Each example builds successfully
- [ ] TypeScript passes for all
- [ ] No Remix imports remain
- [ ] React Router 7.8.2 used exactly
- [ ] Each has package.json
- [ ] Each has tsconfig.json
- [ ] Each has react-router.config.ts
- [ ] Each has README.md
- [ ] Each has .env.example
- [ ] Dependencies aligned
- [ ] No debug code
- [ ] PR created and ready

## Troubleshooting Guide

### Issue: Cherry-pick conflicts
**Solution:**
1. Unlikely with examples
2. If occurs, accept incoming
3. Ensure React Router 7.8.2
4. Continue cherry-pick

### Issue: Example won't build
**Solution:**
1. Check package.json versions
2. Ensure React Router is 7.8.2
3. Run npm install again
4. Check for missing dependencies
5. Compare with skeleton

### Issue: TypeScript errors
**Solution:**
1. Check tsconfig.json
2. Ensure types array includes React Router
3. Verify imports are correct
4. Check @shopify/hydrogen version

### Issue: Missing files in example
**Solution:**
1. Check cherry-pick completed
2. Verify all files added
3. Compare with expected structure
4. May need manual addition

### Issue: GraphQL errors
**Solution:**
1. Check query syntax
2. Verify schema compatibility
3. Ensure proper tagging (#graphql)
4. Check API version

### Issue: Dependency conflicts
**Solution:**
1. Ensure exact versions (no ~, ^)
2. Align with skeleton versions
3. Clear node_modules and reinstall
4. Check for duplicate packages

### Issue: Example too large
**Solution:**
1. Check for committed node_modules
2. Ensure .gitignore is correct
3. Remove build artifacts
4. Clean unnecessary files

## Notes for Implementer
- This is a MASSIVE PR (~785 files)
- Cherry-pick will take time
- Each example must be validated
- Build times will be long
- Consider breaking if too large
- Test a few examples thoroughly
- Document any patterns noticed
- Be patient with installations
- May need significant disk space
- Git operations will be slow