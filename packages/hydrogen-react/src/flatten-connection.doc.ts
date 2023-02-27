import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'flattenConnection',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `
    The \`flattenConnection\` utility transforms a connection object from the Storefront API (for example, [Product-related connections](https://shopify.dev/api/storefront/reference/products/product)) into a flat array of nodes. The utility works with either \`nodes\` or \`edges.node\`.\n\nIf \`connection\` is null or undefined, will return an empty array instead in production. In development, an error will be thrown.
  `,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './flatten-connection.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './flatten-connection.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Parameters',
      type: 'ConnectionGenericForDoc',
      description: '',
    },
    {
      title: 'Returns',
      type: 'FlattenConnectionReturnForDoc',
      description: '',
    },
  ],
};

export default data;
