---
'skeleton': patch
---

Moved server build in `server.ts` from a dynamic import to a static import to speed up first rendering during local development (2s => 200ms).

```diff
// server.ts

+import * as serverBuild from 'virtual:react-router/server-build';

      const handleRequest = createRequestHandler({
-        build: await import('virtual:react-router/server-build'),
+        build: serverBuild,
```

Updated ESLint config to allow `virtual:` imports:

```diff
// eslint.config.js

rules: {
+      'import/no-unresolved': ['error', {ignore: ['^virtual:']}],
```
