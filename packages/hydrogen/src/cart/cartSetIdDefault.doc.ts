import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartSetIdDefault',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that sets the cart id in the form of a cookie named `cart` to the provided header',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartSetIdDefault.example.js',
          language: 'js',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartSetIdDefault',
      type: 'CartSetIdDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
