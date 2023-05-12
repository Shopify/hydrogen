import {ReferenceEntityTemplateSchema} from '@shopify/generate-docs';

const data: ReferenceEntityTemplateSchema = {
  name: 'createCartApi',
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
          code: './cart-api.example.js',
          language: 'js',
        },
        {
          title: 'TypeScript',
          code: './cart-api.example.ts',
          language: 'ts',
        },
      ],
      title: 'server.(js|ts)',
    },
  },
  definitions: [
    {
      title: 'createCartApi(options)',
      type: 'CartApiOptionsForDocs',
      description: '',
    },
    {
      title: 'Returns',
      type: 'CartApiReturnBaseForDocs',
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
                  code: './cart-api.customMethods.example.js',
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
                  code: './cart-api.getFormInput.example.js',
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
                  code: './cart-api.get.example.js',
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
                  code: './cart-api.addLine.example.js',
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
