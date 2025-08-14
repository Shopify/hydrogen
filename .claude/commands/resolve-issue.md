# GitHub Issue Resolution Automation Prompt - Hydrogen

## 🔴 CRITICAL SAFETY REQUIREMENTS 🔴

```
ABSOLUTE RULES - NO EXCEPTIONS:
1. NEVER auto-commit without showing diff first
2. NEVER auto-push without explicit approval
3. NEVER create PR without showing content
4. ALWAYS use double-check system for git operations
5. ALWAYS provide BEFORE/AFTER validation report
6. ALWAYS wait for explicit "yes" before git commands
7. User must be in FULL CONTROL at all times
```

## INITIAL SETUP

### Repository Context
You are working in the Shopify Hydrogen repository, a monorepo with multiple packages:
- `@shopify/hydrogen` - Core Hydrogen framework
- `@shopify/cli-hydrogen` - CLI plugin for Shopify CLI
- `@shopify/hydrogen-react` - React components and hooks
- `@shopify/mini-oxygen` - Local development server
- `@shopify/remix-oxygen` - Remix adapter for Oxygen
- `@shopify/hydrogen-codegen` - GraphQL codegen utilities
- `@shopify/create-hydrogen` - Project scaffolding

### Investigation Tools
```
CRITICAL TOOLS FOR INVESTIGATION:
- Grep/Glob: Search for code patterns
- WebSearch: Verify API behavior when docs unclear
  Example: "Shopify Storefront API [feature] format response"
- Read: Always read test files to verify they match reality
- Bash: Use gh api commands to check real API responses

CRITICAL: Search for TODO/FIXME/NOTE comments:
- grep -n "TODO\|FIXME\|NOTE" [file] 
- These reveal maintainer intentions
- May indicate your fix is temporary

CRITICAL: Git History Commands (USE THESE!):
- git blame -L[start],[end] [file] - Who wrote this and why?
- git log -p --follow [file] - Full history with diffs
- git log --grep="[keyword]" --all - Find related changes
- gh pr list --search "[file]" - Find PR discussions
- git log -S "[code]" --all - When was this code introduced?
```

### Code Change Presentation
```
ALWAYS present code changes as unified diffs:
- Use diff format: @@ -line,count +line,count @@
- Show removed lines with -
- Show added lines with +
- Include context lines for clarity
- This matches GitHub PR review format
- Makes changes explicit and reviewable
```

### Available Commands Reference
```bash
# Build commands
npm run build           # Build all packages
npm run build:pkg       # Build packages only
npm run build:templates # Build templates
npm run build:examples  # Build examples

# Testing commands
npm run test            # Run all tests in parallel
npm run test:watch      # Run tests in watch mode
npm test -- [package]  # Test specific package

# Code quality
npm run lint            # ESLint check
npm run format          # Prettier format
npm run format:check    # Prettier check
npm run typecheck       # TypeScript check
npm run ci:checks       # Run all CI checks (lint, test, format, typecheck)

# Development
npm run dev             # Start package development
npm run dev:app         # Run skeleton template

# Changesets
npm run changeset add   # Create a new changeset
npm run version         # Apply version updates
```

## PHASE 1: Issue Retrieval and Package Routing

### Step 1.1: Issue Identification
```
WHEN: User provides GitHub issue (URL or number)
ACTION: 
- Extract issue number from input
- If URL provided: parse repository (should be Shopify/hydrogen)
- If number only: assume Shopify/hydrogen repository
- Fetch issue using: gh issue view [number] --repo Shopify/hydrogen --json title,body,labels,comments,author,assignees,milestone,state

CHECK ISSUE STATE:
- Has label "needs-more-info"? → Previous analysis requested info
- Recent comments from author? → May contain requested information
- No recent activity? → May be new issue or stale
```

### Step 1.2: Determine Affected Package(s)
```
ACTION: Analyze issue to identify which package(s) are affected

DETECTION METHODS:
1. Check issue labels ("pkg:hydrogen", "pkg:cli", etc.)
2. Parse "Which package or tool" field from bug template
3. Analyze error messages and stack traces
4. Examine code snippets for imports and function calls
5. Look for keywords and patterns:

PACKAGE ROUTING RULES:
- @shopify/hydrogen-react:
  * Keywords: parseMetafield, Money, ProductForm, useCart, useMoney
  * Imports from '@shopify/hydrogen-react'
  * Component/hook issues without SSR
  
- @shopify/cli-hydrogen:
  * Keywords: init, scaffold, dev, build, deploy, upgrade, codegen
  * CLI command errors
  * Project creation issues
  
- @shopify/hydrogen:
  * Keywords: loader, action, meta, defer, Remix, routing, SSR
  * Hydration errors
  * SEO components
  
- @shopify/mini-oxygen:
  * Keywords: dev server, port, localhost, HMR
  * Local development issues
  
- @shopify/remix-oxygen:
  * Keywords: session, cache, headers, Oxygen deployment
  * Adapter-specific issues
  
- @shopify/hydrogen-codegen:
  * Keywords: GraphQL types, codegen, schema
  * Type generation errors

IF single package identified:
  → Route to package-specific prompt
IF multiple packages:
  → Continue with this general prompt
IF unclear:
  → Present analysis and ask operator
```

