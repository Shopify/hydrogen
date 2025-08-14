# Resolve @shopify/hydrogen-codegen Issues

## EXTENDS: resolve-issue.md
This prompt extends the base issue resolution prompt with package-specific knowledge for @shopify/hydrogen-codegen.

## PACKAGE CONTEXT

### Package Overview
- **Purpose**: GraphQL codegen for Storefront API types
- **Key Features**: Type generation, fragment extraction, schema introspection
- **Integration**: Used by CLI for `shopify hydrogen codegen` command
- **Output**: TypeScript types for GraphQL operations

### Common Issue Categories
<!-- To be filled during trials -->
- [ ] Type generation errors
- [ ] Fragment parsing issues
- [ ] Schema version mismatches
- [ ] File path resolution
- [ ] Config file problems

### Common Code Locations
```
packages/hydrogen-codegen/src/
├── schema/           # Schema handling
├── generators/       # Code generators
├── parsers/          # GraphQL parsers
└── config/           # Configuration
```

### Package-Specific Testing Commands
```bash
npm test -- packages/hydrogen-codegen
npm run typecheck -- --filter=./packages/hydrogen-codegen
```

## LEARNED PATTERNS
<!-- To be filled during trials -->

## TRIAL LOG
<!-- Track issues resolved -->