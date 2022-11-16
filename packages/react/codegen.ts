import {CodegenConfig} from '@graphql-codegen/cli';
// Because this file is processed only in TypeScript, we can make one exception for not using an extension here.
// eslint-disable-next-line import/extensions
import {storefrontApiCustomScalars} from './src/codegen.helpers';

const config: CodegenConfig = {
  overwrite: true,
  schema: {
    'https://hydrogen-preview.myshopify.com/api/2022-10/graphql.json': {
      headers: {
        'X-Shopify-Storefront-Access-Token': '3b580e70970c4528da70c98e097c2fa0',
        'content-type': 'application/json',
      },
    },
  },
  generates: {
    // The generated base types
    'src/storefront-api-types.d.ts': {
      plugins: [
        {
          add: {
            content: `
              /** 
               * THIS FILE IS AUTO-GENERATED, DO NOT EDIT
               * Based on Storefront API 2022-10
               * If changes need to happen to the types defined in this file, then generally the Storefront API needs to update. After it's updated, you can run \`yarn graphql-types\`.
               * Except custom Scalars, which are defined in the \`codegen.ts\` file
               */
              /* eslint-disable */`,
          },
        },
        {
          typescript: {
            useTypeImports: true,
            // If a default type for a scalar isn't set, then instead of 'any' we set to 'unknown' for better type safety.
            defaultScalarType: 'unknown',
            useImplementingTypes: true,
            enumsAsTypes: true,
            // Define how the Storefront API's custom scalars map to TypeScript types
            scalars: storefrontApiCustomScalars,
          },
        },
      ],
    },
    // The schema file, which is the local representation of the GraphQL endpoint
    './storefront.schema.json': {
      plugins: [
        {
          introspection: {
            minify: true,
          },
        },
      ],
    },
  },
};

export default config;