### Step 1.2.5: Information Sufficiency Pre-Check
```
BEFORE routing to package expert:

QUICK CHECK for obvious missing information:
- [ ] No code examples at all?
- [ ] No error messages when reporting errors?
- [ ] No version information?
- [ ] Vague problem description?

IF obviously insufficient:
  → Create general information request
  → Don't route to package expert yet
  → Wait for author response

IF potentially sufficient:
  → Route to package expert for detailed analysis
  → Expert will determine if more info needed
```

### Step 1.3: Package Expert Handoff
```
CHECKPOINT: Package Routing Decision

PRESENT:
╔══════════════════════════════════════════════════╗
║ Issue Analysis Complete                         ║
╠══════════════════════════════════════════════════╣
║ Issue #[number]: [title]                        ║
║ Package Detected: [package-name]                ║
║ Confidence: [High/Medium/Low]                   ║
║                                                  ║
║ Evidence:                                        ║
║ - [Evidence point 1]                             ║
║ - [Evidence point 2]                             ║
║                                                  ║
║ Routing to: [resolve-{package}-issue.md]        ║
╚══════════════════════════════════════════════════╝

QUESTION: Proceed with package-specific expert prompt?
AWAIT: Operator confirmation

IF confirmed:
  HANDOFF: The package-specific prompt will now:
  1. Verify sufficient information
  2. Perform deep investigation
  3. Determine if it's a real issue
  4. Generate and analyze solutions
  5. Get approval and implement
  6. Create PR
  
  OR if insufficient info:
  1. Identify missing information
  2. Create detailed request comment
  3. Post to issue (with approval)
  4. Mark as pending-info
```

## PHASE 2: Multi-Package Coordination

**NOTE**: This phase only applies when multiple packages are affected.
For single-package issues, the package-specific prompt handles everything.

### When Multiple Packages Are Involved

### Step 2.1: Issue Decomposition
```
ACTION:
- Extract from bug report template fields:
  * Which package/tool affected
  * Version information
  * Steps to reproduce
  * Expected vs Actual behavior
  * Example repository (if provided)
- Identify acceptance criteria (explicit or implied)
- Determine if this requires:
  * Code changes
  * Documentation updates
  * Test additions
  * Changeset creation
```

### Step 2.2: Package-Specific Investigation
```
ACTION: Route to appropriate package context

IF package == "@shopify/hydrogen":
  - Check for Remix/React Router implications
  - Review Storefront API usage
  - Consider SSR/hydration aspects
  
IF package == "@shopify/cli-hydrogen":
  - Check CLI command structure
  - Review oclif configurations
  - Consider Shopify CLI integration
  - IMPORTANT: Changes may require skeleton updates
  
IF package == "@shopify/hydrogen-react":
  - Focus on component/hook implementation
  - Check for React version compatibility
  
IF package == "@shopify/mini-oxygen":
  - Review Workerd/Miniflare configurations
  - Check for local dev server impacts

SEARCH for related code:
- Use ripgrep for error messages
- Search for function/component names
- Check test files for existing coverage
```

### Step 2.3: Hidden Implications Analysis
```
THINK: What hasn't the issue told us?

CHECK:
- Will this affect other packages in the monorepo?
- Are there similar patterns elsewhere that need fixing?
- Could this break existing Hydrogen apps?
- Does this impact:
  * Performance (bundle size, runtime)
  * TypeScript types
  * GraphQL operations
  * Oxygen deployment
  * Developer experience
- Is there a Storefront API version dependency?
- Will this require migration documentation?

CHECKPOINT: Present hidden implications found
AWAIT: Operator acknowledgment
```

## PHASE 3: Solution Generation

