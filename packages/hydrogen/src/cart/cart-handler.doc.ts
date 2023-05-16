import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createCartHandler_unstable',
  category: 'utilities',
  isVisualComponent: false,
  related: [],
  description: `Creates a cart API instance that can be used to interact with the cart.`,
  type: 'utility',
  defaultExample: {
    description: 'I am the default example',
    codeblock: {
      tabs: [
        {
          title: 'JavaScript',
          code: './cart-handler.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './cart-handler.example.ts',
          language: 'ts',
        },
      ],
      title: 'server.(js|ts)',
    },
  },
  definitions: [
    {
      title: 'createCartHandler_unstable(options)',
      type: 'CartHandlerOptionsForDocs',
      description: '',
    },
    {
      title: 'Returns',
      type: 'CartHandlerReturnBaseForDocs',
      description:
        'If you defined custom methods, they will be included in the return type. See examples below for each function usage.',
    },
  ],
  examples: {
    description:
      'When you have a cart API instance, you can use the following methods to interact with the cart. The examples below use the `cart` instance from the default example above.',
    exampleGroups: [
      {
        title: 'Custom Methods',
        examples: [
          {
            description:
              'Define or override methods in your cart api instance. \n\nFor `addLine`, `updateDiscountCodes`, `updateBuyerIdentity`, and `metafieldsSet`, if you override any of these methods, a new cart will not be create unless you implemented the cart create logic in your overriding method.',
            codeblock: {
              title: 'Example',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './cart-handler.customMethods.example.js',
                  language: 'js',
                },
              ],
            },
          },
        ],
      },
      {
        title: 'Returns',
        examples: [
          {
            description:
              'Get the form input created by CartForm action request.',
            codeblock: {
              title: 'cart.getFormInputs',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './cart-handler.getFormInput.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description: 'Get the cart with the storefront api.',
            codeblock: {
              title: 'cart.get',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './cart-handler.get.example.js',
                  language: 'js',
                },
              ],
            },
          },
          {
            description:
              'Add lines to the cart with the storefront api. If the cart does not exist, a new cart will be created.',
            codeblock: {
              title: 'cart.addLine',
              tabs: [
                {
                  title: 'JavaScript',
                  code: './cart-handler.addLine.example.js',
                  language: 'js',
                },
              ],
            },
          },
        ],
      },
    ],
  },
};

export default data;
