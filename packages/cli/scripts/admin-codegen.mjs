import {fileURLToPath} from 'node:url';
import {ensureAuthenticatedAdmin} from '@shopify/cli-kit/node/session';
import {generate} from '@graphql-codegen/cli';

const {token} = await ensureAuthenticatedAdmin('hydrogen-preview');

await generate(
  {
    overwrite: true,
    schema: {
      'https://hydrogen-preview.myshopify.com/admin/api/unstable/graphql.json':
        {
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
        },
    },
    generates: {
      // The schema file, which is the local representation of the GraphQL endpoint
      [fileURLToPath(new URL('../admin.schema.json', import.meta.url))]: {
        plugins: [{introspection: {minify: true}}],
      },
    },
  },
  true,
);
