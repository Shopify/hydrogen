import type {IGraphQLConfig} from 'graphql-config';
import {preset, getSchema, pluckConfig} from '@shopify/hydrogen-temp/codegen';

const graphqlConfig: IGraphQLConfig = {
  projects: {
    default: {
      schema: getSchema('storefront'),
      documents: ['lib/shopify/**/*.{ts,tsx}'],
      extensions: {
        codegen: {
          pluckConfig,
          overwrite: true,
          generates: {
            'lib/shopify/storefrontapi.generated.d.ts': {
              preset,
            },
          },
        },
      },
    },

    // Customer Account API project — add when hydrogen-temp supports it
    // customer: {
    //   schema: getSchema('customer-account'),
    //   documents: ['lib/shopify/customer/**/*.{ts,tsx}'],
    // },
  },
};

export default graphqlConfig;
