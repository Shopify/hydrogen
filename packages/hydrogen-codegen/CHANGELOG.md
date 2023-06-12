# @shopify/hydrogen-codegen

## 0.0.2

### Patch Changes

- Merge equal fragment interfaces in one to avoid adding `| {}` to the Metaobject types. ([#978](https://github.com/Shopify/hydrogen/pull/978)) by [@frandiox](https://github.com/frandiox)

- The preset now accepts options to modify the default behavior. ([#970](https://github.com/Shopify/hydrogen/pull/970)) by [@frandiox](https://github.com/frandiox)

  ```ts
  type HydrogenPresetConfig = {
    namespacedImportName?: string;
    importTypesFrom?: string;
    importTypes?: boolean;
    skipTypenameInOperations?: boolean;
    interfaceExtension?: (options) => string;
  };
  ```

## 0.0.1

### Patch Changes

- Fix release ([#926](https://github.com/Shopify/hydrogen/pull/926)) by [@blittle](https://github.com/blittle)

## 0.0.0

### Patch Changes

- New package that provides GraphQL Codegen plugins and configuration to generate types automatically for Storefront queries in Hydrogen. ([#707](https://github.com/Shopify/hydrogen/pull/707)) by [@frandiox](https://github.com/frandiox)

  While in alpha/beta, this package should not be used standalone without the Hydrogen CLI.
