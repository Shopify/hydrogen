import {ApiType, pluckConfig, preset} from '@shopify/api-codegen-preset';

export default {
  // For syntax highlighting / auto-complete when writing operations
  schema: 'https://shopify.dev/storefront-graphql-direct-proxy/2025-01',
  documents: ['./**/*.{js,ts,jsx,tsx}'],
  projects: {
    default: {
      // For type extraction
      schema: 'https://shopify.dev/storefront-graphql-direct-proxy/2025-01',
      documents: ['./**/*.{js,ts,jsx,tsx}'],
      extensions: {
        codegen: {
          // Enables support for `#graphql` tags, as well as `/* GraphQL */`
          pluckConfig,
          generates: {
            './app/graphql-types/storefront.schema.json': {
              plugins: ['introspection'],
              config: {minify: true},
            },
            './app/graphql-types/storefront.types.d.ts': {
              plugins: ['typescript'],
            },
            './app/graphql-types/storefront.generated.d.ts': {
              preset,
              presetConfig: {
                apiType: ApiType.Storefront,
              },
            },
          },
        },
      },
    },
  },
};
