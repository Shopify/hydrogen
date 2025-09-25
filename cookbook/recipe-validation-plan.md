# Recipe Validation Plan - Meta Process Guide

Generated on: 2025-09-25  
**Purpose:** Document systematic patterns for identifying and resolving any cookbook recipe validation failure

## Current State Analysis

**Validation Results:** 13/14 recipes valid, 1 invalid (express)  
**Key Finding:** Single point of failure provides clear pattern for systematic resolution

## Meta-Patterns for Recipe Failure Analysis

### 1. Failure Classification Framework

All recipe failures fall into these categories:

**A. Patch Application Failures**
- Hunk rejection (patch context doesn't match current skeleton)
- Line number drift (skeleton evolved, patches reference old line numbers)
- File replacement conflicts (wholesale changes vs current state)

**B. Runtime Failures** 
- Type errors after patches apply
- Build failures due to missing dependencies
- Import/export mismatches

**C. Validation Process Failures**
- npm install failures
- codegen failures 
- Test execution failures

### 2. Systematic Diagnosis Process

**Step 1: Classify the Failure Type**
```bash
# Look for these indicators in validation output:
# "X out of Y hunks FAILED" → Patch Application Failure
# "TypeScript error" → Runtime Failure  
# "npm install failed" → Validation Process Failure
```

**Step 2: Identify Failure Scope**
- Single file vs multiple files
- Single hunk vs multiple hunks
- Isolated change vs cascading dependencies

**Step 3: Determine Root Cause Category**
- **Skeleton Evolution**: Current skeleton differs from patch expectations
- **Dependency Changes**: Package versions or APIs changed
- **Structural Changes**: File organization or component architecture changed

### 3. Resolution Strategy Framework

**For Patch Application Failures:**

**Strategy A: Context Adjustment**
- When: Line numbers are off but content structure is similar
- Action: Update patch line numbers and context lines
- Validation: Patch applies cleanly without .orig/.rej files

**Strategy B: Content Modernization** 
- When: Patch expects old patterns that no longer exist
- Action: Update patch content to match current skeleton patterns
- Validation: Functionality preserved with modern implementation

**Strategy C: Approach Redesign**
- When: Wholesale replacement conflicts with evolved skeleton
- Action: Break large patches into smaller, targeted changes
- Validation: Same end result achieved incrementally

## Process-Driven Workflow

### Phase 1: Comprehensive Baseline Analysis

```bash
# Always start with full validation to capture ALL issues
npm run cookbook -- validate 2>&1 | tee validation-baseline-$(date +%Y%m%d).log

# Extract failure patterns
grep -E "(FAILED|failed|Error)" validation-baseline-*.log
```

### Phase 2: Per-Recipe Failure Analysis  

```bash
# For each failing recipe, run isolated validation
npm run cookbook -- validate --recipe [RECIPE_NAME] 2>&1 | tee [RECIPE_NAME]-detailed-failure.log

# Identify specific failure points
grep -A 10 -B 5 "FAILED\|Error" [RECIPE_NAME]-detailed-failure.log
```

### Phase 3: Pattern Recognition

**Document for each failure:**
- **Failure Type:** (Patch/Runtime/Process)
- **Scope:** (Single file/Multiple files)
- **Root Cause:** (Evolution/Dependencies/Structure)
- **Affected Components:** (Which skeleton parts are involved)

### Phase 4: Resolution Approach Selection

**Decision Matrix:**
- Small drift (1-5 line offset) → Context Adjustment
- API/Import changes → Content Modernization  
- Large file replacements → Approach Redesign

### Phase 5: Systematic Fix Implementation

```bash
# Standard sequence for any recipe fix:

# 1. Clean skeleton state
git -C ../templates/skeleton clean -fd
git -C ../templates/skeleton restore .

# 2. Apply fix attempt
# [Apply chosen resolution strategy]

# 3. Validate fix
npm run cookbook -- validate --recipe [RECIPE_NAME]

# 4. Ensure no artifacts remain
find ../templates/skeleton -name "*.orig" -o -name "*.rej" | wc -l
# Should return 0

# 5. Full workflow test if validation passes
cd ../templates/skeleton && npm run typecheck && npm run build
```

## Failure Pattern Recognition

### High-Risk Indicators

**In Validation Logs:**
- "X out of Y hunks FAILED" - Immediate attention required
- "saving rejects to *.rej" - Manual intervention needed
- "Backup file created: *.orig" - Line number/context mismatch

**In Patch Content:**
- Very large hunks (>100 lines) - High fragility risk
- Complete file replacements - Evolution conflict risk
- Import-heavy changes - Dependency drift risk

### Success Indicators

**Clean Application:**
- All patches apply without .orig/.rej files
- No "offset" or "fuzz" messages in patch output
- Validation completes all phases (install → codegen → typecheck → build)

## Preventive Framework

### Recipe Design Principles

1. **Granular Patches**: Prefer many small patches over few large ones
2. **Stable Contexts**: Use file sections less likely to change
3. **Additive Approach**: Add new files rather than replace existing when possible
4. **Dependency Awareness**: Account for framework evolution patterns

### Validation Discipline

1. **Regular Testing**: Validate recipes after skeleton updates
2. **Baseline Documentation**: Maintain current failure state awareness
3. **Pattern Recognition**: Build institutional knowledge of common failures
4. **Systematic Resolution**: Follow process consistently, don't skip steps

## Meta-Learning Application

### From Current State Analysis

**Pattern Identified:** Single CSS patch failure (complete file replacement)
**Root Cause Category:** Skeleton Evolution (current CSS structure ≠ patch expectations)  
**Resolution Strategy:** Approach Redesign (break replacement into targeted changes)

**Key Insight:** Large wholesale changes are fragile; incremental approaches are more maintainable.

### Generalizable Lessons

1. **File replacement patches are high-risk** - Always consider alternatives
2. **Evolution-resistant design** - Use stable parts of skeleton as anchors
3. **Validation completeness** - Always run full workflow, not just patch application
4. **Clean state discipline** - Artifacts (.orig/.rej) indicate unresolved issues

---

**Note:** This framework provides a systematic approach to diagnosing and resolving any cookbook recipe failure, regardless of the specific technical details. The key is following the process consistently and building pattern recognition over time.