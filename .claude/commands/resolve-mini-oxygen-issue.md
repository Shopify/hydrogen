# Resolve @shopify/mini-oxygen Issues

## EXTENDS: resolve-issue.md
This prompt extends the base issue resolution prompt with package-specific knowledge for @shopify/mini-oxygen.

## PACKAGE CONTEXT

### Package Overview
- **Purpose**: Local development server simulating Oxygen runtime
- **Based on**: Workerd/Miniflare
- **Key Features**: Request handling, asset serving, HMR support
- **Integration**: Powers `shopify hydrogen dev` command

### Common Issue Categories
<!-- To be filled during trials -->
- [ ] Port binding issues
- [ ] Worker runtime errors
- [ ] Asset serving problems
- [ ] Environment variable handling
- [ ] Request/Response handling

### Common Code Locations
```
packages/mini-oxygen/src/
├── worker/           # Worker runtime code
├── server/           # Dev server implementation
├── assets/           # Asset handling
└── utils/            # Utilities
```

### Package-Specific Testing Commands
```bash
npm test -- packages/mini-oxygen
npm run typecheck -- --filter=./packages/mini-oxygen
```

## LEARNED PATTERNS
<!-- To be filled during trials -->

## TRIAL LOG
<!-- Track issues resolved -->