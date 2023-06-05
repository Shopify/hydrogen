---
'@shopify/hydrogen-codegen': patch
---

The preset now accepts options to modify the default behavior.

```ts
type HydrogenPresetConfig = {
  namespacedImportName?: string;
  importTypesFrom?: string;
  importTypes?: boolean;
  skipTypenameInOperations?: boolean;
  interfaceExtension?: (options) => string;
};
```
