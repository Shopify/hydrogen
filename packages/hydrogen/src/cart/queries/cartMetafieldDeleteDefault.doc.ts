import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartMetafieldDeleteDefault',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that accepts a string key and removes the matching metafield from the cart.',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartMetafieldDeleteDefault.example.js',
          language: 'js',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartMetafieldDeleteDefault',
      type: 'CartMetafieldDeleteDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
