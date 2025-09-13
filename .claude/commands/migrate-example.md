# Example to Recipe Migration Protocol v1.0

## 🎯 Purpose
This protocol guides the systematic migration of Hydrogen examples to cookbook recipes. Each phase builds toward a production-ready, reusable recipe that can be applied to any Hydrogen skeleton template.

## ⚠️ CRITICAL RULES

### DOs ✅
- ALWAYS start by asking which example to migrate
- Test incrementally at each phase (typecheck, build, dev, preview)
- Fix skeleton issues BEFORE generating recipes
- Use `@description` comments to document changes
- Commit skeleton fixes separately from recipe creation
- Regenerate recipes after any skeleton modifications
- Validate the recipe applies cleanly to a reset skeleton

### DON'Ts ❌
- NEVER generate a recipe with uncommitted skeleton changes
- NEVER skip validation gates
- NEVER assume file structures match between example and skeleton
- NEVER modify recipe files manually after generation (use regenerate)
- NEVER proceed without user confirmation at phase gates

## 📋 Migration Case File Template

```markdown
## Migration Case: [Example Name]
**Status:** Phase [0-7]
**Source:** examples/[example-name]/
**Target Recipe:** cookbook/recipes/[recipe-name]/
**Started:** [UTC timestamp]

### Changes Summary
- Files Added: [count]
- Files Modified: [count]
- Dependencies Added: [list]

### Evidence Log (E-###)
- E-001: [Finding from investigation]
- E-002: [Difference identified]

### Validation Results
- [ ] TypeScript compiles
- [ ] Build succeeds
- [ ] Dev server runs
- [ ] Preview works
- [ ] Recipe applies cleanly
```

## 🔄 PHASE 0: INTAKE

### Goal
Establish which example to migrate and initial scope.

### Actions
```markdown
📝 **Which example would you like to migrate to a recipe?**

Available examples in @examples/:
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
- [other examples as discovered]

Please specify the example name, and I'll begin the migration process.
```

### Gate Requirements ✓
- [ ] Example name provided
- [ ] Example exists in @examples/
- [ ] Recipe name determined (usually same as example)
- [ ] Case file created

### User Confirmation
```
Ready to investigate @examples/[name]? 
This will analyze differences with the skeleton template.
[Continue? Y/N]
```

---

## 🔍 PHASE 1: INVESTIGATION

### Goal
Understand complete scope of changes needed.

### Actions
1. Compare example vs skeleton file structure
2. Identify new files to add (ingredients)
3. Identify files to modify (patches)
4. Document dependencies and configuration changes
5. Note any React Router 7.8.x compatibility issues

### Commands to Run
```bash
# List example structure
ls -la examples/[example-name]/app/

# Compare with skeleton
diff -r templates/skeleton/app/ examples/[example-name]/app/ | head -50

# Check for unique dependencies
diff templates/skeleton/package.json examples/[example-name]/package.json

# Search for EXAMPLE UPDATE blocks (critical!)
grep -n "EXAMPLE UPDATE" examples/[example-name]/app/**/*.{ts,tsx} 2>/dev/null || \
find examples/[example-name]/app -name "*.ts" -o -name "*.tsx" | xargs grep -n "EXAMPLE UPDATE"
```

### Evidence Collection
- E-001: New files found: [list paths]
- E-002: Modified files found: [list paths]
- E-003: Dependencies added: [list packages]
- E-004: Configuration changes: [list changes]

### Gate Requirements ✓
- [ ] All new files identified
- [ ] All modifications catalogued
- [ ] Dependencies documented
- [ ] No React Router incompatibilities

### User Confirmation
```
Investigation complete. Found:
- [X] new files
- [Y] files to modify
- [Z] new dependencies

Ready to prepare skeleton? 
[Continue? Y/N]
```

---

## 🔨 PHASE 2: SKELETON PREPARATION

### Goal
Apply changes to skeleton template for recipe generation.

### Actions
1. Reset skeleton to clean state
2. Copy new files with proper paths
3. Apply modifications to existing files
4. **MERGE README.md** - Combine example's README with skeleton's README
   - Keep skeleton's base structure
   - Add example-specific sections
   - Include setup instructions
   - Document new features and configuration
5. Add `@description` comments at key points
6. Update dependencies if needed

### Critical: Example Code Block Integration Strategy

#### Identifying Example Updates
Look for code blocks marked with:
```typescript
/***********************************************/
/**********  EXAMPLE UPDATE STARTS  ************/
// ... example-specific code ...
/**********   EXAMPLE UPDATE END   ************/
/***********************************************/
```

