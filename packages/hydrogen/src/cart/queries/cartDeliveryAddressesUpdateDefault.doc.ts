import { ReferenceEntityTemplateSchema } from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartDeliveryAddressesUpdate',
  category: 'utilities',
  subCategory: 'cart',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that accepts an array of selectable delivery addresses [CartSelectableAddressUpdateInput](/docs/api/storefront/2025-01/input-objects/CartSelectableAddressUpdateInput) to update in a cart',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartDeliveryAddressesUpdateDefault.example.js',
          language: 'js',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartDeliveryAddressesUpdateDefault',
      type: 'CartDeliveryAddressesUpdateDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
