---
'@shopify/hydrogen-react': patch
'@shopify/cli-hydrogen': patch
'demo-store': patch
---

Update to TypeScript 5. If you have `typescript` as a dev dependency in your app, change its version as follows:

```diff
  "devDependencies": {
    ...
-   "typescript": "^4.9.5",
+   "typescript": "^5.1.6",
  },
```
