import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartLinesUpdateDefault',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that accepts an array of [CartLineUpdateInput](/docs/api/storefront/2023-10/input-objects/CartLineUpdateInput) and updates the line items in a cart',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartLinesUpdateDefault.example.js',
          language: 'js',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartLinesUpdateDefault',
      type: 'CartLinesUpdateDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