### Step 3.1: Generate Multiple Solutions
```
ACTION: Generate 3-5 distinct approaches

For each solution provide:
1. Technical approach
2. Files requiring modification (with paths)
3. Packages affected
4. Complexity (1-5)
5. Estimated time
6. Risk assessment

Example format:
Solution A: [Name]
- Approach: [Description]
- Files: 
  * packages/hydrogen/src/[file].tsx
  * packages/hydrogen/src/[file].test.tsx
- Complexity: 3/5
- Time: ~2 hours
- Risk: Low - isolated change
```

### Step 3.2: Side Effects Analysis
```
FOR EACH solution analyze:

Breaking Changes:
- API changes that affect existing apps
- Required migration steps
- Backward compatibility concerns

Dependencies:
- Other packages that import this code
- Templates/examples that use this feature
- Documentation that needs updating

Performance:
- Bundle size impact
- Runtime performance
- Build time changes

Testing:
- New tests required
- Existing tests that might break
- E2E test implications
```

### Step 3.3: Trade-off Matrix
```
Present comparison:

| Solution | Pros | Cons | Breaking | Effort | Risk | Recommended |
|----------|------|------|----------|--------|------|-------------|
| A        | ...  | ...  | No       | Low    | Low  | ✓           |
| B        | ...  | ...  | Yes      | High   | Med  |             |

CHECKPOINT: Present full analysis with recommendation
AWAIT: Operator selection of solution
```

## PHASE 4: Approval Checkpoint

### Step 4.1: Clarify Implementation Details
```
CHECKPOINT: Before proceeding, confirm:

1. Solution understanding:
   - [ ] Operator agrees with selected approach
   - [ ] Scope boundaries are clear
   - [ ] Breaking changes are acceptable

2. Implementation details:
   - [ ] Which packages need changesets?
   - [ ] What type of version bump (patch/minor/major)?
   - [ ] Any post-merge steps required?

3. Testing approach:
   - [ ] Unit tests to add/modify
   - [ ] Integration tests needed?
   - [ ] Manual testing steps

AWAIT: Explicit approval to proceed
```

### Step 4.2: List All Assumptions
```
ACTION: Present assumptions for validation

Technical assumptions:
- [List any technical assumptions]

Process assumptions:
- Changeset will be created for affected packages
- Tests will be added for new functionality
- No documentation site updates needed (unless specified)

CHECKPOINT: Confirm all assumptions
AWAIT: Operator confirmation or correction
```

## PHASE 5: Execution Planning

### Step 5.1: Create Detailed Execution Plan
```
ACTION: Create step-by-step plan

1. Setup Phase:
   - [ ] Create feature branch
   - [ ] Ensure clean working tree
   - [ ] Pull latest main branch

2. Implementation Phase:
   For each file change:
   - [ ] File: [path]
     * Current state: [describe]
     * Change needed: [describe]
     * Verification: [how to verify]

3. Testing Phase:
   - [ ] Write/update unit tests
   - [ ] Run package tests: npm test -- [package]
   - [ ] Run integration tests if applicable

4. Quality Phase:
   - [ ] Run linting: npm run lint
   - [ ] Run typecheck: npm run typecheck
   - [ ] Run format: npm run format
   - [ ] Verify CI checks: npm run ci:checks

5. Documentation Phase:
   - [ ] Update inline documentation
   - [ ] Update README if needed
   - [ ] Add migration notes if breaking

6. Changeset Phase:
   - [ ] Create changeset: npm run changeset add
   - [ ] Select affected packages
   - [ ] Choose version bump type
   - [ ] Write changeset description

CHECKPOINT: Review execution plan
AWAIT: Approval to begin implementation
```

## PHASE 6: Implementation

### Step 6.1: Branch Creation
```
ACTION:
- Create branch: git checkout -b fix/[number]-[brief-description]
- Example: git checkout -b fix/3042-hydrogen-build-error

CHECKPOINT: Confirm branch created
AWAIT: Proceed confirmation
```

### Step 6.2: Step-by-Step Execution
```
FOR EACH task in execution plan:

CHECKPOINT: About to [describe task]
Show exactly what will be changed:
- File: [path]
- Current code: [show]
- New code: [show]

AWAIT: Operator approval for this specific change

ACTION: 
- Implement the change
- Save the file
- Run immediate verification (if applicable)

CONFIRM: Change complete, any issues?
AWAIT: Confirmation to continue
```

### Step 6.3: Testing Verification
```
CHECKPOINT: Ready to run tests

ACTION:
1. Run affected package tests:
   npm test -- packages/[package-name]
   
2. If tests fail:
   - Show failure output
   - AWAIT: Guidance on fixing
   
3. Run full CI checks:
   npm run ci:checks
   
CHECKPOINT: All tests passing?
AWAIT: Confirmation to proceed
```

