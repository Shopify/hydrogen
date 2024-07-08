---
'skeleton': patch
---

The `@shopify/cli` package now bundles the `@shopify/cli-hydrogen` plugin. Therefore, you can now remove the latter from your local dependencies:

```diff
    "@shopify/cli": "3.64.0",
-   "@shopify/cli-hydrogen": "^8.1.1",
    "@shopify/hydrogen": "2024.7.0",
```
