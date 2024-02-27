import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartLinesRemoveDefault',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that accepts an array of line ids and removes the line items from a cart',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartLinesRemoveDefault.example.js',
          language: 'js',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartLinesRemoveDefault',
      type: 'CartLinesRemoveDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