### Step 6.4: Changeset Creation
```
🔴 CRITICAL: NEVER CREATE CHANGESET WITHOUT EXPLICIT USER INPUT 🔴

CHECKPOINT: Ready to create changeset

MANDATORY USER QUESTIONS:
1. ASK: "Which packages should be included in the changeset?"
   - Show list of modified packages
   - AWAIT: User specifies packages
   
2. ASK: "What type of version bump for each package?"
   - patch: backwards compatible bug fixes
   - minor: backwards compatible features  
   - major: breaking changes
   - AWAIT: User specifies version bump type for EACH package

3. ASK: "Here's my proposed changeset description. Should I modify it?"
   ```
   Fixed [issue description] in [component/feature]
   
   - [Specific change 1]
   - [Specific change 2]
   
   Fixes #[issue-number]
   ```
   - AWAIT: User approval or modifications

ONLY AFTER ALL APPROVALS:
- Run: npm run changeset add
- Select the user-specified packages
- Choose the user-specified version bump types
- Enter the approved description

CHECKPOINT: Show created changeset file content
AWAIT: Final approval of changeset
```

### Step 6.5: Implementation Validation Report
```
📊 MANDATORY BEFORE/AFTER REPORT

CREATE AND PRESENT:

## Fix Validation Report

### What Changed
| Aspect | BEFORE Fix | AFTER Fix |
|--------|------------|-----------|  
| Behavior | [How it failed] | [How it works] |
| Error | [Error message] | [No error] |
| Output | [Wrong output] | [Correct output] |
| Types | [Type issues] | [Type safe] |

### How to Validate This Fix

#### See the problem (BEFORE):
```bash
git checkout main
[exact commands to reproduce]
```
EXPECTED ERROR: [what you'll see]

#### Verify the fix (AFTER):
```bash  
git checkout [fix-branch]
[same commands]
```
EXPECTED SUCCESS: [correct behavior]

#### Run Tests:
```bash
npm test -- [specific test]
```
EXPECTED: All tests pass

CHECKPOINT: Satisfied with this fix?
AWAIT: Approval to proceed with PR
```

## PHASE 7: Pull Request Creation

### Step 7.1: Pre-PR Checklist
```
VERIFY all items checked:
- [ ] All tests passing
- [ ] Linting passing (npm run lint)
- [ ] TypeScript passing (npm run typecheck)
- [ ] Formatted (npm run format)
- [ ] Changeset created
- [ ] No unintended changes (git diff)

CHECKPOINT: Ready to commit and push?
AWAIT: Final approval
```

### Step 7.2: Commit and Push (DOUBLE APPROVAL REQUIRED)
```
🔴 CRITICAL: NO AUTO-COMMIT/PUSH 🔴

DOUBLE CHECK SYSTEM:

1. STAGE & REVIEW:
   git add .
   git status
   SHOW: List of staged files
   CHECKPOINT 1: "These files correct?"
   AWAIT: Approval

2. REVIEW DIFF:
   git diff --staged
   SHOW: Complete diff of changes
   CHECKPOINT 2: "Changes look good?"
   AWAIT: Approval

3. COMMIT (with approval):
   SHOW: "Commit message: Fix: #[number] - [description]"
   CHECKPOINT 3: "Use this message?"
   AWAIT: Explicit "yes"
   THEN: git commit -m "[message]"

4. PUSH (final approval):
   SHOW: "Push to: origin/fix/[number]-[description]"
   CHECKPOINT 4: "FINAL: Push to remote?"
   AWAIT: Explicit "yes"
   THEN: git push -u origin [branch]

CONFIRM: Branch pushed successfully
```

### Step 7.3: Create Pull Request
```
ACTION: Create PR using GitHub template

gh pr create --title "Fix: #[number] - [issue title]" --body "
### WHY are these changes introduced?

Fixes #[number]

[Explain the problem this PR solves]

### WHAT is this pull request doing?

[Summary of changes]
- [Change 1]
- [Change 2]

### HOW to test your changes?

1. [Step 1]
2. [Step 2]
3. [Verify expected behavior]

#### Checklist

- [x] I've read the Contributing Guidelines
- [x] I've considered possible cross-platform impacts (Mac, Linux, Windows)
- [x] I've added a changeset
- [x] I've added tests to cover my changes
- [ ] I've added or updated the documentation
"

CHECKPOINT: Review PR before submitting
AWAIT: Approval to create PR
```

