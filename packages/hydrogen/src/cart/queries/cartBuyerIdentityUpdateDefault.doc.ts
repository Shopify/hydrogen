import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartBuyerIdentityUpdateDefault',
  category: 'utilities',
  subCategory: 'cart',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that accepts an object of [CartBuyerIdentityInput](/docs/api/storefront/2025-04/input-objects/CartBuyerIdentityInput) and updates the buyer identity of a cart',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartBuyerIdentityUpdateDefault.example.js',
          language: 'js',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartBuyerIdentityUpdateDefault',
      type: 'CartBuyerIdentityUpdateDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
