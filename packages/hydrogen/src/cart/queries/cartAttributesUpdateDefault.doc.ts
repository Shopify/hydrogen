import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartAttributesUpdateDefault',
  category: 'utilities',
  subCategory: 'cart',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that accepts an array of [AttributeInput](/docs/api/storefront/2025-01/input-objects/AttributeInput) and updates attributes to a cart',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartAttributesUpdateDefault.example.js',
          language: 'js',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartAttributesUpdateDefault',
      type: 'CartAttributesUpdateDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
