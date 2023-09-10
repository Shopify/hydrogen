---
'@shopify/hydrogen-react': patch
'@shopify/cli-hydrogen': patch
'demo-store': patch
---

Hydrogen is now compatible with TypeScript v5.

If you have `typescript` as a dev dependency in your app, it is recommended to change its version as follows:

```diff
  "devDependencies": {
    ...
-   "typescript": "^4.9.5",
+   "typescript": "^5.1.6",
  },
```

After installing the new version of TypeScript, you may need to update the version used in your IDE. For example, in VSCode, you can do this by clicking on the `{ }` icon in the bottom-right toolbar next to the language mode (generally, `{ } TypeScript JSX` when editing a `.tsx` file).
