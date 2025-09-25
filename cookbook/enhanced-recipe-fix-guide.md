# Enhanced Cookbook Recipe Fix Guide - Meta Process Framework

This guide provides a systematic, process-driven approach for fixing any cookbook recipe validation failure, regardless of the specific technical details involved.

## IMPORTANT: First Step for AI Assistant

**When using this guide, ALWAYS ask the user:**
```
Which recipe would you like to update to be compatible with the current skeleton template?
```

Wait for the user to specify a recipe name before proceeding with any steps.

## Meta-Process Overview

This guide uses a **failure-pattern-agnostic** approach that works for any type of recipe issue:

1. **Systematic Diagnosis** - Classify the failure type and scope
2. **Pattern Recognition** - Identify the root cause category  
3. **Strategy Selection** - Choose appropriate resolution approach
4. **Process-Driven Fix** - Apply systematic fix workflow
5. **Comprehensive Validation** - Ensure complete resolution

## Prerequisites

- **Working Directory:** Always work from the `/cookbook` folder
- **Clean Git State:** Ensure no uncommitted changes before starting
- **TodoWrite Tracking:** Use TodoWrite tool to track progress systematically

## Phase 1: Comprehensive Baseline Analysis

**Purpose:** Establish complete understanding of all failure points before attempting fixes.

### Step 1A: Run Full Validation Baseline

```bash
cd cookbook

# Clean skeleton to ensure fresh state
git -C ../templates/skeleton clean -fd
git -C ../templates/skeleton restore .

# CRITICAL: Run validation to get complete baseline (not apply!)
npx tsx src/index.ts validate --recipe [recipe-name] 2>&1 | tee validation-baseline-$(date +%Y%m%d-%H%M%S).log
```

### Step 1B: Classify Failure Type

Extract and classify failures using systematic analysis:

```bash
# Extract all failure indicators
grep -E "(FAILED|failed|Error|rejected)" validation-baseline-*.log

# Count failure artifacts
echo "=== FAILURE CLASSIFICATION ==="
grep -c "out of.*hunks FAILED" validation-baseline-*.log && echo "PATCH APPLICATION FAILURES"
find ../templates/skeleton -name "*.orig" | wc -l | xargs -I {} echo "{} offset/fuzz issues (.orig files)"
find ../templates/skeleton -name "*.rej" | wc -l | xargs -I {} echo "{} complete rejections (.rej files)" 
```

### Step 1C: Document Failure Patterns

For each failure, document:
- **Failure Type**: Patch Application / Runtime / Process
- **Scope**: Single file / Multiple files / Cascading
- **Severity**: Complete rejection / Offset application / Minor drift

## Phase 2: Root Cause Analysis Framework

### Step 2A: Identify Failure Category

**Category A: Skeleton Evolution**
- Current skeleton structure differs from patch expectations
- Indicators: Line number mismatches, context changes, file organization changes

**Category B: Dependency Changes** 
- Package versions, APIs, or import patterns have changed
- Indicators: Import errors, type mismatches, API deprecation

**Category C: Structural Changes**
- File architecture or component organization has changed
- Indicators: Missing files, moved components, refactored patterns

### Step 2B: Analyze Patch Content vs Current State

```bash
# For each failed patch, compare expectations vs reality
for patch_file in recipes/[recipe-name]/patches/*.patch; do
    echo "=== Analyzing $patch_file ==="
    
    # Extract target file from patch
    target_file=$(grep "^+++" "$patch_file" | head -1 | cut -d'/' -f2-)
    
    # Show what patch expects vs what exists
    echo "PATCH EXPECTS:"
    grep -A 5 -B 5 "^-" "$patch_file" | head -20
    
    echo "CURRENT SKELETON:"
    head -20 "../templates/skeleton/$target_file" 2>/dev/null || echo "File not found"
    
    echo "---"
done
```

## Phase 3: Strategy Selection Framework

Based on failure analysis, select appropriate resolution strategy:

### Strategy A: Context Adjustment
**When to use:** Line number drift, minor context changes
**Approach:** Update patch line numbers and context to match current skeleton
**Validation:** Patch applies cleanly without .orig/.rej files

### Strategy B: Content Modernization
**When to use:** API changes, import pattern updates, deprecated patterns
**Approach:** Update patch content to use current skeleton patterns
**Validation:** Functionality preserved using modern implementation

### Strategy C: Approach Redesign  
**When to use:** Large file replacements, structural conflicts, wholesale changes
**Approach:** Break large changes into smaller, targeted modifications
**Validation:** Same end result achieved through incremental approach

