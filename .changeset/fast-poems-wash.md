---
'@shopify/cli-hydrogen': patch
---

Updated internal dependencies to improve terminal output.
Please update the `@shopify/cli` dependency in your app to avoid duplicated subdependencies:

```diff
  "dependencies": {
-   "@shopify/cli": "3.49.2",
+   "@shopify/cli": "3.50.0",
  }
```
