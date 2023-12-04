---
'skeleton': patch
---

The Worker Runtime for development is now considered stable. This runtime provides an environment closer to Oxygen production.

Enable it in your project by adding the `--worker` flag:

```diff
"scripts": {
  "build": "shopify hydrogen build",
- "dev": "shopify hydrogen dev --codegen",
+ "dev": "shopify hydrogen dev --worker --codegen",
- "preview": "npm run build && shopify hydrogen preview",
+ "preview": "npm run build && shopify hydrogen preview --worker",
  ...
}
```
