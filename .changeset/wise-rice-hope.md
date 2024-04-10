---
'skeleton': patch
---

Codegen dependencies must be now listed directly in `package.json`:

```diff
{
  "devDependencies": {
+   "@graphql-codegen/cli": "5.0.2",
    "@remix-run/dev": "^2.8.0",
    "@remix-run/eslint-config": "^2.8.0",
+   "@shopify/hydrogen-codegen": "^0.3.0",
    "@shopify/mini-oxygen": "^2.2.5",
    "@shopify/oxygen-workers-types": "^4.0.0",
    ...
  }
}
```
