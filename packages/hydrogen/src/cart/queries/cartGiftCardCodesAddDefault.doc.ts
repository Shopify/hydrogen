import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'cartGiftCardCodesAddDefault',
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
      name: 'cartGiftCardCodesRemoveDefault',
      type: 'utilities',
      url: '/docs/api/hydrogen/utilities/cartgiftcardcodesremovedefault',
    },
    {
      name: 'createCartHandler',
      type: 'utilities',
      url: '/docs/api/hydrogen/utilities/createcarthandler',
    },
  ],
  description:
    'Creates a function that adds gift card codes to a cart without replacing existing ones',
  type: 'utility',
  defaultExample: {
    description:
      'Add gift card codes to a cart using the default cart fragment',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cartGiftCardCodesAddDefault.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './cartGiftCardCodesAddDefault.example.ts',
          language: 'ts',
        },
      ],
      title: 'example',
    },
  },
  definitions: [
    {
      title: 'cartGiftCardCodesAddDefault',
      type: 'CartGiftCardCodesAddDefaultGeneratedType',
      description: '',
    },
  ],
};

export default data;
