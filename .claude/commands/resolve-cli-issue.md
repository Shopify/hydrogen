# Resolve @shopify/cli-hydrogen Issues

## EXTENDS: resolve-issue.md
This prompt extends the base issue resolution prompt with package-specific knowledge for @shopify/cli-hydrogen.

## PACKAGE CONTEXT

### Package Overview
- **Purpose**: Hydrogen CLI plugin for Shopify CLI
- **Framework**: oclif (CLI framework)
- **Key Feature**: Bundles skeleton template for scaffolding
- **Integration**: Plugin for @shopify/cli main package
- **Critical**: Changes often require TWO releases due to circular dependency

### Common Issue Categories
<!-- To be filled during trials -->
- [ ] Init/scaffolding issues
- [ ] Dev server problems
- [ ] Build command failures
- [ ] Deploy to Oxygen issues
- [ ] GraphQL codegen problems
- [ ] Environment/config issues
- [ ] Upgrade command issues

### Package-Specific Investigation Points
```
ALWAYS CHECK:
- oclif command structure
- Shopify CLI plugin integration
- Skeleton template bundling
- MiniOxygen integration
- GraphQL codegen setup
- Upgrade mechanism (changelog.json)
```

### Common Code Locations
```
packages/cli/src/
├── commands/
│   └── hydrogen/
│       ├── init.ts         # Project scaffolding
│       ├── dev.ts          # Development server
│       ├── build.ts        # Build command
│       ├── deploy.ts       # Oxygen deployment
│       ├── upgrade.ts      # Version upgrades
│       └── codegen.ts      # GraphQL codegen
├── lib/                    # Shared utilities
└── hooks/                  # oclif hooks
```

### CLI-SPECIFIC CRITICAL KNOWLEDGE
```
⚠️ SKELETON BUNDLING REQUIREMENT:
- The CLI bundles the skeleton template in dist/assets/templates
- ANY skeleton changes MUST include a CLI version bump
- Without this, new projects get outdated templates

⚠️ CIRCULAR DEPENDENCY:
@shopify/cli-hydrogen → bundles skeleton
skeleton → depends on @shopify/cli
@shopify/cli → includes @shopify/cli-hydrogen

This often requires TWO releases to fully update!
```

### Package-Specific Testing Commands
```bash
# Unit tests
npm test -- packages/cli

# Build CLI
npm run build:pkg -- --filter=./packages/cli

# Test CLI commands locally
cd packages/cli
npm link
shopify hydrogen [command]

# Generate manifest
cd packages/cli && npm run generate:manifest
```

## LEARNED PATTERNS
<!-- This section will grow as we resolve issues -->

### Issue Type: [Name]
**Pattern Recognition**:
**Common Root Causes**:
**Effective Solutions**:
**Tests to Add**:

---

## PHASE OVERRIDES

### Phase 2.2: Package-Specific Investigation
```
CLI-SPECIFIC CHECKS:
1. Check command implementation:
   - oclif command class structure
   - Flag and argument parsing
   - Error handling and user feedback
   
2. Check integrations:
   - MiniOxygen setup for dev command
   - GraphQL codegen configuration
   - Oxygen deployment API calls
   
3. Skeleton template impacts:
   - Does this affect scaffolded projects?
   - Need to update bundled template?
```

### Phase 5.1: Execution Planning
```
CLI-SPECIFIC PLANNING:
If changes affect skeleton:
1. Update skeleton template files
2. Create changeset for BOTH:
   - Skeleton changes
   - @shopify/cli-hydrogen bump
3. Plan for potential second release after @shopify/cli updates
```

### Phase 6.4: Changeset Creation
```
🔴 CRITICAL: NEVER CREATE CHANGESET WITHOUT EXPLICIT USER INPUT 🔴

MANDATORY USER QUESTIONS:
1. ASK: "Which packages should be included in the changeset?"
   - Show modified packages (likely @shopify/cli-hydrogen)
   - Note: MUST include @shopify/cli-hydrogen if skeleton changed
   - Consider if @shopify/create-hydrogen needs update
   - AWAIT: User specifies packages

2. ASK: "What type of version bump for each package?"
   - patch: backwards compatible bug fixes
   - minor: backwards compatible features
   - major: breaking changes
   - AWAIT: User specifies version bump type

3. ASK: "Here's my proposed changeset description. Should I modify it?"
   - Include any command behavior changes
   - AWAIT: User approval or modifications

ONLY AFTER ALL APPROVALS:
- Run: npm run changeset add
- Select the user-specified packages
- Choose the user-specified version bump types
- Enter the approved description
```

## COMMON GOTCHAS
<!-- To be populated during trials -->
- oclif requires specific class structure
- CLI commands run in user's project context
- Environment variables affect behavior
- Skeleton changes need CLI bump
- Upgrade command depends on changelog.json

## TRIAL LOG
<!-- Track what we learn from each issue -->
<!--
Issue #XXXX: [Brief description]
- Learned: [What we discovered]
- Added to prompt: [What section we enhanced]
-->