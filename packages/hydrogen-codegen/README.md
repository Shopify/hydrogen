# Hydrogen Codegen

A codegen plugin and preset for generating TypeScript types from GraphQL queries in a `d.ts` file. It does not require any function wrapper and adds no runtime overhead (0 bytes to the bundle).

```ts
const {shop} = await client.query(`#graphql
  query {
    shop {
     name
    }
  }
`);
```

The GraphQL client must use TypeScript interfaces that are extended in the generated `d.ts` file. See an example in [Hydrogen's Storefront client](https://github.com/Shopify/hydrogen/blob/081b41e0d43c9e1090933e908362625b9dfe7166/packages/hydrogen/src/storefront.ts#L58-L143).

## Usage

When using Hydrogen CLI, this package is already included and configured for you to generate types for the Shopify Storefront API. However, if you want to use it standalone with the GraphQL CLI or just want to add other APIs to Hydrogen, you can use the following example configuration:

```ts
// <root>/codegen.ts

import type {CodegenConfig} from '@graphql-codegen/cli';
import {pluckConfig, preset, getSchema} from '@shopify/hydrogen-codegen';

export default {
  overwrite: true,
  pluckConfig,
  generates: {
    'storefrontapi.generated.d.ts': {
      preset,
      schema: getSchema('storefront'),
      documents: [
        './*.{ts,tsx,js,jsx}',
        './app/**/*.{ts,tsx,js,jsx}',
        '!./app/graphql/customer/*.{ts,tsx,js,jsx}',
        '!./app/graphql/my-cms/*.{ts,tsx,js,jsx}',
      ],
    },
    'customerapi.generated.d.ts': {
      preset,
      schema: getSchema('customer'),
      documents: ['./app/graphql/customer/*.{ts,tsx,js,jsx}'],
    },
    'mycms.generated.d.ts': {
      preset,
      schema: './my-cms.json',
      documents: ['./app/graphql/my-cms/*.{ts,tsx,js,jsx}'],
    },
  },
} as CodegenConfig;
```
