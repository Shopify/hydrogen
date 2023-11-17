---
'skeleton': patch
---

Updated internal dependencies for bug resolution.
Please update the `@shopify/cli` dependency in your app to avoid duplicated subdependencies:

```diff
  "dependencies": {
-   "@shopify/cli": "3.50.2",
+   "@shopify/cli": "3.51.0",
  }
```
