import {CodegenConfig} from '@graphql-codegen/cli';
import {
  storefrontApiCustomScalars,
  customerAccountApiCustomScalars,
} from './src/codegen-helpers';

const SF_API_VERSION = '2026-04';
const CA_API_VERSION = '2026-04';

const storefrontAPISchema: CodegenConfig['schema'] = {
  [`https://hydrogen-preview.myshopify.com/api/${SF_API_VERSION}/graphql.json`]:
    {
      headers: {
        'X-Shopify-Storefront-Access-Token': '3b580e70970c4528da70c98e097c2fa0',
        'content-type': 'application/json',
      },
    },
};

const customerAccountAPISchema: CodegenConfig['schema'] = {
  [`https://app.myshopify.com/services/graphql/introspection/customer?api_client_api_key=159a99b8a7289a72f68603f2f4de40ac&api_version=${CA_API_VERSION}`]:
    {method: 'GET'},
};

const AUTO_GENERATED_HEADER = (api: string, version: string) => `
/**
 * THIS FILE IS AUTO-GENERATED, DO NOT EDIT
 * Based on ${api} API ${version}
 * If changes need to happen to the types defined in this file, then generally
 * the ${api} API needs to update. After it's updated, run \`pnpm run graphql-types\`.
 * Except custom Scalars, which are defined in the \`codegen.ts\` file.
 */
/* eslint-disable */`;

const config: CodegenConfig = {
  overwrite: true,
  generates: {
    'src/generated/storefront-api-types.d.ts': {
      schema: storefrontAPISchema,
      plugins: [
        {add: {content: AUTO_GENERATED_HEADER('Storefront', SF_API_VERSION)}},
        {
          typescript: {
            useTypeImports: true,
            defaultScalarType: 'unknown',
            useImplementingTypes: true,
            enumsAsTypes: true,
            scalars: storefrontApiCustomScalars,
          },
        },
      ],
    },
    'src/generated/storefront.schema.json': {
      schema: storefrontAPISchema,
      plugins: [{introspection: {minify: true}}],
    },
    'src/generated/customer-account-api-types.d.ts': {
      schema: customerAccountAPISchema,
      plugins: [
        {
          add: {
            content: AUTO_GENERATED_HEADER('Customer Account', CA_API_VERSION),
          },
        },
        {
          typescript: {
            useTypeImports: true,
            defaultScalarType: 'unknown',
            useImplementingTypes: true,
            enumsAsTypes: true,
            scalars: customerAccountApiCustomScalars,
          },
        },
      ],
    },
    'src/generated/customer-account.schema.json': {
      schema: customerAccountAPISchema,
      plugins: [{introspection: {minify: true}}],
    },
  },
};

export default config;