#### Integration Process
1. **For NEW files from examples:**
   - If the file doesn't exist in skeleton, DON'T copy it entirely
   - Check if the file is just a modified version of a skeleton file
   - If it's truly new functionality, add it as an ingredient
   - Remove any code that duplicates skeleton functionality

2. **For EXISTING skeleton files:**
   - Deeply investigate the skeleton's current structure
   - Identify the optimal insertion point for each example block
   - Consider:
     - Logical flow of the existing code
     - Import dependencies required by the example
     - Type definitions and interfaces needed
     - Existing patterns and conventions in the skeleton
     - Whether to modify existing functions vs adding new ones
   
3. **Strategic Placement Rules:**
   - Place imports at the top, merged with existing imports
   - Add type augmentations to global declarations
   - Insert functions/components where they logically belong
   - Maintain skeleton's existing code organization
   - Preserve skeleton's component structure when possible

4. **Example Block Handling:**
   - **IMPORTANT**: Remove the EXAMPLE UPDATE marker comments when integrating into skeleton
   - Add `@description` comments to explain what the code does
   - Ensure the block is self-contained and clear
   - The markers help identify what to copy but should NOT be included in the final skeleton

#### Example Integration Pattern
```typescript
// WRONG: Replacing entire skeleton file with example file
// ❌ This loses skeleton's existing functionality

// ALSO WRONG: Keeping the EXAMPLE UPDATE markers in skeleton
// ❌ These markers are for identification only

// RIGHT: Surgical insertion WITHOUT markers
// ✅ Preserves skeleton while adding new features cleanly

// In skeleton's existing component:
function ExistingComponent() {
  // ... existing skeleton code ...
  
  // @description Add custom feature for [purpose]
  const customFeature = useCustomHook();
  
  // ... more existing skeleton code ...
}
```

### Key Patterns to Follow
```typescript
// @description Import the [feature] for [purpose]
import {createFeatureClient} from '~/lib/feature.server';

// @description Create [feature] client with caching
const featureClient = createFeatureClient({
  cache,
  waitUntil,
  request,
});

// @description Define additional context with [feature]
const additionalContext = {
  featureClient,
} as const;
```

### Common Issues & Fixes

#### Issue: Missing TypeScript types
```bash
# Check what's missing
npm run typecheck

# Fix: Install type definitions
npm i --save-dev @types/[package]
```

#### Issue: Component prop mismatches
```typescript
// Fix: Update component interfaces to match usage
type ComponentProps = {
  existingProp: Type;
  newProp?: NewType; // Add missing props
};
```

