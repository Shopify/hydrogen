import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'Create Storefront Client',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `
  
  `,
  type: 'gear',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'Client Example in NextJS',
          code: './storefront-client.example.js',
          language: 'js',
        },
      ],
      title: 'Example code',
    },
  },
  definitions: [
    {
      title: 'Props',
      type: 'CreateStorefrontClientGeneratedType',
      description: '',
    },
  ],
};

export default data;
