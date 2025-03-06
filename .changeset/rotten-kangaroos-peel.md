---
'skeleton': patch
'@shopify/create-hydrogen': patch
---

Fixing typescript compile

In tsconfig.json:

```diff
     "types": [
       "@shopify/oxygen-workers-types",
-      "@remix-run/node",
+      "@remix-run/server-runtime",
       "vite/client"
     ],
```
