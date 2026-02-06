import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartDeliveryAddressesReplace',
  category: 'utilities',
  subCategory: 'cart',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that accepts an array of [CartSelectableAddressInput](/docs/api/storefront/2026-01/input-objects/CartSelectableAddressInput) to replace all delivery addresses on a cart',
  type: 'utility',
  defaultExample: {
    description:
      'Replace all delivery addresses on a cart with a new set of addresses',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartDeliveryAddressesReplaceDefault.example.js',
          language: 'js',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartDeliveryAddressesReplaceDefault',
      type: 'CartDeliveryAddressesReplaceDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
