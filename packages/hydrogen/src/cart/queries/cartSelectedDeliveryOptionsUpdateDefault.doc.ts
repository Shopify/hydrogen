import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartSelectedDeliveryOptionsUpdateDefault',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description:
    'Creates a function that accepts an object of [CartSelectedDeliveryOptionInput](/docs/api/storefront/2024-01/input-objects/CartSelectedDeliveryOptionInput) and updates the selected delivery option of a cart',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartSelectedDeliveryOptionsUpdateDefault.example.js',
          language: 'js',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartSelectedDeliveryOptionsUpdateDefault',
      type: 'CartSelectedDeliveryOptionsUpdateDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