### Gate Requirements ✓
- [ ] Skeleton modifications complete
- [ ] GraphQL types regenerated (`npm run codegen`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Dev server runs (`npm run dev`)
- [ ] No console errors

### Important Testing Notes
- **ALWAYS run `npm run codegen` first** - If the example adds GraphQL queries or modifies fragments, the types must be regenerated before TypeScript checking
- **Navigation matters** - Use `cd templates/skeleton && npm run [command]` to ensure commands run in the correct directory
- **Build test is crucial** - Even if TypeScript passes, the build might fail due to bundling issues

### User Confirmation
```
Skeleton prepared with all changes.
Tests: ✓ typecheck ✓ build ✓ dev

Ready to generate recipe?
[Continue? Y/N]
```

---

## 📦 PHASE 3: RECIPE GENERATION

### Goal
Create recipe from skeleton changes.

### Actions
1. Ensure skeleton has no uncommitted changes
2. Run cookbook generate command
3. Review generated recipe structure
4. Verify all changes captured

### Commands
```bash
# IMPORTANT: Navigate from project root
cd cookbook

# Generate the recipe
npm run cookbook -- generate --recipe [recipe-name]

# Check generated files
ls -la recipes/[recipe-name]/
```

### Common Issues During Generation
- **"Template folder has uncommitted changes"** - The skeleton MUST be clean before generating
- **Missing patches** - If a file isn't patched, check if your changes were actually saved
- **Navigation errors** - Always check your current directory with `pwd`

### Expected Output Structure
```
recipes/[recipe-name]/
├── recipe.yaml          # Recipe manifest
├── README.md           # Documentation (auto-generated)
├── ingredients/        # New files
│   └── templates/skeleton/app/...
└── patches/           # File modifications
    ├── file1.hash.patch
    └── file2.hash.patch
```

### Gate Requirements ✓
- [ ] Recipe folder created
- [ ] All new files in ingredients/
- [ ] All patches generated
- [ ] recipe.yaml contains all steps

### User Confirmation
```
Recipe generated at cookbook/recipes/[recipe-name]/
Files: [X] ingredients, [Y] patches

Ready to validate recipe?
[Continue? Y/N]
```

---

## ✅ PHASE 4: VALIDATION

### Goal
Ensure recipe applies correctly.

### Actions
1. Reset skeleton to clean state
2. Apply recipe to skeleton
3. Run full test suite
4. Test functionality

### Commands
```bash
# Reset skeleton
cd ..
git checkout -- templates/skeleton/
rm -f templates/skeleton/app/lib/[any-added-files]

# Apply recipe
cd cookbook
npm run cookbook -- apply --recipe [recipe-name]

# Test applied recipe
cd ../templates/skeleton
npm run codegen
npm run typecheck
npm run build
npm run dev
# Test in browser
npm run preview
```

### Validation Checklist
- [ ] Recipe applies without errors
- [ ] TypeScript compiles
- [ ] Build completes
- [ ] Dev server starts
- [ ] Preview shows expected functionality
- [ ] No console errors
- [ ] Feature works as expected

### Gate Requirements ✓
- [ ] All tests pass
- [ ] Functionality verified
- [ ] No regression issues

### User Confirmation
```
Validation complete:
✓ Recipe applies cleanly
✓ All tests pass
✓ Feature works

Ready to refine metadata?
[Continue? Y/N]
```

---

## 📝 PHASE 5: REFINEMENT

### Goal
Polish recipe metadata and documentation.

### Actions
1. Update recipe.yaml metadata
2. Add meaningful descriptions
3. Document requirements
4. Add helpful notes

### Recipe Metadata Template
```yaml
gid: [generate-uuid]
title: [Feature Name]
summary: [One-line description]
description: |
  [Detailed description of what the recipe does]
  
  Key features:
  1. [Feature 1]
  2. [Feature 2]
  
notes:
  - [Important note 1]
  - [Important note 2]
requirements: |
  [Prerequisites and knowledge needed]
```

### After Metadata Updates
```bash
# Regenerate with updated metadata
cd cookbook
npm run cookbook -- regenerate --recipe [recipe-name] --format github

# This updates README.md and LLM prompts
```

### Gate Requirements ✓
- [ ] Metadata complete
- [ ] Description clear
- [ ] Requirements documented
- [ ] README regenerated

### User Confirmation
```
Metadata refined and documentation updated.

Ready for final verification?
[Continue? Y/N]
```

---

## 🚀 PHASE 6: FINAL VERIFICATION

### Goal
Complete end-to-end validation.

### Actions
1. Fresh recipe application
2. Full test suite
3. Manual testing
4. Browser verification

### Final Test Protocol
```bash
# Clean start
git checkout -- templates/skeleton/
cd cookbook

# Apply fresh
npm run cookbook -- apply --recipe [recipe-name]

# Full test suite
cd ../templates/skeleton
npm run typecheck
npm run lint
npm run build
npm run dev

# Browser test
# - Visit localhost:3000
# - Verify feature visible
# - Test functionality
# - Check console for errors
```

### HTTP Testing (if applicable)
```bash
# Test specific endpoints
curl http://localhost:3000/
curl http://localhost:3000/[feature-route]
```

### Gate Requirements ✓
- [ ] Fresh application works
- [ ] All tests pass
- [ ] Manual testing complete
- [ ] No console errors
- [ ] Feature fully functional

### User Confirmation
```
Final verification complete:
✓ Recipe production-ready
✓ All systems operational

Ready to commit?
[Continue? Y/N]
```

---

## 💾 PHASE 7: COMMIT

### Goal
Finalize and commit the recipe.

### Actions
1. Reset skeleton (important!)
2. Stage recipe files
3. Commit with descriptive message

### Commands
```bash
# Reset skeleton first
git checkout -- templates/skeleton/

# Stage recipe files
git add cookbook/recipes/[recipe-name]/
git add cookbook/llms/[recipe-name].prompt.md

# Commit
git commit -m "Add [recipe-name] cookbook recipe

Adds a new cookbook recipe demonstrating [feature description].
The recipe shows:

- [Key feature 1]
- [Key feature 2]
- [Key feature 3]

[Additional context about use cases]"
```

### Gate Requirements ✓
- [ ] Skeleton reset
- [ ] Recipe files staged
- [ ] Commit message descriptive
- [ ] No unintended changes

---

## 📍 DIRECTORY NAVIGATION GUIDE

### Critical Paths
```bash
# Project root
/path/to/hydrogen-recipe-third-party-api/

# Cookbook directory (for recipe commands)
/path/to/hydrogen-recipe-third-party-api/cookbook/

# Skeleton template (for testing)
/path/to/hydrogen-recipe-third-party-api/templates/skeleton/

# Examples directory
/path/to/hydrogen-recipe-third-party-api/examples/
```

### Navigation Commands
```bash
# From anywhere, return to project root
cd $(git rev-parse --show-toplevel)

# Navigate to cookbook from root
cd cookbook

# Navigate to skeleton from root
cd templates/skeleton

# Navigate to cookbook from skeleton
cd ../../cookbook

# Always verify your location
pwd
```

### Common Navigation Mistakes
- Running `npm run cookbook` from skeleton directory (won't work)
- Running `npm run typecheck` from cookbook directory (won't work)
- Using relative paths incorrectly (e.g., `cd cookbook` when already in cookbook)
- Forgetting to return to root before navigating elsewhere

## 🔧 TROUBLESHOOTING

### Issue: "Template folder has uncommitted changes"
```bash
# Solution: Reset skeleton before regenerating
git checkout -- templates/skeleton/
rm -f templates/skeleton/app/lib/[added-files]
```

### Issue: TypeScript errors after applying recipe
```bash
# Check for missing types
npm run typecheck

# Common fixes:
# 1. Install missing @types packages
# 2. Update component prop types
# 3. Fix import paths
```

### Issue: Patch fails to apply
```bash
# Regenerate the specific patch
cd cookbook
npm run cookbook -- generate --recipe [name] --filePath [file]
```

### Issue: Recipe validation fails
```bash
# Run validation with details
npm run cookbook -- validate --recipe [name]

# Check each step individually
npm run cookbook -- apply --recipe [name]
cd ../templates/skeleton
npm run typecheck  # Fix type errors first
npm run build      # Then build errors
```

### Issue: Circular dependency in context
```typescript
// Fix: Ensure proper type augmentation
declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}
}
```

## 📚 COOKBOOK COMMANDS REFERENCE

### Generate Recipe
```bash
npm run cookbook -- generate --recipe [name]
# Creates recipe from current skeleton changes
# IMPORTANT: Use this when skeleton has new changes to capture
```

### Apply Recipe
```bash
npm run cookbook -- apply --recipe [name]
# Applies recipe to skeleton template
```

### Regenerate Recipe
```bash
npm run cookbook -- regenerate --recipe [name] --format github
# ONLY for updating documentation/metadata when recipe.yaml changes
# Does NOT capture new skeleton changes - use generate instead
```

### Validate Recipe
```bash
npm run cookbook -- validate --recipe [name]
# Full validation including build and typecheck
```

### Render Documentation
```bash
npm run cookbook -- render --recipe [name] --format github
# Updates README.md from recipe.yaml
```

## 📚 BEST PRACTICES FROM EXPERIENCE

### Investigation Phase
1. **Always search for EXAMPLE UPDATE blocks first** - These are your primary targets
2. **Count the blocks** - Know exactly how many modifications you need to make
3. **Check if "new" files are actually modified skeleton files** - Examples often copy entire skeleton files with small changes

### Integration Phase
1. **Extract ONLY the example blocks** - Don't copy entire functions if only part changes
2. **Remove the markers** - EXAMPLE UPDATE comments should not appear in final skeleton
3. **Add @description comments** - Replace markers with meaningful descriptions
4. **Test after EVERY file modification** - Don't wait until all changes are done

### Recipe Generation
1. **Always reset skeleton first** - `git checkout -- templates/skeleton/`
2. **Verify patches were created** - Check `ls -la recipes/[name]/patches/`
3. **Count patches match modifications** - Should have one patch per modified file
4. **Use generate, not regenerate** - `generate` captures new skeleton changes, `regenerate` only updates docs

### Validation Phase
1. **Always run in this order**:
   - `npm run codegen` (regenerate types)
   - `npm run typecheck` (verify types)
   - `npm run build` (ensure it bundles)
2. **Reset skeleton between tests** - Don't test on already modified skeleton

### Documentation
1. **Update metadata before regenerating** - Edit recipe.yaml first
2. **Use `render` not `regenerate`** - For documentation updates only
3. **Include implementation notes** - Help users understand the approach

## 🎯 SUCCESS METRICS

A successful migration achieves:
- ✅ Recipe applies cleanly to skeleton
- ✅ TypeScript compilation passes
- ✅ Build completes without errors
- ✅ Dev server runs without issues
- ✅ Preview shows working feature
- ✅ Documentation is clear and complete
- ✅ Recipe is reusable and maintainable

## 📋 FINAL CHECKLIST

Before considering migration complete:
- [ ] All phases completed with gates passed
- [ ] Recipe tested on clean skeleton
- [ ] Documentation accurate and helpful
- [ ] Commit message descriptive
- [ ] No skeleton changes left uncommitted
- [ ] Recipe follows cookbook conventions
- [ ] LLM prompt file generated

---

**Remember:** Excellence comes from systematic migration, not speed. Each phase ensures a production-ready, reusable recipe that helps the Hydrogen community.