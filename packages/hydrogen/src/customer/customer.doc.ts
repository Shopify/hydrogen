import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createCustomerClient',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'createStorefrontClient',
      type: 'utility',
      url: '/docs/api/hydrogen/current/utilities/createstorefrontclient',
    },
  ],
  description: `
The \`createCustomerClient\` function creates a GraphQL client for querying the [Customer Account API](https://shopify.dev/docs/api/customer). It also provides methods to authenticate and check if the user is logged in.

See an end to end [example on using the Customer Account API client](https://github.com/Shopify/hydrogen/tree/main/examples/customer-api).`,
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
      type: 'CreateCustomerClientGeneratedType',
      description: '',
    },
  ],
};

export default data;
