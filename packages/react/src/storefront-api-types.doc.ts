import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'storefront.schema.json',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'storefrontApiCustomScalars',
      type: 'utility',
      url: '/api/react-storefront-kit/utilities/storefrontApiCustomScalars',
    },
    {
      name: 'storefront.schema.json',
      type: 'utility',
      url: '/api/react-storefront-kit/utilities/storefront.schema.json',
    },
  ],
  description: `
    If you are using TypeScript, Hydrogen React ships with pre-generated TypeScript types that match the Storefront API's GraphQL schema.
  `,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'Storefront API Types in TypeScript',
          code: './storefront-api-types.example.tsx',
          language: 'tsx',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [],
};

export default data;
