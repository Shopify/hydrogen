// <root>/codegen.ts

import type {CodegenConfig} from '@graphql-codegen/cli';
import {pluckConfig, preset, getSchema} from '@shopify/hydrogen-codegen';

export default {
  overwrite: true,
  pluckConfig,
  generates: {
    'storefrontapi.generated.d.ts': {
      preset,
      schema: getSchema('unstable-storefront'),
      documents: [
        './*.{ts,tsx,js,jsx}',
        './app/**/*.{ts,tsx,js,jsx}',
        '!./app/graphql/customer-account/*.{ts,tsx,js,jsx}',
        '!./app/graphql/my-cms/*.{ts,tsx,js,jsx}',
      ],
    },
    'customeraccountapi.generated.d.ts': {
      preset,
      schema: getSchema('customer-account'),
      documents: ['./app/graphql/customer-account/*.{ts,tsx,js,jsx}'],
    },
  },
} as CodegenConfig;
