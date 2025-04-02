import type {CodegenConfig} from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'https://graphql.org/graphql/',
  documents: ['src/**/*.ts'],
  ignoreNoDocuments: true,
  generates: {
    './src/graphql/': {
      preset: 'client',
      config: {
        documentMode: 'string',
      },
    },
    './schema.graphql': {
      plugins: ['schema-ast'],
      config: {
        includeDirectives: true,
      },
    },
  },
};

export default config;
