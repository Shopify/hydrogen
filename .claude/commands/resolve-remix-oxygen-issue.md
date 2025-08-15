# Resolve @shopify/remix-oxygen Issues

## EXTENDS: resolve-issue.md
This prompt extends the base issue resolution prompt with package-specific knowledge for @shopify/remix-oxygen.

## PACKAGE CONTEXT

### Package Overview
- **Purpose**: Remix adapter for Oxygen deployment platform
- **Key Features**: Request/Response adapters, session management, caching
- **Dependencies**: Remix server runtime, Web Standards APIs
- **Target**: Cloudflare Workers runtime

### Common Issue Categories
<!-- To be filled during trials -->
- [ ] Request adapter issues
- [ ] Session/cookie problems
- [ ] Cache API usage
- [ ] Headers handling
- [ ] Streaming responses

### Common Code Locations
```
packages/remix-oxygen/src/
├── server.ts         # Server adapter
├── session.ts        # Session management
├── cache.ts          # Cache utilities
└── index.ts          # Main exports
```

### Package-Specific Testing Commands
```bash
npm test -- packages/remix-oxygen
npm run typecheck -- --filter=./packages/remix-oxygen
```

## LEARNED PATTERNS
<!-- To be filled during trials -->

## TRIAL LOG
<!-- Track issues resolved -->