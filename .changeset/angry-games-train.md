---
'skeleton': patch
---

Updated internal libraries for parsing `.env` file.

Please update the `@shopify/cli` dependency in your app to avoid duplicated subdependencies:

```diff
"dependencies": {
-   "@shopify/cli": "3.56.3",
+   "@shopify/cli": "3.58.0",
}
```
