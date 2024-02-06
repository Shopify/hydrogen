# @shopify/hydrogen-codegen

## 0.2.1

### Patch Changes

- Bump Codegen dependencies to fix known bugs and remove patches. ([#1705](https://github.com/Shopify/hydrogen/pull/1705)) by [@frandiox](https://github.com/frandiox)

## 0.2.0

### Minor Changes

- Abstract type utilities so they can be reused by other GraphQL schemas ([#1584](https://github.com/Shopify/hydrogen/pull/1584)) by [@frandiox](https://github.com/frandiox)

## 0.1.0

### Minor Changes

- Removed the `patchGqlPluck` named export from the main entrypoint. ([#1108](https://github.com/Shopify/hydrogen/pull/1108)) by [@frandiox](https://github.com/frandiox)

  Added `@shopify/hydrogen-codegen/patch` entrypoint that automatically patches the necessary files. This is applied automatically by Hydrogen CLI.
  If you're using the `graphql-codegen` CLI directly, you can either run it as a Node loader with `node -r @shopify/hydrogen-codegen/patch node_modules/.bin/graphql-codegen` or import it in your `codegen.ts` file before anything else:

  ```js
  import '@shopify/hydrogen-codegen/patch';
  import {preset, schema, pluckConfig} from '@shopify/hydrogen-codegen';

  export default {
    overwrite: true,
    pluckConfig,
    generates: {
      'storefrontapi.generated.d.ts': {
        preset,
        schema,
        documents: ['...'],
      },
    },
  };
  ```

- Add support for codegen in JavaScript projects with JSDoc. (#1334) by @frandiox ([#1464](https://github.com/Shopify/hydrogen/pull/1464)) by [@wizardlyhel](https://github.com/wizardlyhel)

### Patch Changes

- Remove warning when this package is used without `@shopify/hydrogen`. ([#1108](https://github.com/Shopify/hydrogen/pull/1108)) by [@frandiox](https://github.com/frandiox)

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
