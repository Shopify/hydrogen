import type {CodegenConfig} from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: '../../node_modules/@shopify/hydrogen-react/storefront.schema.json',
  documents: './app/**/*.{gql,graphql,tsx}',
  generates: {
    'app/__generated/types.ts': {plugins: ['typescript']},
    'app/': {
      preset: 'near-operation-file',
      presetConfig: {
        extension: '.generated.ts',
        baseTypesPath: '__generated/types.ts',
      },
      plugins: ['typescript-operations'],
    },
  },
};

export default config;
