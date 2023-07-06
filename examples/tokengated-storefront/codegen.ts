import 'dotenv/config';

const SCHEMA_URL = new URL(
  `https://${process.env.PUBLIC_STORE_DOMAIN}/api/${process.env.PUBLIC_STOREFRONT_API_VERSION}/graphql.json`,
).toString();

const config = {
  schema: [
    {
      [SCHEMA_URL]: {
        headers: {
          'X-Shopify-Storefront-Access-Token':
            process.env.PUBLIC_STOREFRONT_API_TOKEN,
        },
      },
    },
  ],
  generates: {
    './app/generated/storefront-api-types.ts': {
      plugins: ['typescript'],
    },
  },
  overwrite: true,
};

export default config;
