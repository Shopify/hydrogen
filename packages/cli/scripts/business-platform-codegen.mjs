import {fileURLToPath} from 'node:url';
import {ensureAuthenticatedBusinessPlatform} from '@shopify/cli-kit/node/session';
import {businessPlatformFqdn} from '@shopify/cli-kit/node/context/fqdn';
import {generate} from '@graphql-codegen/cli';

await generate(
  {
    overwrite: true,
    schema: {
      [`https://${await businessPlatformFqdn()}/destinations/api/2020-07/graphql`]:
        {
          headers: {
            authorization: `Bearer ${await ensureAuthenticatedBusinessPlatform()}`,
            'content-type': 'application/json',
          },
        },
    },
    generates: {
      // The schema file, which is the local representation of the GraphQL endpoint
      [fileURLToPath(
        new URL('../business-platform.schema.json', import.meta.url),
      )]: {
        plugins: [{introspection: {minify: true}}],
      },
    },
  },
  true,
);
