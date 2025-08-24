import {CodegenConfig} from '@graphql-codegen/cli';
import {
  storefrontApiCustomScalars,
  customerAccountApiCustomScalars,
} from './src/codegen.helpers';

const SF_API_VERSION = '2025-04';
const CA_API_VERSION = '2025-04';

const storefrontAPISchema: CodegenConfig['schema'] = {
  [`https://hydrogen-preview.myshopify.com/api/${SF_API_VERSION}/graphql.json`]:
    {
      headers: {
        'X-Shopify-Storefront-Access-Token': '3b580e70970c4528da70c98e097c2fa0',
        'content-type': 'application/json',
      },
    },
};

// API Key used is specific for Hydrogen App
const customerAccountAPISchema: CodegenConfig['schema'] = {
  [`https://app.myshopify.com/services/graphql/introspection/customer?api_client_api_key=159a99b8a7289a72f68603f2f4de40ac&api_version=${CA_API_VERSION}`]:
    {method: 'GET'},
};

const config: CodegenConfig = {
  overwrite: true,
  generates: {
    // The generated base types
    'src/storefront-api-types.d.ts': {
      schema: storefrontAPISchema,
      plugins: [
        {
          add: {
            content: `
              /**
               * THIS FILE IS AUTO-GENERATED, DO NOT EDIT
               * Based on Storefront API ${SF_API_VERSION}
               * If changes need to happen to the types defined in this file, then generally the Storefront API needs to update. After it's updated, you can run \`npm run graphql-types\`.
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
      schema: storefrontAPISchema,
      plugins: [
        {
          introspection: {
            minify: true,
          },
        },
      ],
    },
    'src/customer-account-api-types.d.ts': {
      schema: customerAccountAPISchema,
      plugins: [
        {
          add: {
            content: `
              /**
               * THIS FILE IS AUTO-GENERATED, DO NOT EDIT
               * Based on Customer Account API ${CA_API_VERSION}
               * If changes need to happen to the types defined in this file, then generally the Storefront API needs to update. After it's updated, you can run \`npm run graphql-types\`.
               * Except custom Scalars, which are defined in the \`codegen.ts\` file
               */
              /* eslint-disable */`,
          },
        },
        {
          typescript: {
            useTypeImports: true,
            defaultScalarType: 'unknown',
            useImplementingTypes: true,
            enumsAsTypes: true,
            scalars: customerAccountApiCustomScalars,
            enumValues: {
              // Use Storefront API's LanguageCode enum for Customer Account API to ensure type compatibility.
              // Both APIs use the same 2025-04 schema version and share 95%+ of LanguageCode values.
              // The Storefront API has a few additional codes (LA, MO, SH) that Customer Account API 
              // doesn't define, but using the superset is safe - Customer Account will accept all 
              // values it supports. This allows storefront.i18n.language to be directly used in 
              // Customer Account mutations without type casting while maintaining GraphQL schema validity.
              LanguageCode: './storefront-api-types#LanguageCode',
              // Use Storefront API's CurrencyCode enum for the same type compatibility reasons.
              // Both APIs use identical currency codes from the same 2025-04 schema.
              CurrencyCode: './storefront-api-types#CurrencyCode',
            },
          },
        },
      ],
    },
    './customer-account.schema.json': {
      schema: customerAccountAPISchema,
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
