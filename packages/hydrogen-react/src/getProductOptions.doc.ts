import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'getProductOptions',
  category: 'utilities',
  isVisualComponent: false,
  related: [
    {
      name: 'Storefront Schema',
      type: 'gear',
      url: '/api/hydrogen-react/utilities/storefront-schema',
    },
    {
      name: 'Storefront API Types',
      type: 'gear',
      url: '/api/hydrogen-react/utilities/storefront-api-types',
    },
  ],
  description: `Returns a product options array with its relevant information about the variant.`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'getProductOption example',
          code: './getProductOptions.example.js',
          language: 'js',
        },
      ],
      title: 'getProductOptions.js',
    },
  },
  definitions: [],
};

export default data;
