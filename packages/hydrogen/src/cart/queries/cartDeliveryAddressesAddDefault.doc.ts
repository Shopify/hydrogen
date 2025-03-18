import { ReferenceEntityTemplateSchema } from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartDeliveryAddressesAdd',
  category: 'utilities',
  subCategory: 'cart',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that accepts an array of [CartSelectableAddressInput](/docs/api/storefront/2025-01/input-objects/CartSelectableAddressInput) to add to a cart',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartDeliveryAddressesAddDefault.example.js',
          language: 'js',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartDeliveryAddressesAddDefault',
      type: 'CartDeliveryAddressesAddDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