## Phase 4: Systematic Resolution Implementation

### Step 4A: Apply Selected Strategy

**For Strategy A (Context Adjustment):**
```bash
# 1. Find current line numbers for patch context
grep -n "CONTEXT_FROM_PATCH" ../templates/skeleton/[target-file]

# 2. Update patch file line number references
# Edit recipes/[recipe-name]/patches/[filename].patch
# Update @@ -X,Y +A,B @@ lines to match current positions

# 3. Test patch application
cd ../templates/skeleton
patch -p1 < ../cookbook/recipes/[recipe-name]/patches/[filename].patch --dry-run
```

**For Strategy B (Content Modernization):**
```bash
# 1. Identify current patterns in skeleton
grep -r "CURRENT_PATTERN" ../templates/skeleton/app/

# 2. Update patch content to match current patterns  
# Edit patch to use current import statements, API calls, etc.

# 3. Verify patch logic is preserved while updating implementation
```

**For Strategy C (Approach Redesign):**
```bash
# 1. Break large patch into smaller components
# Instead of replacing entire file, create targeted changes

# 2. Create multiple small patches for different aspects
# - One patch for imports
# - One patch for component changes  
# - One patch for styling updates

# 3. Test each component independently
```

### Step 4B: Incremental Validation

After each fix attempt:

```bash
# Clean skeleton state
git -C ../templates/skeleton clean -fd
git -C ../templates/skeleton restore .

# Test specific patch
cd ../templates/skeleton
patch -p1 < ../cookbook/recipes/[recipe-name]/patches/[filename].patch --verbose

# Check for artifacts (should be zero)
find . -name "*.orig" -o -name "*.rej" | wc -l

# If clean, test full recipe application
cd ../cookbook
npx tsx src/index.ts apply --recipe [recipe-name] --path ../templates/skeleton
```

## Phase 5: Complete Resolution Validation

### Step 5A: Full Workflow Test

Only proceed after all patches apply cleanly:

```bash
# Ensure skeleton is clean
git -C ../templates/skeleton clean -fd  
git -C ../templates/skeleton restore .

# Apply recipe
npx tsx src/index.ts apply --recipe [recipe-name] --path ../templates/skeleton

# CRITICAL: Verify no artifacts remain
find ../templates/skeleton -name "*.orig" -o -name "*.rej"
# Should return nothing

# Run complete validation workflow
cd ../templates/skeleton
npm install && npm run codegen && npm run typecheck && npm run build
```

### Step 5B: Generate Updated Recipe

Only after all tests pass:

```bash
cd ../cookbook

# IMPORTANT: Use 'generate' not 'regenerate'  
npx tsx src/index.ts generate --recipe [recipe-name]

# Final validation to ensure new patches work
git -C ../templates/skeleton clean -fd
git -C ../templates/skeleton restore .
npx tsx src/index.ts validate --recipe [recipe-name]
```

## Meta-Learning Integration

### Pattern Recognition Development

After each successful fix, document:
- **What failure pattern was encountered**
- **Which strategy was most effective** 
- **What skeleton evolution caused the issue**
- **How to recognize this pattern in future**

### Preventive Insights

**High-Risk Patterns to Avoid:**
- Complete file replacement patches
- Very large hunks (>100 lines)
- Import-heavy modifications
- Hard-coded line number dependencies

**Robust Design Principles:**
- Prefer additive changes over replacements
- Use stable skeleton sections as patch anchors
- Break complex changes into smaller components
- Design patches to be evolution-resistant

## Process Discipline Framework

### Critical Success Factors

1. **Always validate before attempting fixes** - Don't assume, measure
2. **Follow the systematic classification** - Don't skip diagnosis
3. **Clean state between tests** - Artifacts indicate incomplete resolution
4. **Complete workflow validation** - Patch application alone is insufficient
5. **Document patterns learned** - Build institutional knowledge

### Common Process Mistakes to Avoid

1. **Jumping to solutions** before understanding the failure pattern
2. **Fixing symptoms** instead of root causes  
3. **Skipping validation steps** to "save time"
4. **Leaving artifacts** (.orig/.rej files) unresolved
5. **Not testing complete workflow** after patch fixes

---

**Key Philosophy:** This guide treats recipe fixing as a systematic engineering discipline rather than ad-hoc problem solving. The meta-process adapts to any specific failure while maintaining consistent quality and completeness standards.