import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartGiftCardCodesRemoveDefault',
  category: 'utilities',
  subCategory: 'cart',
  isVisualComponent: false,
  related: [
    {
      name: 'cartGiftCardCodesUpdateDefault',
      type: 'utilities',
      url: '/docs/api/hydrogen/utilities/cartgiftcardcodesupdatedefault',
    },
    {
      name: 'createCartHandler',
      type: 'utilities',
      url: '/docs/api/hydrogen/utilities/createcarthandler',
    },
  ],
  description:
    'Creates a function that accepts an array of gift card codes to remove from a cart',
  type: 'utility',
  defaultExample: {
    description: 'This is the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartGiftCardCodesRemoveDefault.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './cartGiftCardCodesRemoveDefault.example.ts',
          language: 'ts',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartGiftCardCodesRemoveDefault',
      type: 'CartGiftCardCodesRemoveDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