## PHASE 8: Success Verification

### Step 8.1: Final Confirmation
```
ACTION:
- Provide PR URL
- Confirm issue is linked
- Verify CI is running

SUCCESS CRITERIA MET:
✓ Issue analyzed thoroughly
✓ Solution implemented with operator approval
✓ Tests passing
✓ Changeset created
✓ PR created and linked to issue
✓ CI checks initiated

CHECKPOINT: Task complete - PR ready for review
```

## ERROR HANDLING

### At Any Phase:
```
IF error occurs:
  STOP immediately
  SHOW: Full error message
  ASK: How should we proceed?
  AWAIT: Operator guidance

IF uncertainty > 30%:
  STOP and state: "I'm uncertain about [specific thing]"
  PROVIDE: What I know and what I'm unsure about
  AWAIT: Clarification

IF multiple interpretations possible:
  LIST: All possible interpretations
  ASK: Which interpretation is correct?
  AWAIT: Selection
```

## HANDLING INSUFFICIENT INFORMATION

### Common Information Gaps

1. **"It doesn't work" issues**:
   - Need: Specific error messages or unexpected behavior
   - Need: What they expected vs what happened
   - Need: Steps to reproduce

2. **Missing reproduction**:
   - Need: Minimal code example
   - Need: Or repository demonstrating issue
   - Need: Or at least the relevant code snippets

3. **Version ambiguity**:
   - Need: Exact package versions
   - Need: Node version
   - Need: Build tool and version

4. **Intermittent issues**:
   - Need: Frequency of occurrence
   - Need: Any patterns noticed
   - Need: Browser/environment where it happens

### Information Request Best Practices

```
DO:
✓ Be specific about what you need
✓ Explain why you need it
✓ Provide examples of good responses
✓ Thank them for their report
✓ Be friendly and helpful

DON'T:
✗ Be dismissive or condescending
✗ Ask for everything at once
✗ Use technical jargon without explanation
✗ Close issue immediately
```

### Follow-up Protocol

```
AFTER posting information request:

1. Add label: "needs-more-info"
2. Set mental note: Check back in 3-7 days
3. If no response in 2 weeks:
   - Gentle reminder comment
   - Mention issue may be closed as stale
4. If no response in 30 days:
   - Consider closing with note about reopening
```

## PACKAGE-SPECIFIC PROMPTS

### IMPORTANT INVESTIGATION PRINCIPLES

1. **Never Trust Test Data Without Verification**
   - Tests often use idealized/incorrect mock data
   - Always compare to actual API responses
   - Update tests when they don't match reality

2. **Look for Patterns, Not Just Point Fixes**
   - If one function has an issue, similar functions might too
   - Check related code for the same problem
   - Think systemically, not just about the reported issue

3. **Use WebSearch for API Verification**
   - When Storefront API behavior is unclear
   - When documentation is missing or ambiguous
   - To verify field formats and response structures

4. **Always Check TODO/FIXME Comments**
   - Read ±20 lines around affected code
   - TODO comments reveal planned improvements
   - FIXME indicates known issues
   - Your solution might conflict with maintainer plans
   - Consider if a minimal fix is better than comprehensive change

5. **Deep Dive into Git History** 🔍
   - NEVER modify code without understanding its history
   - Read commit messages going back YEARS if needed
   - Look for reverted changes - they indicate tricky areas
   - PR discussions have more context than commits
   - Architectural decisions are hidden in old commits
   - Search for: "because", "due to", "reverts", "performance"
   - Check if similar fixes were tried and failed

### Route to package-specific prompt based on affected package:
- If issue affects @shopify/hydrogen → Use resolve-hydrogen-issue.md
- If issue affects @shopify/cli-hydrogen → Use resolve-cli-issue.md
- If issue affects @shopify/hydrogen-react → Use resolve-hydrogen-react-issue.md
- If issue affects @shopify/mini-oxygen → Use resolve-mini-oxygen-issue.md
- If issue affects @shopify/remix-oxygen → Use resolve-remix-oxygen-issue.md
- If issue affects @shopify/hydrogen-codegen → Use resolve-codegen-issue.md
- If issue affects multiple packages → Use this general prompt

## IMPORTANT REMINDERS

1. **ALWAYS get confirmation** before making changes
2. **NEVER assume** - ask for clarification when uncertain
3. **Create changesets** for all code changes
4. **Follow PR template** structure exactly
5. **Test everything** before creating PR
6. **Check for side effects** in other packages
7. **Consider breaking changes** impact on users
8. **Update skeleton** if CLI changes affect scaffolding