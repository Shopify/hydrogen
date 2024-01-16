import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartLinesAddDefault',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that accepts an array of [CartLineInput](/docs/api/storefront/current/input-objects/CartLineInput) and adds the line items to a cart',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartLinesAddDefault.example.js',
          language: 'js',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartLinesAddDefault',
      type: 'CartLinesAddDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
