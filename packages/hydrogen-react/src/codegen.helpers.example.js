import {storefrontApiCustomScalars} from '@shopify/hydrogen-react';

const config = {
  overwrite: true,
  schema: require.resolve('@shopify/hydrogen-react/storefront.schema.json'),
  documents: 'pages/**/*.tsx',
  generates: {
    './gql/': {
      preset: 'client',
      plugins: [],
      config: {
        // defines the custom scalars used in the Storefront API
        scalars: storefrontApiCustomScalars,
      },
    },
  },
};

export default config;
