import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createCustomerAccountClient',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'createStorefrontClient',
      type: 'utility',
      url: '/docs/api/hydrogen/2024-01/utilities/createstorefrontclient',
    },
  ],
  description: `
The \`createCustomerAccountClient\` function creates a GraphQL client for querying the [Customer Account API](https://shopify.dev/docs/api/customer). It also provides methods to authenticate and check if the user is logged in.`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './customer.example.jsx',
          language: 'jsx',
        },
        {
          title: 'TypeScript',
          code: './customer.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'createCustomerAccountClient(options)',
      type: 'CustomerAccountOptions',
      description: '',
    },
    {
      title: 'Returns',
      type: 'CustomerAccountForDocs',
      description: '',
    },
  ],
  examples: {
    description: 'Examples of how to opt out of default logged-out redirect',
    exampleGroups: [
      {
        title: 'Customized logged-out behavior for the entire application',
        examples: [
          {
            description: 'Throw error instead of redirect',
            codeblock: {
              title: 'Example',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './customer.auth-handler.example.jsx',
                  language: 'jsx',
                },
                {
                  title: 'TypeScript',
                  code: './customer.auth-handler.example.tsx',
                  language: 'tsx',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'Opt out of logged-out behavior for a single route',
        examples: [
          {
            description: 'Handle logged-out ahead of query',
            codeblock: {
              title: 'Example',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './customer.opt-out-handler.example.jsx',
                  language: 'jsx',
                },
                {
                  title: 'TypeScript',
                  code: './customer.opt-out-handler.example.tsx',
                  language: 'tsx',
                },
              ],
            },
          },
        ],
      },
    ],
  },
};

export default data;
