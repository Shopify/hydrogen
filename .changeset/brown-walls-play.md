---
'skeleton': patch
---

Use the worker runtime by default when running the `dev` or `preview` commands.

Enable it in your project by adding the `--worker` flag to your package.json scripts:

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
