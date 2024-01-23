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
      title: 'Props',
      type: 'CreateCustomerAccountClientGeneratedType',
      description: '',
    },
  ],
};

export default data;
