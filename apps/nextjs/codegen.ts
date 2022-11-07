import type {CodegenConfig} from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  // a normal app would only need `./node_modules/...` but we're in a monorepo
  schema: '../../node_modules/@shopify/hydrogen-react/storefront.schema.json',
  documents: 'pages/**/*.tsx',
  // @TODO a chance here to provide the settings we use to generate our Types for the schema here as well,
  // so that the Custom Scalar definitions we have in hydrogen-ui can be used here as well.
  generates: {
    './gql/': {
      preset: 'client',
      plugins: [],
    },
  },
};

export default config;
