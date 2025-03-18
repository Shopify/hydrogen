import { ReferenceEntityTemplateSchema } from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartDeliveryAddressesRemove',
  category: 'utilities',
  subCategory: 'cart',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that accepts an array of delivery address IDs [ID](/docs/api/storefront/2025-01/scalars/ID) to remove from a cart',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartDeliveryAddressesRemoveDefault.example.js',
          language: 'js',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartDeliveryAddressesRemoveDefault',
      type: 'CartDeliveryAddressesRemoveDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
