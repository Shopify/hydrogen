import type {CodegenConfig} from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: '../../node_modules/@shopify/hydrogen-react/storefront.schema.json',
  documents: ['app/routes/index.tsx', 'app/data/index.ts'],
  ignoreNoDocuments: true, // for better experience with the watcher
  generates: {
    'app/gql/': {
      preset: 'client',
      presetConfig: {
        gqlTagName: 'graphql',
        fragmentMasking: false,
      },
      plugins: [],
    },
  },
};

export default config;
